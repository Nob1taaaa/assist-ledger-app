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
    const rows = githubPrs.map((pr) => ({
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
      additions: pr.additions,
      deletions: pr.deletions,
      url: pr.html_url,
      imported_at: new Date().toISOString(),
    }));

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
