import type { GitHubPullRequest } from "../repo/github";
import { supabase } from "../repo/supabaseClient";

type PullRequestRow = {
  github_number: number;
  title: string;
  author: string;
  state: string;
  draft: boolean;
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  additions: number;
  deletions: number;
  url: string;
  study_group: string | null;
};

export function mapPullRequestRow(pr: PullRequestRow): GitHubPullRequest {
  return {
    number: pr.github_number,
    title: pr.title,
    author: pr.author,
    state: pr.state as "open" | "closed",
    draft: pr.draft,
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
    mergedAt: pr.merged_at,
    additions: pr.additions,
    deletions: pr.deletions,
    url: pr.url,
    studyGroup: pr.study_group as "ai-assisted" | "human-only" | null,
  };
}

export async function loadPullRequestsForRepository(repository: string): Promise<GitHubPullRequest[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("pull_requests")
    .select("github_number,title,author,state,draft,created_at,updated_at,merged_at,additions,deletions,url,study_group")
    .eq("repository", repository)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error || !data) return [];
  return data.map((row) => mapPullRequestRow(row as PullRequestRow));
}
