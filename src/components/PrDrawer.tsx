import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { AuthorPill } from "./AuthorPill";
import { CiBadge, ReviewBadge } from "./Badges";
import { formatClock, formatLatency, formatTokens, formatUsd } from "../lib/format";
import { COMPLEXITY_LABEL } from "../lib/sim/profiles";
import type { CiRun, PullRequest, TokenTelemetry } from "../lib/sim/types";

export function PrDrawer({
  pullRequest,
  ciRuns,
  token,
  onClose,
}: {
  pullRequest: PullRequest | null;
  ciRuns: CiRun[];
  token: TokenTelemetry | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!pullRequest) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pullRequest, onClose]);

  if (!pullRequest) return null;

  return (
    <div className="fixed inset-0 z-40" role="presentation">
      <button
        type="button"
        aria-label="Close inspector"
        data-testid="drawer-backdrop"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="pr-drawer-title"
        data-testid="drawer"
        className="drawer-enter absolute top-0 right-0 flex h-full w-[min(460px,100vw)] flex-col border-l border-white/10 bg-[#0c0c0e] shadow-[inset_1px_0_0_0_rgba(255,255,255,0.06)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] text-zinc-500">{pullRequest.id}</p>
            <h2 id="pr-drawer-title" className="mt-1 text-sm leading-snug text-zinc-100">
              {pullRequest.title}
            </h2>
          </div>
          <button
            type="button"
            data-testid="drawer-close"
            onClick={onClose}
            className="rounded-md border border-white/10 p-1 text-zinc-400 hover:text-zinc-100"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-auto px-4 py-4 text-[13px]">
          <div className="flex flex-wrap items-center gap-2">
            <AuthorPill author={pullRequest.author} />
            <span className="rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[11px] text-zinc-400">
              {COMPLEXITY_LABEL[pullRequest.complexity]}
            </span>
            <CiBadge status={pullRequest.ciStatus} />
            <ReviewBadge status={pullRequest.reviewStatus} />
          </div>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-3">
            <Field label="Opened" value={formatClock(pullRequest.createdAt)} />
            <Field label="Merged" value={formatClock(pullRequest.mergedAt)} />
            <Field label="Generation latency" value={formatLatency(pullRequest.generationLatencySeconds)} mono />
            <Field label="Static analysis" value={`${Math.round(pullRequest.staticAnalysisCoverage)}%`} mono />
            <Field label="Prompt tokens" value={formatTokens(pullRequest.promptTokens)} mono />
            <Field label="Completion tokens" value={formatTokens(pullRequest.completionTokens)} mono />
            <Field label="Estimated LLM cost" value={formatUsd(pullRequest.estimatedCostUsd)} mono />
            <Field label="Diff complexity" value={String(pullRequest.diffComplexity)} mono />
            <Field
              label="Line delta"
              value={
                <span>
                  <span className="text-emerald-400">+{pullRequest.additions}</span>
                  <span className="text-zinc-600"> / </span>
                  <span className="text-rose-400">−{pullRequest.deletions}</span>
                </span>
              }
              mono
            />
            <Field
              label="Rollback"
              value={pullRequest.defectLeakage ? "Recorded" : "None"}
            />
          </dl>

          <div className="border-t border-white/10 pt-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">CI runs</p>
            <ul className="mt-2 space-y-1.5">
              {ciRuns.map((run) => (
                <li key={run.id} className="flex items-center justify-between font-mono text-[11px] text-zinc-400">
                  <span>{run.id}</span>
                  <span>{run.conclusion}</span>
                </li>
              ))}
              {ciRuns.length === 0 ? <li className="text-xs text-zinc-500">No CI runs stored.</li> : null}
            </ul>
          </div>

          <div className="border-t border-white/10 pt-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Token telemetry</p>
            {token ? (
              <p className="mt-2 font-mono text-[11px] text-zinc-400">
                {token.model} · {formatTokens(token.promptTokens)} in / {formatTokens(token.completionTokens)} out ·{" "}
                {formatUsd(token.estimatedCostUsd)}
              </p>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">No model telemetry. Human-authored change.</p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">{label}</dt>
      <dd className={`mt-0.5 text-zinc-200 ${mono ? "font-mono tabular-nums text-xs" : "text-xs"}`}>{value}</dd>
    </div>
  );
}
