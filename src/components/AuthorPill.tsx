import type { AuthorId } from "../lib/sim/types";
import { AUTHOR_LABEL } from "../lib/sim/profiles";

const PILL: Record<AuthorId, string> = {
  human: "border-zinc-700 bg-zinc-800/80 text-zinc-300",
  copilot: "border-sky-900/80 bg-sky-950/70 text-sky-300",
  "claude-3.5-sonnet": "border-amber-900/70 bg-amber-950/60 text-amber-300",
  "gpt-4o": "border-violet-900/70 bg-violet-950/60 text-violet-300",
};

export function AuthorPill({ author }: { author: AuthorId }) {
  return (
    <span
      className={`inline-flex max-w-full items-center truncate rounded-md border px-1.5 py-0.5 text-[11px] leading-4 ${PILL[author]}`}
    >
      {AUTHOR_LABEL[author]}
    </span>
  );
}
