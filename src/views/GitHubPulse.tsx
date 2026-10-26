import { ArrowUpRight, GitPullRequest, LoaderCircle, RefreshCw } from "lucide-react";
import type { GitHubPullRequest } from "../lib/repo/github";
import { useLiveTelemetry } from "../hooks/useLiveTelemetry";
import { useSimulation } from "../context/SimulationContext";

export function GitHubPulse({ repository, pullRequests }: { repository: string; pullRequests: GitHubPullRequest[] }) {
  const sim = useSimulation();
  const { snapshot, loading, error, refresh } = useLiveTelemetry(repository, true);

  const usage = snapshot?.usage ?? { calls: 0, tokens: 0, models: [], averageLatency: null };
  const cursorEdits = snapshot?.cursor ?? { agent: 0, tab: 0, changedChars: 0, events: 0 };
  const ci = snapshot?.ci ?? { runs: 0, passed: 0, failed: 0, averageSeconds: null };

  const merged = pullRequests.filter((pr) => pr.mergedAt);
  const open = pullRequests.filter((pr) => pr.state === "open");
  const averageLines = pullRequests.length
    ? Math.round(pullRequests.reduce((sum, pr) => sum + pr.additions + pr.deletions, 0) / pullRequests.length)
    : 0;
  const cards = [
    { label: "Pull requests loaded", value: pullRequests.length.toLocaleString() },
    { label: "Open now", value: open.length.toLocaleString() },
    { label: "Merged", value: merged.length.toLocaleString() },
    { label: "Avg. changed lines", value: averageLines.toLocaleString() },
  ];

  const lastSync = snapshot?.fetchedAt ? new Date(snapshot.fetchedAt).toLocaleTimeString() : null;

  return (
    <div className="space-y-4 px-4 py-4">
      <section className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-300">Live GitHub data · {repository}</p>
            <p className="mt-1 text-xs text-zinc-400">Latest 100 pull requests from GitHub. Telemetry refreshes every 45s{lastSync ? ` · last sync ${lastSync}` : ""}.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {sim.importedRepositories.length > 1 ? (
              <select
                aria-label="Switch imported repository"
                value={repository}
                onChange={(event) => void sim.switchLiveRepository(event.target.value)}
                className="rounded border border-white/10 bg-[#09090b] px-2 py-1 text-[10px] text-zinc-200"
              >
                {sim.importedRepositories.map((repo) => (
                  <option key={repo} value={repo}>{repo}</option>
                ))}
              </select>
            ) : null}
            <button
              type="button"
              disabled={loading}
              onClick={() => void Promise.all([sim.reloadLiveRepository(), refresh()])}
              className="inline-flex items-center gap-1.5 rounded border border-emerald-400/20 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-400/10 disabled:opacity-50"
            >
              {loading ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Refresh
            </button>
          </div>
        </div>
        {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
      </section>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">{card.label}</p>
            <p className="mt-2 font-mono text-2xl tabular-nums text-zinc-100">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-sky-400/20 bg-sky-400/[0.035] p-4">
        <p className="text-[10px] uppercase tracking-[0.16em] text-sky-300">Measured local model usage</p>
        {usage.calls ? (
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div><p className="text-zinc-500">Inference calls</p><p className="mt-1 font-mono text-zinc-100">{usage.calls}</p></div>
            <div><p className="text-zinc-500">Total tokens</p><p className="mt-1 font-mono text-zinc-100">{usage.tokens.toLocaleString()}</p></div>
            <div><p className="text-zinc-500">Models</p><p className="mt-1 text-zinc-100">{usage.models.join(", ")}</p></div>
            <div><p className="text-zinc-500">Average latency</p><p className="mt-1 font-mono text-zinc-100">{usage.averageLatency === null ? "—" : `${usage.averageLatency} ms`}</p></div>
          </div>
        ) : <p className="mt-2 text-xs text-zinc-500">No Ollama telemetry recorded for this repository yet. Prompt and document content are never stored.</p>}
      </section>

      <section className="rounded-lg border border-violet-400/20 bg-violet-400/[0.035] p-4">
        <p className="text-[10px] uppercase tracking-[0.16em] text-violet-300">Cursor edit activity</p>
        {cursorEdits.events ? (
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
            <div><p className="text-zinc-500">Agent edits</p><p className="mt-1 font-mono text-zinc-100">{cursorEdits.agent.toLocaleString()}</p></div>
            <div><p className="text-zinc-500">Tab edits</p><p className="mt-1 font-mono text-zinc-100">{cursorEdits.tab.toLocaleString()}</p></div>
            <div><p className="text-zinc-500">Characters changed</p><p className="mt-1 font-mono text-zinc-100">{cursorEdits.changedChars.toLocaleString()}</p></div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-zinc-500">No Cursor hook events recorded for this repository yet. Hooks send edit counts only — not file contents.</p>
        )}
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-300">GitHub Actions CI</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <div><p className="text-zinc-500">Completed runs</p><p className="mt-1 font-mono text-zinc-100">{ci.runs}</p></div>
          <div><p className="text-zinc-500">Passed</p><p className="mt-1 font-mono text-emerald-300">{ci.passed}</p></div>
          <div><p className="text-zinc-500">Failed</p><p className="mt-1 font-mono text-rose-300">{ci.failed}</p></div>
          <div><p className="text-zinc-500">Average duration</p><p className="mt-1 font-mono text-zinc-100">{ci.averageSeconds === null ? "—" : `${ci.averageSeconds}s`}</p></div>
        </div>
        {!ci.runs ? <p className="mt-3 text-[10px] text-zinc-500">No GitHub Actions results recorded yet. Open a PR and let CI finish with telemetry secrets configured.</p> : null}
      </section>

      <section className="overflow-hidden rounded-lg border border-white/10">
        <div className="border-b border-white/10 px-3 py-2.5"><h2 className="text-xs text-zinc-200">Recent pull requests</h2></div>
        {pullRequests.length === 0 ? <p className="px-3 py-8 text-center text-xs text-zinc-500">No pull requests returned for this repository.</p> : (
          <div className="divide-y divide-white/[0.06]">
            {pullRequests.map((pr) => (
              <button
                key={pr.number}
                type="button"
                onClick={() => sim.selectLivePr(pr.number)}
                className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-white/[0.025]"
              >
                <GitPullRequest className={`h-4 w-4 shrink-0 ${pr.mergedAt ? "text-violet-300" : pr.state === "open" ? "text-emerald-300" : "text-zinc-500"}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-zinc-200">{pr.title}{pr.draft ? <span className="ml-2 text-[10px] text-zinc-500">Draft</span> : null}</p>
                  <p className="mt-1 text-[10px] text-zinc-500">#{pr.number} · {pr.author} · {new Date(pr.createdAt).toLocaleDateString()}{pr.studyGroup ? ` · ${pr.studyGroup}` : " · unlabelled"}</p>
                </div>
                <span className="hidden font-mono text-[10px] text-zinc-500 sm:block">+{pr.additions} / −{pr.deletions}</span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
              </button>
            ))}
          </div>
        )}
      </section>
      <p className="text-[10px] leading-relaxed text-zinc-600">Click a pull request to inspect linked telemetry. GitHub fields do not infer AI authorship or token usage.</p>
    </div>
  );
}
