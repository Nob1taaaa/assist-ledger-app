import { useEffect } from "react";
import { ExternalLink, X } from "lucide-react";
import type { GitHubPullRequest } from "../lib/repo/github";
import type { LiveTelemetrySnapshot } from "../lib/live/telemetry";
import { formatClock } from "../lib/format";

export function LivePrDrawer({
  pullRequest,
  repository,
  telemetry,
  onClose,
}: {
  pullRequest: GitHubPullRequest | null;
  repository: string;
  telemetry: LiveTelemetrySnapshot | null;
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

  const prNumber = pullRequest.number;
  const ciRuns = telemetry?.ci.rows.filter((row) => row.pull_request_number === prNumber) ?? [];
  const usageRows = telemetry?.usage.rows.filter((row) => row.pull_request_number === prNumber) ?? [];
  const usageTokens = usageRows.reduce((sum, row) => sum + row.prompt_tokens + row.completion_tokens, 0);

  return (
    <div className="fixed inset-0 z-40" role="presentation">
      <button type="button" aria-label="Close inspector" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="live-pr-drawer-title"
        className="drawer-enter absolute top-0 right-0 flex h-full w-[min(460px,100vw)] flex-col border-l border-white/10 bg-[#0c0c0e] shadow-[inset_1px_0_0_0_rgba(255,255,255,0.06)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] text-zinc-500">{repository} · #{prNumber}</p>
            <h2 id="live-pr-drawer-title" className="mt-1 text-sm leading-snug text-zinc-100">{pullRequest.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-white/10 p-1 text-zinc-400 hover:text-zinc-100" aria-label="Close">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-auto px-4 py-4 text-[13px]">
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-md border border-white/10 px-2 py-0.5 text-zinc-300">{pullRequest.author}</span>
            <span className="rounded-md border border-white/10 px-2 py-0.5 text-zinc-400">{pullRequest.state}</span>
            {pullRequest.studyGroup ? (
              <span className="rounded-md border border-emerald-400/30 px-2 py-0.5 text-emerald-200">{pullRequest.studyGroup}</span>
            ) : (
              <span className="rounded-md border border-zinc-600/40 px-2 py-0.5 text-zinc-500">unlabelled</span>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div><dt className="text-zinc-500">Opened</dt><dd className="mt-0.5 font-mono text-zinc-200">{formatClock(pullRequest.createdAt)}</dd></div>
            <div><dt className="text-zinc-500">Merged</dt><dd className="mt-0.5 font-mono text-zinc-200">{formatClock(pullRequest.mergedAt)}</dd></div>
            <div><dt className="text-zinc-500">Changed lines</dt><dd className="mt-0.5 font-mono text-zinc-200">+{pullRequest.additions} / −{pullRequest.deletions}</dd></div>
          </dl>

          <section className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <h3 className="text-[10px] uppercase tracking-wider text-zinc-500">Linked model usage</h3>
            {usageRows.length ? (
              <ul className="mt-2 space-y-2 text-xs text-zinc-300">
                {usageRows.map((row) => (
                  <li key={row.id} className="font-mono">
                    {row.model} · {row.prompt_tokens + row.completion_tokens} tokens
                    {row.latency_ms !== null ? ` · ${row.latency_ms} ms` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">No Ollama runs linked to this PR number.</p>
            )}
            {usageTokens > 0 ? <p className="mt-2 text-[10px] text-zinc-600">Total linked tokens: {usageTokens.toLocaleString()}</p> : null}
          </section>

          <section className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <h3 className="text-[10px] uppercase tracking-wider text-zinc-500">Recorded CI runs</h3>
            {ciRuns.length ? (
              <ul className="mt-2 space-y-2 text-xs">
                {ciRuns.map((run) => (
                  <li key={run.id} className="flex items-center justify-between gap-2">
                    <span className="text-zinc-300">{run.workflow_name}</span>
                    <span className={`font-mono ${run.conclusion === "success" ? "text-emerald-300" : "text-rose-300"}`}>{run.conclusion}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">No Actions workflow results stored for this PR yet.</p>
            )}
          </section>

          <a
            href={pullRequest.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-emerald-200"
          >
            Open on GitHub <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </aside>
    </div>
  );
}
