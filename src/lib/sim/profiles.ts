import type { AuthorId, CiStatus, Complexity, ReviewStatus } from "./types";

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rangeInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function rangeFloat(rng: Rng, min: number, max: number, digits = 1): number {
  const value = min + rng() * (max - min);
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  return copy;
}

export const AUTHOR_LABEL: Record<AuthorId, string> = {
  human: "Human",
  copilot: "Copilot",
  "claude-3.5-sonnet": "Claude 3.5 Sonnet",
  "gpt-4o": "GPT-4o",
};

export const COMPLEXITY_LABEL: Record<Complexity, string> = {
  L1: "L1 Trivial",
  L2: "L2 Feature",
  L3: "L3 Complex",
  L4: "L4 Architectural",
};

export const REVIEW_LABEL: Record<ReviewStatus, string> = {
  approved: "Approved",
  changes_requested: "Changes requested",
  pending: "Pending",
  merged: "Merged",
};

export const CI_LABEL: Record<CiStatus, string> = {
  passing: "Passing",
  failing: "Failing",
  running: "Running",
};

export const AI_AUTHORS: readonly AuthorId[] = ["copilot", "claude-3.5-sonnet", "gpt-4o"];

/** USD per 1M tokens. Human is zero. Copilot is a seat-amortized proxy, not list price. */
export const PRICE_PER_MILLION: Record<AuthorId, { input: number; output: number }> = {
  human: { input: 0, output: 0 },
  copilot: { input: 0.5, output: 2 },
  "claude-3.5-sonnet": { input: 3, output: 15 },
  "gpt-4o": { input: 2.5, output: 10 },
};

type Band = readonly [number, number];

export const COMPLEXITY_BAND: Record<
  Complexity,
  {
    additions: Band;
    deletions: Band;
    humanMinutes: Band;
    aiMinutes: Band;
    prompt: Band;
    completion: Band;
    latency: Band;
    diff: Band;
  }
> = {
  L1: {
    additions: [8, 72],
    deletions: [1, 28],
    humanMinutes: [48, 130],
    aiMinutes: [8, 24],
    prompt: [500, 1800],
    completion: [140, 640],
    latency: [3.2, 11],
    diff: [6, 22],
  },
  L2: {
    additions: [48, 260],
    deletions: [8, 90],
    humanMinutes: [150, 340],
    aiMinutes: [22, 52],
    prompt: [2200, 9000],
    completion: [700, 2800],
    latency: [9, 26],
    diff: [24, 48],
  },
  L3: {
    additions: [160, 820],
    deletions: [30, 280],
    humanMinutes: [230, 480],
    aiMinutes: [38, 86],
    prompt: [8000, 24000],
    completion: [1800, 6400],
    latency: [16, 44],
    diff: [46, 72],
  },
  L4: {
    additions: [480, 2400],
    deletions: [90, 860],
    humanMinutes: [380, 820],
    aiMinutes: [64, 140],
    prompt: [18000, 72000],
    completion: [4200, 16000],
    latency: [28, 92],
    diff: [70, 96],
  },
};

export function estimateCost(author: AuthorId, promptTokens: number, completionTokens: number): number {
  const price = PRICE_PER_MILLION[author];
  const cost = (promptTokens / 1_000_000) * price.input + (completionTokens / 1_000_000) * price.output;
  return Math.round(cost * 10000) / 10000;
}

export function formatPrId(seq: number): string {
  return `AL-${seq}`;
}
