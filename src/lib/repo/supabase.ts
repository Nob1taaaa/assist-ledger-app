import type { CiRun, PullRequest, TokenTelemetry } from "../sim/types";
import type { PullRequestRepository, TelemetryRepository } from "./types";

/**
 * Current deployed schema for GitHub PR import. PR writes are performed by
 * the authenticated Edge Function; the browser reads rows through RLS.
 * CI, model, and Cursor telemetry are written by Edge Functions; the browser reads via RLS.
 */
export const SUPABASE_SCHEMA_SQL = `create table public.pull_requests (
  id bigint generated always as identity primary key,
  repository text not null,
  github_number integer not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text not null,
  state text not null check (state in ('open', 'closed')),
  draft boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  merged_at timestamptz,
  additions integer not null default 0,
  deletions integer not null default 0,
  url text not null,
  imported_at timestamptz not null default now(),
  unique (user_id, repository, github_number)
);

alter table public.pull_requests enable row level security;
create policy "Users can read their imported repository PRs"
  on public.pull_requests for select to authenticated
  using (user_id = (select auth.uid()));`;

function notWired(method: string, table: string): never {
  throw new Error(
    `SupabaseRepo not wired: ${method} maps to ${table}. The cockpit is using the memory repository.`,
  );
}

export class SupabasePullRequestRepository implements PullRequestRepository {
  listPullRequests(): PullRequest[] {
    return notWired("listPullRequests", "pull_requests");
  }

  getPullRequest(id: string): PullRequest | undefined {
    void id;
    return notWired("getPullRequest", "pull_requests");
  }

  insertPullRequest(pr: PullRequest): void {
    void pr;
    notWired("insertPullRequest", "pull_requests");
  }

  replaceAll(prs: PullRequest[]): void {
    void prs;
    notWired("replaceAll", "pull_requests");
  }
}

export class SupabaseTelemetryRepository implements TelemetryRepository {
  listCiRuns(pullRequestId?: string): CiRun[] {
    void pullRequestId;
    return notWired("listCiRuns", "ci_runs");
  }

  listTokenTelemetry(pullRequestId?: string): TokenTelemetry[] {
    void pullRequestId;
    return notWired("listTokenTelemetry", "token_telemetry");
  }

  insertCiRun(run: CiRun): void {
    void run;
    notWired("insertCiRun", "ci_runs");
  }

  insertTokenTelemetry(row: TokenTelemetry): void {
    void row;
    notWired("insertTokenTelemetry", "token_telemetry");
  }

  replaceAll(ciRuns: CiRun[], tokenTelemetry: TokenTelemetry[]): void {
    void ciRuns;
    void tokenTelemetry;
    notWired("replaceAll", "ci_runs, token_telemetry");
  }
}
