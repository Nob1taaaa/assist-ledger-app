import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface GitHubPullRequest {
  number: number;
  title: string;
  state: "open" | "closed";
  draft: boolean;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  additions: number;
  deletions: number;
  html_url: string;
  user: { login: string } | null;
  labels?: Array<{ name: string }>;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}


type PullRequestCountResult =
  | { ok: true; additions: number; deletions: number }
  | { ok: false; status: number; message: string };

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await task(items[index]!);
    }
  });
  await Promise.all(workers);
  return results;
}

async function fetchPullRequestCounts(repository: string, number: number, headers: Record<string, string>): Promise<PullRequestCountResult> {
  try {
    const response = await fetch(`https://api.github.com/repos/${repository}/pulls/${number}`, { headers });
    const payload = await response.json().catch(() => null) as { additions?: unknown; deletions?: unknown; message?: string } | null;
    if (!response.ok) {
      return { ok: false, status: response.status, message: payload?.message ?? `GitHub returned ${response.status}.` };
    }
    if (typeof payload?.additions !== "number" || typeof payload.deletions !== "number") {
      return { ok: false, status: 502, message: "GitHub did not return changed-line counts." };
    }
    return { ok: true, additions: payload.additions, deletions: payload.deletions };
  } catch {
    return { ok: false, status: 502, message: "Could not reach GitHub for pull request details." };
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "POST required" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authorization = request.headers.get("Authorization");
    if (!supabaseUrl || !anonKey || !authorization) return json({ error: "Sign in before importing a repository." }, 401);
    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: authData, error: authError } = await caller.auth.getUser();
    if (authError || !authData.user) return json({ error: "Your session is invalid. Sign in again." }, 401);

    const { repository: rawRepository } = await request.json();
    if (typeof rawRepository !== "string") return json({ error: "Repository is required as owner/name." }, 400);
    const repository = rawRepository.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/i, "");
    if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) return json({ error: "Enter a GitHub repository as owner/name." }, 400);

    const githubToken = Deno.env.get("GITHUB_TOKEN");
    const githubHeaders: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (githubToken) githubHeaders.Authorization = `Bearer ${githubToken}`;
    const githubResponse = await fetch(
      `https://api.github.com/repos/${repository}/pulls?state=all&sort=updated&direction=desc&per_page=100`,
      { headers: githubHeaders },
    );
    if (!githubResponse.ok) {
      const status = githubResponse.status === 404 ? 404 : githubResponse.status === 403 || githubResponse.status === 429 ? 429 : 502;
      const error = status === 404
        ? "Repository not found or not accessible. Configure a GitHub token with access to private repositories."
        : status === 429 ? "GitHub rate limit reached. Try again later." : `GitHub returned ${githubResponse.status}.`;
      return json({ error }, status);
    }

    const githubPrs = (await githubResponse.json()) as GitHubPullRequest[];
    const detailResults = await mapWithConcurrency(githubPrs, 5, (pr) =>
      fetchPullRequestCounts(repository, pr.number, githubHeaders),
    );
    const failedDetailIndex = detailResults.findIndex((result) => !result.ok);
    if (failedDetailIndex !== -1) {
      const failure = detailResults[failedDetailIndex]!;
      if (!failure.ok) {
        const status = failure.status === 403 || failure.status === 429
          ? 429
          : failure.status === 404 ? 404 : 502;
        const error = status === 429
          ? "GitHub rate limit or access restriction reached while loading pull request details. Configure GITHUB_TOKEN with repository read access and try again."
          : `Could not load details for PR #${githubPrs[failedDetailIndex]!.number}: ${failure.message}`;
        return json({ error }, status);
      }
    }
    const counts = detailResults as Array<Extract<PullRequestCountResult, { ok: true }>>;
    const rows = githubPrs.map((pr, index) => {
      const detail = counts[index]!;
      return {
        user_id: authData.user.id,
        repository,
        study_group: pr.labels?.some((label) => label.name.toLowerCase() === "assist-ledger:ai-assisted")
          ? "ai-assisted"
          : pr.labels?.some((label) => label.name.toLowerCase() === "assist-ledger:human-only")
          ? "human-only"
          : null,
        github_number: pr.number,
        title: pr.title,
        author: pr.user?.login ?? "unknown",
        state: pr.state,
        draft: pr.draft,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        merged_at: pr.merged_at,
        additions: detail.additions,
        deletions: detail.deletions,
        url: pr.html_url,
        imported_at: new Date().toISOString(),
      };
    });

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) return json({ error: "Server-side Supabase configuration is missing." }, 500);
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    if (rows.length) {
      const { error } = await admin.from("pull_requests").upsert(rows, { onConflict: "user_id,repository,github_number" });
      if (error) return json({ error: "Could not save pull requests to Supabase." }, 500);
    }

    return json({
      repository,
      user_id: authData.user.id,
      pullRequests: rows.map((pr) => ({
        number: pr.github_number,
        title: pr.title,
        author: pr.author,
        state: pr.state,
        draft: pr.draft,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        mergedAt: pr.merged_at,
        additions: pr.additions,
        deletions: pr.deletions,
        url: pr.url,
        studyGroup: pr.study_group,
      })),
    });
  } catch {
    return json({ error: "Import failed. Check the repository name and Supabase function logs." }, 500);
  }
});
