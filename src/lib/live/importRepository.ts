import type { GitHubPullRequest } from "../repo/github";
import { supabase, supabaseSetupError } from "../repo/supabaseClient";

/** Default study repo for first-time sign-in auto-import. */
export const DEFAULT_STUDY_REPOSITORY = "Nob1taaaa/assist-ledger-app";

export async function importGitHubRepository(repository: string): Promise<{
  repository: string;
  pullRequests: GitHubPullRequest[];
}> {
  const setupError = supabaseSetupError();
  if (setupError || !supabase) throw new Error(setupError ?? "Supabase is not configured.");

  const trimmed = repository.trim();
  const { data, error: functionError } = await supabase.functions.invoke("import-github-repository", {
    body: { repository: trimmed },
  });
  if (functionError) throw new Error(functionError.message);
  if (data?.error) throw new Error(String(data.error));

  return {
    repository: data.repository as string,
    pullRequests: data.pullRequests as GitHubPullRequest[],
  };
}
