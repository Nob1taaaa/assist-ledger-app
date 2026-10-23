import type { CiRun, PullRequest, TokenTelemetry } from "../sim/types";
import type { PullRequestRepository, TelemetryRepository } from "./types";

export class MemoryPullRequestRepository implements PullRequestRepository {
  private items: PullRequest[];

  constructor(initial: PullRequest[] = []) {
    this.items = [...initial];
  }

  listPullRequests(): PullRequest[] {
    return [...this.items].sort((a, b) => {
      const delta = Date.parse(b.createdAt) - Date.parse(a.createdAt);
      if (delta !== 0) return delta;
      return b.id.localeCompare(a.id);
    });
  }

  getPullRequest(id: string): PullRequest | undefined {
    return this.items.find((pr) => pr.id === id);
  }

  insertPullRequest(pr: PullRequest): void {
    const index = this.items.findIndex((item) => item.id === pr.id);
    if (index >= 0) this.items[index] = pr;
    else this.items.push(pr);
  }

  replaceAll(prs: PullRequest[]): void {
    this.items = [...prs];
  }
}

export class MemoryTelemetryRepository implements TelemetryRepository {
  private ciRuns: CiRun[];
  private tokens: TokenTelemetry[];

  constructor(ciRuns: CiRun[] = [], tokens: TokenTelemetry[] = []) {
    this.ciRuns = [...ciRuns];
    this.tokens = [...tokens];
  }

  listCiRuns(pullRequestId?: string): CiRun[] {
    const rows = pullRequestId ? this.ciRuns.filter((run) => run.pullRequestId === pullRequestId) : this.ciRuns;
    return [...rows].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  }

  listTokenTelemetry(pullRequestId?: string): TokenTelemetry[] {
    const rows = pullRequestId ? this.tokens.filter((row) => row.pullRequestId === pullRequestId) : this.tokens;
    return [...rows];
  }

  insertCiRun(run: CiRun): void {
    this.ciRuns.push(run);
  }

  insertTokenTelemetry(row: TokenTelemetry): void {
    this.tokens.push(row);
  }

  replaceAll(ciRuns: CiRun[], tokenTelemetry: TokenTelemetry[]): void {
    this.ciRuns = [...ciRuns];
    this.tokens = [...tokenTelemetry];
  }
}
