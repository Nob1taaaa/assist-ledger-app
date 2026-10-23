import { useEffect, useState } from "react";
import { ArrowUpRight, GitPullRequest, RefreshCw } from "lucide-react";
import type { GitHubPullRequest } from "../lib/repo/github";
import { supabase } from "../lib/repo/supabaseClient";

export function GitHubPulse({ repository, pullRequests }: { repository: string; pullRequests: GitHubPullRequest[] }) {
  const [usage, setUsage] = useState<{ calls: number; tokens: number; models: string[]; averageLatency: number | null }>({ calls: 0, tokens: 0, models: [], averageLatency: null });
  const [cursorEdits, setCursorEdits] = useState<{ agent: number; tab: number; changedChars: number }>({ agent: 0, tab: 0, changedChars: 0 });
  const [ci, setCi] = useState<{ runs: number; passed: number; failed: number; averageSeconds: number | null }>({ runs: 0, passed: 0, failed: 0, averageSeconds: null });
  useEffect(() => {
    let active = true;
    if (!supabase) return () => { active = false; };
    void supabase.from("model_usage")
        .select("model,prompt_tokens,completion_tokens,latency_ms")
      .eq("repository", repository)
      .then(({ data }) => {
        if (!active || !data) return;
        const latencies = data.flatMap((row) => row.latency_ms === null ? [] : [row.latency_ms]);
        setUsage({
          calls: data.length,
          tokens: data.reduce((sum, row) => sum + row.prompt_tokens + row.completion_tokens, 0),
          models: [...new Set(data.map((row) => row.model))],
          averageLatency: latencies.length ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length) : null,
        });
      });
    void supabase.from("cursor_activity")
      .select("source,edits_count,changed_chars")
      .eq("repository", repository)
      .then(({ data }) => {
        if (!active || !data) return;
        setCursorEdits({
          agent: data.filter((row) => row.source === "cursor_agent").reduce((sum, row) => sum + row.edits_count, 0),
          tab: data.filter((row) => row.source === "cursor_tab").reduce((sum, row) => sum + row.edits_count, 0),
          changedChars: data.reduce((sum, row) => sum + row.changed_chars, 0),
        });
      });
    void supabase.from("ci_runs")
      .select("conclusion,duration_seconds")
      .eq("repository", repository)
      .then(({ data }) => {
        if (!active || !data) return;
        setCi({
          runs: data.length,
          passed: data.filter((row) => row.conclusion === "success").length,
          failed: data.filter((row) => row.conclusion === "failure").length,
          averageSeconds: data.length ? Math.round(data.reduce((sum, row) => sum + row.duration_seconds, 0) / data.length) : null,
        });
      });
    return () => { active = false; };
  }, [repository]);

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

  return (
    <div className="space-y-4 px-4 py-4">
      <section className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-300">Live GitHub data · {repository}</p>
            <p className="mt-1 text-xs text-zinc-400">Latest 100 pull requests from GitHub. Counts and code changes come directly from the repository API.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded border border-emerald-400/20 px-2 py-1 text-[10px] text-emerald-300"><RefreshCw className="h-3 w-3" /> Imported source</span>
        </div>
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
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
          <div><p className="text-zinc-500">Agent edits</p><p className="mt-1 font-mono text-zinc-100">{cursorEdits.agent.toLocaleString()}</p></div>
          <div><p className="text-zinc-500">Tab edits</p><p className="mt-1 font-mono text-zinc-100">{cursorEdits.tab.toLocaleString()}</p></div>
          <div><p className="text-zinc-500">Characters changed</p><p className="mt-1 font-mono text-zinc-100">{cursorEdits.changedChars.toLocaleString()}</p></div>
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-zinc-500">Agent and Tab events are recorded from Cursor hooks. These counts do not identify human-authored lines; GitHub authorship shows who submitted a PR, not who wrote each line.</p>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-300">GitHub Actions CI</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <div><p className="text-zinc-500">Completed runs</p><p className="mt-1 font-mono text-zinc-100">{ci.runs}</p></div>
          <div><p className="text-zinc-500">Passed</p><p className="mt-1 font-mono text-emerald-300">{ci.passed}</p></div>
          <div><p className="text-zinc-500">Failed</p><p className="mt-1 font-mono text-rose-300">{ci.failed}</p></div>
          <div><p className="text-zinc-500">Average duration</p><p className="mt-1 font-mono text-zinc-100">{ci.averageSeconds === null ? "—" : `${ci.averageSeconds}s`}</p></div>
        </div>
        {!ci.runs ? <p className="mt-3 text-[10px] text-zinc-500">No GitHub Actions results recorded yet. Add the repository secret and merge or open a PR to trigger CI.</p> : null}
      </section>

      <section className="overflow-hidden rounded-lg border border-white/10">
        <div className="border-b border-white/10 px-3 py-2.5"><h2 className="text-xs text-zinc-200">Recent pull requests</h2></div>
        {pullRequests.length === 0 ? <p className="px-3 py-8 text-center text-xs text-zinc-500">No pull requests returned for this repository.</p> : (
          <div className="divide-y divide-white/[0.06]">
            {pullRequests.map((pr) => (
              <a key={pr.number} href={pr.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-3 py-3 hover:bg-white/[0.025]">
                <GitPullRequest className={`h-4 w-4 shrink-0 ${pr.mergedAt ? "text-violet-300" : pr.state === "open" ? "text-emerald-300" : "text-zinc-500"}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-zinc-200">{pr.title}{pr.draft ? <span className="ml-2 text-[10px] text-zinc-500">Draft</span> : null}</p>
                  <p className="mt-1 text-[10px] text-zinc-500">#{pr.number} · {pr.author} · {new Date(pr.createdAt).toLocaleDateString()}{pr.studyGroup ? ` · ${pr.studyGroup}` : " · unlabelled"}</p>
                </div>
                <span className="hidden font-mono text-[10px] text-zinc-500 sm:block">+{pr.additions} / −{pr.deletions}</span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
              </a>
            ))}
          </div>
        )}
      </section>
      <p className="text-[10px] leading-relaxed text-zinc-600">These GitHub fields do not identify AI authorship, token usage, CI first pass, or escaped defects. Those metrics need explicit instrumentation and are intentionally not inferred here.</p>
    </div>
  );
}
