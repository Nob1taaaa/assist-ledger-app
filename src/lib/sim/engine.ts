import type { Rng } from "./profiles";
import { incomingTitle, synthesizePullRequest } from "./seed";
import type { AuthorId, Complexity, IngestBundle, Speed } from "./types";

export const SPEED_INTERVAL_MS: Record<Speed, number> = {
  1: 4500,
  2: 2200,
  5: 900,
};

export { createSeedWorld, pickAuthor, pickComplexity } from "./seed";

/** Append one coherent PR. Live events stay open so the historical medians hold. */
export function ingestPullRequest(input: {
  rng: Rng;
  seq: number;
  now: number;
  complexity: Complexity;
  author: AuthorId;
}): IngestBundle {
  const ciRoll = input.rng();
  let ci: IngestBundle["pullRequest"]["ciStatus"] = "passing";
  if (input.complexity === "L4" || ciRoll < 0.42) ci = "running";
  else if (ciRoll < 0.52) ci = "failing";

  return synthesizePullRequest({
    rng: input.rng,
    seq: input.seq,
    createdAtMs: input.now,
    author: input.author,
    complexity: input.complexity,
    title: incomingTitle(input.rng),
    disposition: "open",
    openState: { ci, review: "pending" },
  });
}
