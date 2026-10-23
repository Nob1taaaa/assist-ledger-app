export type AuthorId = "human" | "copilot" | "claude-3.5-sonnet" | "gpt-4o";

export type Complexity = "L1" | "L2" | "L3" | "L4";

export type CiStatus = "passing" | "failing" | "running";

export type ReviewStatus = "approved" | "changes_requested" | "pending" | "merged";

export type Speed = 1 | 2 | 5;

export interface PullRequest {
  id: string;
  title: string;
  author: AuthorId;
  additions: number;
  deletions: number;
  ciStatus: CiStatus;
  reviewStatus: ReviewStatus;
  complexity: Complexity;
  createdAt: string;
  mergedAt: string | null;
  timeToMergeMinutes: number | null;
  ciFirstPass: boolean;
  defectLeakage: boolean;
  generationLatencySeconds: number | null;
  staticAnalysisCoverage: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  diffComplexity: number;
}

export interface CiRun {
  id: string;
  pullRequestId: string;
  status: CiStatus;
  firstPass: boolean;
  startedAt: string;
  conclusion: "success" | "failure" | "running";
}

export interface TokenTelemetry {
  id: string;
  pullRequestId: string;
  model: AuthorId | null;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  latencySeconds: number | null;
}

export interface IngestBundle {
  pullRequest: PullRequest;
  ciRuns: CiRun[];
  tokenTelemetry: TokenTelemetry | null;
}

export interface SeedWorld {
  pullRequests: PullRequest[];
  ciRuns: CiRun[];
  tokenTelemetry: TokenTelemetry[];
  nextSeq: number;
}
