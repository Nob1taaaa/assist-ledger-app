import {
  COMPLEXITY_BAND,
  estimateCost,
  formatPrId,
  mulberry32,
  pick,
  rangeFloat,
  rangeInt,
  shuffle,
} from "./profiles";
import type { Rng } from "./profiles";
import type {
  AuthorId,
  CiRun,
  CiStatus,
  Complexity,
  IngestBundle,
  PullRequest,
  ReviewStatus,
  SeedWorld,
  TokenTelemetry,
} from "./types";

const HISTORICAL_TITLES = [
  "Fix flaky checkout retry on 409",
  "Add tenant-scoped audit log index",
  "Collapse duplicate CI annotations",
  "Guard null diff when the patch is empty",
  "Move feature flag reads off the request path",
  "Repair timezone drift in the digest cron",
  "Add pagination cursor to the search API",
  "Drop unused webpack alias in the web app",
  "Tighten RLS predicate on billing.accounts",
  "Cache workspace membership for 30s",
  "Fix off-by-one in the blame gutter",
  "Rename internal queue topic without downtime",
  "Add structured logging around mergeability",
  "Prevent double submit on the invite form",
  "Backfill missing author_id on legacy notes",
  "Reduce N+1 when hydrating review threads",
  "Pin CI runner image to the patched digest",
  "Handle renamed files in the coverage map",
  "Add idempotency key to the refund worker",
  "Fix scroll jump in the file tree",
  "Split migration 184 into expand and contract",
  "Record reviewer SLA breaches",
  "Stop retrying 4xx from the git host",
  "Add contract test for the webhook parser",
  "Correct rounding on prorated seats",
  "Lazy-load Monaco on the patch route",
  "Fix stuck lock after a cancelled rebase",
  "Add index for unresolved review threads",
  "Normalize line endings before hashing diffs",
  "Surface rate-limit headers in the client",
  "Remove dead feature flag billing.v1",
  "Fix panic when the base ref was deleted",
  "Add timeout to the static analysis sidecar",
  "Coalesce webhook deliveries per installation",
  "Repair CSV export escaping",
  "Add dark-mode token for inline code",
  "Skip draft PRs in the merge train",
  "Fix leaked cursor in the suggestion popover",
  "Add per-repo default reviewers",
  "Harden path filter against symlink escape",
] as const;

const SPOTLIGHT: Array<{
  title: string;
  author: AuthorId;
  complexity: Complexity;
  ci: CiStatus;
  review: ReviewStatus;
}> = [
  { title: "Harden webhook signature comparison timing", author: "claude-3.5-sonnet", complexity: "L3", ci: "running", review: "pending" },
  { title: "Collapse retry storms in the merge queue worker", author: "gpt-4o", complexity: "L4", ci: "running", review: "pending" },
  { title: "Add per-model cost ceilings to the router", author: "copilot", complexity: "L2", ci: "passing", review: "approved" },
  { title: "Fix race in optimistic lock on pr_index", author: "human", complexity: "L3", ci: "failing", review: "changes_requested" },
  { title: "Extract cycle-time percentiles into the ledger view", author: "claude-3.5-sonnet", complexity: "L2", ci: "passing", review: "pending" },
  { title: "Patch CVE scan false positive on go.sum", author: "human", complexity: "L1", ci: "passing", review: "approved" },
  { title: "Introduce shadow mode for the review bot", author: "gpt-4o", complexity: "L4", ci: "running", review: "pending" },
  { title: "Backfill token telemetry for Copilot completions", author: "copilot", complexity: "L2", ci: "passing", review: "pending" },
  { title: "Reduce cold-start on the diff complexity scorer", author: "claude-3.5-sonnet", complexity: "L3", ci: "failing", review: "changes_requested" },
  { title: "Split architectural RFC template from the L3 checklist", author: "human", complexity: "L2", ci: "running", review: "pending" },
  { title: "Guard CI reruns from double-counting first pass", author: "gpt-4o", complexity: "L3", ci: "passing", review: "approved" },
  { title: "Tune blended-rate assumption copy in the cockpit", author: "copilot", complexity: "L1", ci: "passing", review: "pending" },
  { title: "Migrate auth middleware off the deprecated helper", author: "human", complexity: "L3", ci: "failing", review: "changes_requested" },
  { title: "Cap prompt payload when files exceed 400kb", author: "claude-3.5-sonnet", complexity: "L2", ci: "running", review: "pending" },
  { title: "Record rollback linkage on revert merges", author: "gpt-4o", complexity: "L2", ci: "passing", review: "pending" },
  { title: "Stabilize flaky browser smoke on the ingest hub", author: "human", complexity: "L1", ci: "running", review: "pending" },
  { title: "Add constant-time compare to signature middleware", author: "copilot", complexity: "L2", ci: "passing", review: "changes_requested" },
  { title: "Index pull_requests by author and merged_at", author: "claude-3.5-sonnet", complexity: "L4", ci: "running", review: "pending" },
];

const INCOMING_TITLES = [
  "Tighten parser for unsigned commits",
  "Add regression fixture for rename detection",
  "Lower tail latency on the blame endpoint",
  "Fix badge contrast in the review queue",
  "Shard the coverage upload by package",
  "Refuse force-push on protected trunks",
  "Memoize repo rules for the merge bot",
  "Correct token estimate on truncated diffs",
] as const;

/** Merged history is larger than the live spotlight so rates stay stable. */
const HUMAN_MERGED = 250;
const AI_MERGED_EACH = 84;
const HUMAN_DEFECTS = 3;
const AI_DEFECTS = 2;
const HUMAN_MEDIAN_TARGET = 255;
const AI_MEDIAN_TARGET = 42;

const COMPLEXITY_WEIGHTS: Array<{ complexity: Complexity; weight: number }> = [
  { complexity: "L1", weight: 0.34 },
  { complexity: "L2", weight: 0.36 },
  { complexity: "L3", weight: 0.22 },
  { complexity: "L4", weight: 0.08 },
];

export function pickComplexity(rng: Rng): Complexity {
  const roll = rng();
  let cursor = 0;
  for (const band of COMPLEXITY_WEIGHTS) {
    cursor += band.weight;
    if (roll <= cursor) return band.complexity;
  }
  return "L4";
}

export function pickAuthor(rng: Rng, mode: "balanced" | "ai-leaning"): AuthorId {
  const roll = rng();
  if (mode === "ai-leaning") {
    if (roll < 0.18) return "human";
    if (roll < 0.46) return "copilot";
    if (roll < 0.74) return "claude-3.5-sonnet";
    return "gpt-4o";
  }
  if (roll < 0.25) return "human";
  if (roll < 0.5) return "copilot";
  if (roll < 0.75) return "claude-3.5-sonnet";
  return "gpt-4o";
}

function coverageFor(rng: Rng, author: AuthorId, ci: CiStatus): number {
  const base = author === "human" ? rangeFloat(rng, 64, 90, 0) : rangeFloat(rng, 86, 98, 0);
  const penalty = ci === "failing" ? 8 : 0;
  return Math.max(41, Math.min(99, base - penalty));
}

function buildCiRuns(pr: PullRequest): CiRun[] {
  const started = Date.parse(pr.createdAt) + 90_000;
  if (pr.ciStatus === "running") {
    return [
      {
        id: `${pr.id}-ci-1`,
        pullRequestId: pr.id,
        status: "running",
        firstPass: false,
        startedAt: new Date(started).toISOString(),
        conclusion: "running",
      },
    ];
  }
  if (!pr.ciFirstPass) {
    const runs: CiRun[] = [
      {
        id: `${pr.id}-ci-1`,
        pullRequestId: pr.id,
        status: "failing",
        firstPass: false,
        startedAt: new Date(started).toISOString(),
        conclusion: "failure",
      },
    ];
    if (pr.ciStatus === "passing" || pr.reviewStatus === "merged") {
      runs.push({
        id: `${pr.id}-ci-2`,
        pullRequestId: pr.id,
        status: "passing",
        firstPass: false,
        startedAt: new Date(started + 18 * 60_000).toISOString(),
        conclusion: "success",
      });
    }
    return runs;
  }
  return [
    {
      id: `${pr.id}-ci-1`,
      pullRequestId: pr.id,
      status: "passing",
      firstPass: true,
      startedAt: new Date(started).toISOString(),
      conclusion: "success",
    },
  ];
}

function buildToken(pr: PullRequest): TokenTelemetry | null {
  if (pr.author === "human") return null;
  return {
    id: `${pr.id}-tok`,
    pullRequestId: pr.id,
    model: pr.author,
    promptTokens: pr.promptTokens,
    completionTokens: pr.completionTokens,
    estimatedCostUsd: pr.estimatedCostUsd,
    latencySeconds: pr.generationLatencySeconds,
  };
}

export function synthesizePullRequest(input: {
  rng: Rng;
  seq: number;
  createdAtMs: number;
  author: AuthorId;
  complexity: Complexity;
  title: string;
  disposition: "merged" | "open";
  openState?: { ci: CiStatus; review: ReviewStatus };
}): IngestBundle {
  const band = COMPLEXITY_BAND[input.complexity];
  const ai = input.author !== "human";
  const additions = rangeInt(input.rng, band.additions[0], band.additions[1]);
  const deletions = rangeInt(input.rng, band.deletions[0], band.deletions[1]);
  const minuteBand = ai ? band.aiMinutes : band.humanMinutes;
  const promptTokens = ai ? rangeInt(input.rng, band.prompt[0], band.prompt[1]) : 0;
  const completionTokens = ai ? rangeInt(input.rng, band.completion[0], band.completion[1]) : 0;
  const open = input.disposition === "open";
  const ciStatus: CiStatus = open ? (input.openState?.ci ?? "running") : "passing";
  const reviewStatus: ReviewStatus = open ? (input.openState?.review ?? "pending") : "merged";
  const timeToMergeMinutes = open ? null : rangeInt(input.rng, minuteBand[0], minuteBand[1]);
  const createdAt = new Date(input.createdAtMs).toISOString();

  const pullRequest: PullRequest = {
    id: formatPrId(input.seq),
    title: input.title,
    author: input.author,
    additions,
    deletions,
    ciStatus,
    reviewStatus,
    complexity: input.complexity,
    createdAt,
    mergedAt:
      timeToMergeMinutes == null
        ? null
        : new Date(input.createdAtMs + timeToMergeMinutes * 60_000).toISOString(),
    timeToMergeMinutes,
    ciFirstPass: ciStatus === "passing",
    defectLeakage: false,
    generationLatencySeconds: ai ? rangeFloat(input.rng, band.latency[0], band.latency[1], 1) : null,
    staticAnalysisCoverage: coverageFor(input.rng, input.author, ciStatus),
    promptTokens,
    completionTokens,
    estimatedCostUsd: estimateCost(input.author, promptTokens, completionTokens),
    diffComplexity: Math.max(1, Math.min(99, rangeInt(input.rng, band.diff[0], band.diff[1]))),
  };

  return {
    pullRequest,
    ciRuns: buildCiRuns(pullRequest),
    tokenTelemetry: buildToken(pullRequest),
  };
}

function assignExact(prs: PullRequest[], count: number, apply: (pr: PullRequest) => void, rng: Rng) {
  for (const pr of shuffle(prs, rng).slice(0, Math.min(count, prs.length))) apply(pr);
}

function forceMedian(prs: PullRequest[], target: number) {
  const rows = prs.filter((pr) => pr.timeToMergeMinutes != null);
  if (!rows.length) return;
  const probe = [...rows].sort((a, b) => a.timeToMergeMinutes! - b.timeToMergeMinutes!);
  const mid = Math.floor(probe.length / 2);
  const current =
    probe.length % 2 === 1
      ? probe[mid]!.timeToMergeMinutes!
      : (probe[mid - 1]!.timeToMergeMinutes! + probe[mid]!.timeToMergeMinutes!) / 2;
  const factor = target / current;
  for (const row of rows) {
    row.timeToMergeMinutes = Math.max(4, Math.round(row.timeToMergeMinutes! * factor));
  }
  const sorted = [...rows].sort((a, b) => a.timeToMergeMinutes! - b.timeToMergeMinutes!);
  if (sorted.length % 2 === 0) {
    sorted[mid - 1]!.timeToMergeMinutes = target;
    sorted[mid]!.timeToMergeMinutes = target;
  } else {
    sorted[mid]!.timeToMergeMinutes = target;
  }
  for (const row of rows) {
    row.mergedAt = new Date(Date.parse(row.createdAt) + row.timeToMergeMinutes! * 60_000).toISOString();
  }
}

function refresh(pr: PullRequest): { ciRuns: CiRun[]; tokenTelemetry: TokenTelemetry | null } {
  return { ciRuns: buildCiRuns(pr), tokenTelemetry: buildToken(pr) };
}

export function createSeedWorld(now = Date.now(), seed = 0xa55157): SeedWorld {
  const rng = mulberry32(seed);
  const pullRequests: PullRequest[] = [];
  const newestSeq = 1842;
  let cursor = 0;

  for (const spot of SPOTLIGHT) {
    const bundle = synthesizePullRequest({
      rng,
      seq: newestSeq - cursor,
      createdAtMs: now - (cursor + 1) * 9 * 60_000,
      author: spot.author,
      complexity: spot.complexity,
      title: spot.title,
      disposition: "open",
      openState: { ci: spot.ci, review: spot.review },
    });
    pullRequests.push(bundle.pullRequest);
    cursor += 1;
  }

  const plan: Array<{ author: AuthorId; count: number }> = [
    { author: "human", count: HUMAN_MERGED },
    { author: "copilot", count: AI_MERGED_EACH },
    { author: "claude-3.5-sonnet", count: AI_MERGED_EACH },
    { author: "gpt-4o", count: AI_MERGED_EACH },
  ];

  for (const group of plan) {
    for (let i = 0; i < group.count; i += 1) {
      const bundle = synthesizePullRequest({
        rng,
        seq: newestSeq - cursor,
        createdAtMs: now - (cursor + 2) * 47 * 60_000,
        author: group.author,
        complexity: pickComplexity(rng),
        title: HISTORICAL_TITLES[(cursor + i) % HISTORICAL_TITLES.length]!,
        disposition: "merged",
      });
      pullRequests.push(bundle.pullRequest);
      cursor += 1;
    }
  }

  const humanMerged = pullRequests.filter((pr) => pr.author === "human" && pr.reviewStatus === "merged");
  const aiMerged = pullRequests.filter((pr) => pr.author !== "human" && pr.reviewStatus === "merged");
  forceMedian(humanMerged, HUMAN_MEDIAN_TARGET);
  forceMedian(aiMerged, AI_MEDIAN_TARGET);

  for (const pr of pullRequests) {
    if (pr.reviewStatus === "merged") pr.ciStatus = "passing";
    pr.ciFirstPass = false;
    pr.defectLeakage = false;
  }

  const humanFinished = pullRequests.filter((pr) => pr.author === "human" && pr.ciStatus !== "running");
  const aiFinished = pullRequests.filter((pr) => pr.author !== "human" && pr.ciStatus !== "running");
  assignExact(humanFinished, Math.round(humanFinished.length * 0.78), (pr) => {
    pr.ciFirstPass = true;
  }, rng);
  assignExact(aiFinished, Math.round(aiFinished.length * 0.912), (pr) => {
    pr.ciFirstPass = true;
  }, rng);

  for (const pr of pullRequests) {
    if (pr.ciStatus === "running") continue;
    if (pr.reviewStatus === "merged") {
      pr.ciStatus = "passing";
      continue;
    }
    pr.ciStatus = pr.ciFirstPass ? "passing" : "failing";
  }

  const humanLeakPool = humanMerged.filter((pr) => pr.complexity === "L3" || pr.complexity === "L4");
  const aiLeakPool = aiMerged.filter((pr) => pr.complexity === "L3" || pr.complexity === "L4");
  assignExact(
    humanLeakPool.length >= HUMAN_DEFECTS ? humanLeakPool : humanMerged,
    HUMAN_DEFECTS,
    (pr) => {
      pr.defectLeakage = true;
    },
    rng,
  );
  assignExact(aiLeakPool.length >= AI_DEFECTS ? aiLeakPool : aiMerged, AI_DEFECTS, (pr) => {
    pr.defectLeakage = true;
  }, rng);

  const ciRuns: CiRun[] = [];
  const tokenTelemetry: TokenTelemetry[] = [];
  for (const pr of pullRequests) {
    const bundle = refresh(pr);
    ciRuns.push(...bundle.ciRuns);
    if (bundle.tokenTelemetry) tokenTelemetry.push(bundle.tokenTelemetry);
  }

  return {
    pullRequests,
    ciRuns,
    tokenTelemetry,
    nextSeq: newestSeq + 1,
  };
}

export function incomingTitle(rng: Rng): string {
  return pick(rng, INCOMING_TITLES);
}
