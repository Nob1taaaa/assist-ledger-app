import type { CiRun, PullRequest, TokenTelemetry } from "../sim/types";

export interface PullRequestRepository {
  listPullRequests(): PullRequest[];
  getPullRequest(id: string): PullRequest | undefined;
  insertPullRequest(pr: PullRequest): void;
  replaceAll(prs: PullRequest[]): void;
}

export interface TelemetryRepository {
  listCiRuns(pullRequestId?: string): CiRun[];
  listTokenTelemetry(pullRequestId?: string): TokenTelemetry[];
  insertCiRun(run: CiRun): void;
  insertTokenTelemetry(row: TokenTelemetry): void;
  replaceAll(ciRuns: CiRun[], tokenTelemetry: TokenTelemetry[]): void;
}
