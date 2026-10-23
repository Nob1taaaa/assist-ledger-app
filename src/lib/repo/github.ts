export interface GitHubPullRequest {
  number: number;
  title: string;
  author: string;
  state: "open" | "closed";
  draft: boolean;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  additions: number;
  deletions: number;
  url: string;
  studyGroup?: "ai-assisted" | "human-only" | null;
}

interface GitHubApiPullRequest {
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

export async function fetchGitHubPullRequests(repository: string): Promise<GitHubPullRequest[]> {
  const normalized = repository.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/i, "");
  if (!/^[\w.-]+\/[\w.-]+$/.test(normalized)) {
    throw new Error("Enter a repository as owner/name, for example vercel/next.js.");
  }

  const response = await fetch(
    `https://api.github.com/repos/${normalized}/pulls?state=all&sort=updated&direction=desc&per_page=100`,
    { headers: { Accept: "application/vnd.github+json" } },
  );
  if (!response.ok) {
    if (response.status === 404) throw new Error("Repository not found or it is private. Public repositories are supported without a token.");
    if (response.status === 403 || response.status === 429) throw new Error("GitHub rate limit reached. Try again later, or connect through an authenticated backend.");
    throw new Error(`GitHub returned ${response.status}. Check the repository name and try again.`);
  }

  const payload = (await response.json()) as GitHubApiPullRequest[];
  return payload.map((pr) => ({
    number: pr.number,
    title: pr.title,
    author: pr.user?.login ?? "unknown",
    state: pr.state,
    draft: pr.draft,
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
    mergedAt: pr.merged_at,
    additions: pr.additions,
    deletions: pr.deletions,
    url: pr.html_url,
    studyGroup: pr.labels?.some((label) => label.name.toLowerCase() === "assist-ledger:ai-assisted")
      ? "ai-assisted"
      : pr.labels?.some((label) => label.name.toLowerCase() === "assist-ledger:human-only")
      ? "human-only"
      : null,
  }));
}
