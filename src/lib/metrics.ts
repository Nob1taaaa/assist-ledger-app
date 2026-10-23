import { BLENDED_HOURLY_RATE } from "./format";
import { AUTHOR_LABEL, COMPLEXITY_LABEL } from "./sim/profiles";
import type { AuthorId, Complexity, PullRequest } from "./sim/types";

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function isAiAuthor(author: AuthorId): boolean {
  return author !== "human";
}

export function relativeDelta(value: number, baseline: number): number | null {
  if (!Number.isFinite(value) || !Number.isFinite(baseline) || baseline === 0) return null;
  return ((value - baseline) / baseline) * 100;
}

function mergedWithTime(prs: PullRequest[]): PullRequest[] {
  return prs.filter((pr) => pr.reviewStatus === "merged" && pr.timeToMergeMinutes != null);
}

export interface CohortSnapshot {
  count: number;
  merged: number;
  medianMergeMinutes: number | null;
  ciFirstPassRate: number | null;
  defectRate: number | null;
  meanTokenCost: number | null;
}

export function cohortSnapshot(prs: PullRequest[]): CohortSnapshot {
  const merged = mergedWithTime(prs);
  const finishedCi = prs.filter((pr) => pr.ciStatus !== "running");
  const meanTokenCost = merged.length
    ? merged.reduce((sum, pr) => sum + pr.estimatedCostUsd, 0) / merged.length
    : null;
  return {
    count: prs.length,
    merged: merged.length,
    medianMergeMinutes: median(merged.map((pr) => pr.timeToMergeMinutes!)),
    ciFirstPassRate: finishedCi.length
      ? (finishedCi.filter((pr) => pr.ciFirstPass).length / finishedCi.length) * 100
      : null,
    defectRate: merged.length ? (merged.filter((pr) => pr.defectLeakage).length / merged.length) * 100 : null,
    meanTokenCost,
  };
}

export interface KpiModel {
  ai: CohortSnapshot;
  human: CohortSnapshot;
  timeDelta: number | null;
  ciDelta: number | null;
  defectDelta: number | null;
  hoursSaved: number | null;
  laborValueUsd: number | null;
  tokenCostUsd: number | null;
  netSavedUsd: number | null;
  costDelta: number | null;
  blendedRate: number;
}

export function computeKpis(prs: PullRequest[]): KpiModel {
  const ai = cohortSnapshot(prs.filter((pr) => isAiAuthor(pr.author)));
  const human = cohortSnapshot(prs.filter((pr) => pr.author === "human"));
  const hoursSaved =
    ai.medianMergeMinutes != null && human.medianMergeMinutes != null
      ? (human.medianMergeMinutes - ai.medianMergeMinutes) / 60
      : null;
  const laborValueUsd = hoursSaved == null ? null : hoursSaved * BLENDED_HOURLY_RATE;
  const tokenCostUsd = ai.meanTokenCost;
  const netSavedUsd =
    laborValueUsd != null && tokenCostUsd != null ? laborValueUsd - tokenCostUsd : null;
  const costDelta =
    tokenCostUsd != null && laborValueUsd != null ? relativeDelta(tokenCostUsd, laborValueUsd) : null;

  return {
    ai,
    human,
    timeDelta:
      ai.medianMergeMinutes != null && human.medianMergeMinutes != null
        ? relativeDelta(ai.medianMergeMinutes, human.medianMergeMinutes)
        : null,
    ciDelta:
      ai.ciFirstPassRate != null && human.ciFirstPassRate != null
        ? relativeDelta(ai.ciFirstPassRate, human.ciFirstPassRate)
        : null,
    defectDelta:
      ai.defectRate != null && human.defectRate != null
        ? relativeDelta(ai.defectRate, human.defectRate)
        : null,
    hoursSaved,
    laborValueUsd,
    tokenCostUsd,
    netSavedUsd,
    costDelta,
    blendedRate: BLENDED_HOURLY_RATE,
  };
}

export interface CycleBar {
  complexity: Complexity;
  label: string;
  ai: number;
  human: number;
}

export function cycleTimeSeries(prs: PullRequest[]): CycleBar[] {
  const levels: Complexity[] = ["L1", "L2", "L3", "L4"];
  return levels.map((complexity) => {
    const slice = mergedWithTime(prs.filter((pr) => pr.complexity === complexity));
    const ai = median(
      slice.filter((pr) => isAiAuthor(pr.author)).map((pr) => pr.timeToMergeMinutes!),
    );
    const human = median(
      slice.filter((pr) => pr.author === "human").map((pr) => pr.timeToMergeMinutes!),
    );
    return {
      complexity,
      label: COMPLEXITY_LABEL[complexity],
      ai: ai == null ? 0 : Math.round(ai),
      human: human == null ? 0 : Math.round(human),
    };
  });
}

export interface DensityPoint {
  id: string;
  x: number;
  y: number;
  cohort: "AI" | "Human";
  author: string;
  leaked: boolean;
}

export function densitySeries(prs: PullRequest[]): { ai: DensityPoint[]; human: DensityPoint[] } {
  const ai: DensityPoint[] = [];
  const human: DensityPoint[] = [];
  for (const pr of prs) {
    if (pr.reviewStatus !== "merged") continue;
    const lines = Math.max(1, pr.additions + pr.deletions);
    const density = pr.defectLeakage
      ? Math.max(6, Math.min(18, Math.round((1000 / lines) * (6 + pr.diffComplexity / 20) * 10) / 10))
      : Math.round((0.15 + (100 - pr.staticAnalysisCoverage) / 220) * 100) / 100;
    const point: DensityPoint = {
      id: pr.id,
      x: lines,
      y: density,
      cohort: isAiAuthor(pr.author) ? "AI" : "Human",
      author: AUTHOR_LABEL[pr.author],
      leaked: pr.defectLeakage,
    };
    if (point.cohort === "AI") ai.push(point);
    else human.push(point);
  }
  return { ai, human };
}

export interface ModelCard {
  author: AuthorId;
  label: string;
  medianMinutes: number | null;
  rollbackRate: number | null;
  merged: number;
  meanCost: number | null;
}

const MODEL_ORDER: AuthorId[] = ["claude-3.5-sonnet", "gpt-4o", "copilot", "human"];

export function modelComparison(prs: PullRequest[]): ModelCard[] {
  return MODEL_ORDER.map((author) => {
    const snap = cohortSnapshot(prs.filter((pr) => pr.author === author));
    return {
      author,
      label: AUTHOR_LABEL[author],
      medianMinutes: snap.medianMergeMinutes,
      rollbackRate: snap.defectRate,
      merged: snap.merged,
      meanCost: snap.meanTokenCost,
    };
  });
}
