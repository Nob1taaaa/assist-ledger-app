import type { CiStatus, ReviewStatus } from "../lib/sim/types";
import { CI_LABEL, REVIEW_LABEL } from "../lib/sim/profiles";

const CI: Record<CiStatus, string> = {
  passing: "border-emerald-900/80 bg-emerald-950/50 text-emerald-400",
  failing: "border-rose-900/80 bg-rose-950/50 text-rose-400",
  running: "border-zinc-700 bg-zinc-800/70 text-zinc-300",
};

const REVIEW: Record<ReviewStatus, string> = {
  merged: "border-zinc-700 bg-zinc-900 text-zinc-200",
  approved: "border-emerald-950 bg-emerald-950/30 text-emerald-300/90",
  changes_requested: "border-rose-950 bg-rose-950/30 text-rose-300/90",
  pending: "border-zinc-800 bg-transparent text-zinc-400",
};

export function CiBadge({ status }: { status: CiStatus }) {
  return (
    <span className={`inline-flex rounded-md border px-1.5 py-0.5 text-[11px] leading-4 ${CI[status]}`}>
      {CI_LABEL[status]}
    </span>
  );
}

export function ReviewBadge({ status }: { status: ReviewStatus }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] leading-4 ${REVIEW[status]}`}>
      {REVIEW_LABEL[status]}
    </span>
  );
}
