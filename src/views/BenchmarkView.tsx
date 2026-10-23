import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSimulation } from "../context/SimulationContext";
import { formatDuration, formatPercent, formatUsd } from "../lib/format";
import type { AuthorId } from "../lib/sim/types";
import { supabase } from "../lib/repo/supabaseClient";

interface LiveCiRun {
  pull_request_number: number;
  conclusion: string;
  completed_at: string;
}

interface LiveUsage {
  pull_request_number: number | null;
  prompt_tokens: number;
  completion_tokens: number;
}

const tooltipStyle = {
  background: "#18181b",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6,
  fontSize: 12,
  color: "#e4e4e7",
};

const axisTick = { fill: "#a1a1aa", fontSize: 11 };
const grid = "rgba(255,255,255,0.06)";

const MODEL_COLOR: Record<AuthorId, string> = {
  "claude-3.5-sonnet": "#d6a25e",
  "gpt-4o": "#a78bca",
  copilot: "#7aa8b8",
  human: "#a1a1aa",
};

export function BenchmarkView() {
  const { cycle, density, models, githubPullRequests, githubRepository, dataMode, setTab } = useSimulation();
  const [liveCi, setLiveCi] = useState<LiveCiRun[]>([]);
  const [liveUsage, setLiveUsage] = useState<LiveUsage[]>([]);
  useEffect(() => {
    let active = true;
    if (dataMode !== "live" || !githubRepository || !supabase) {
      setLiveCi([]);
      setLiveUsage([]);
      return () => { active = false; };
    }
    void Promise.all([
      supabase.from("ci_runs").select("pull_request_number,conclusion,completed_at").eq("repository", githubRepository),
      supabase.from("model_usage").select("pull_request_number,prompt_tokens,completion_tokens").eq("repository", githubRepository),
    ]).then(([ciResult, usageResult]) => {
      if (!active) return;
      setLiveCi((ciResult.data ?? []) as LiveCiRun[]);
      setLiveUsage((usageResult.data ?? []) as LiveUsage[]);
    });
    return () => { active = false; };
  }, [dataMode, githubRepository]);
  if (dataMode === "live") {
    if (!githubPullRequests?.length || !githubRepository) return <div className="mx-auto max-w-2xl px-4 py-16 text-center"><p className="text-[10px] uppercase tracking-[0.16em] text-emerald-300">Live benchmark</p><h2 className="mt-3 text-lg text-zinc-100">Connect a repository first</h2><p className="mt-2 text-sm leading-relaxed text-zinc-400">Live mode never fills missing measurements with demo data.</p><button onClick={() => setTab("ingestion")} className="mt-5 rounded-md border border-white/10 px-3 py-2 text-xs text-zinc-200">Open repository setup</button></div>;
    const grouped = (["ai-assisted", "human-only"] as const).map((studyGroup) => {
      const prs = githubPullRequests.filter((pr) => pr.studyGroup === studyGroup);
      const merged = prs.filter((pr) => pr.mergedAt);
      const cycleHours = merged.map((pr) => (new Date(pr.mergedAt!).getTime() - new Date(pr.createdAt).getTime()) / 3_600_000).filter((hours) => hours >= 0).sort((a, b) => a - b);
      const prNumbers = new Set(prs.map((pr) => pr.number));
      const runsByPr = new Map<number, LiveCiRun[]>();
      for (const run of liveCi.filter((row) => prNumbers.has(row.pull_request_number))) runsByPr.set(run.pull_request_number, [...(runsByPr.get(run.pull_request_number) ?? []), run]);
      const measuredFirstRuns = [...runsByPr.values()].map((runs) => runs.sort((a, b) => a.completed_at.localeCompare(b.completed_at))[0]);
      const usage = liveUsage.filter((row) => row.pull_request_number !== null && prNumbers.has(row.pull_request_number));
      const medianHours = cycleHours.length ? cycleHours[Math.floor((cycleHours.length - 1) / 2)] : null;
      return { studyGroup, total: prs.length, merged: merged.length, medianHours, ciCount: measuredFirstRuns.length, firstPass: measuredFirstRuns.filter((run) => run.conclusion === "success").length, tokens: usage.reduce((sum, row) => sum + row.prompt_tokens + row.completion_tokens, 0) };
    });
    return (
      <div className="space-y-4 px-4 py-5">
        <section className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.035] p-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-300">Observed study data · {githubRepository}</p>
          <h2 className="mt-2 text-lg text-zinc-100">AI-assisted and human-only PRs</h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">Groups come only from explicit PR labels. GitHub authorship is not treated as proof of human-only code. Unlabelled PRs are excluded.</p>
        </section>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="border-b border-white/10 text-[10px] uppercase tracking-wider text-zinc-500"><tr><th className="px-3 py-3">Declared group</th><th className="px-3 py-3">PRs</th><th className="px-3 py-3">Merged</th><th className="px-3 py-3">Median merge time</th><th className="px-3 py-3">First CI pass</th><th className="px-3 py-3">Linked tokens</th></tr></thead>
            <tbody className="divide-y divide-white/[0.06]">{grouped.map((row) => <tr key={row.studyGroup}><th className="px-3 py-3 font-medium text-zinc-200">{row.studyGroup}</th><td className="px-3 py-3 font-mono">{row.total}</td><td className="px-3 py-3 font-mono">{row.merged}</td><td className="px-3 py-3 font-mono">{row.medianHours === null ? "—" : `${row.medianHours.toFixed(1)} h`}</td><td className="px-3 py-3 font-mono">{row.ciCount ? `${Math.round(row.firstPass / row.ciCount * 100)}% · n=${row.ciCount}` : "—"}</td><td className="px-3 py-3 font-mono">{row.tokens.toLocaleString()}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="text-[10px] leading-relaxed text-zinc-600">This comparison is descriptive, not causal. Small samples and differences in task complexity can skew results. Model tokens appear only when a local model run is explicitly linked to a PR.</p>
      </div>
    );
  }
  const velocity = models.map((model) => ({
    name: model.label.replace("Claude 3.5 Sonnet", "Claude 3.5"),
    minutes: model.medianMinutes == null ? 0 : Math.round(model.medianMinutes),
    author: model.author,
  }));

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300/20 bg-amber-300/[0.045] px-4 py-3">
        <div>
          <p className="text-xs font-medium text-amber-200">Simulation preview</p>
          <p className="mt-1 text-xs text-zinc-400">Charts below use generated sample PRs. Switch to live telemetry for measured study data.</p>
        </div>
      </div>
      <section className="rounded-md border border-white/10 p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        <header className="mb-2">
          <h2 className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Cycle time by complexity</h2>
          <p className="mt-1 text-xs text-zinc-500">Median minutes to merge. AI-assisted versus human.</p>
        </header>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cycle} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={grid} vertical={false} />
              <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} width={36} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                contentStyle={tooltipStyle}
                formatter={(value) => [formatDuration(Number(value)), ""]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }} />
              <Bar dataKey="ai" name="AI-assisted" fill="#34d399" radius={[2, 2, 0, 0]} maxBarSize={28} />
              <Bar dataKey="human" name="Human" fill="#a1a1aa" radius={[2, 2, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-md border border-white/10 p-3">
        <header className="mb-2">
          <h2 className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Defect density vs size</h2>
          <p className="mt-1 text-xs text-zinc-500">
            X is lines changed. Y is defects per 1k lines — clean PRs sit near zero, rollbacks spike.
          </p>
        </header>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={grid} />
              <XAxis
                type="number"
                dataKey="x"
                name="Lines"
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: number) => (value >= 1000 ? `${Math.round(value / 100) / 10}k` : String(value))}
              />
              <YAxis type="number" dataKey="y" tick={axisTick} axisLine={false} tickLine={false} width={32} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.2)" }}
                contentStyle={tooltipStyle}
                formatter={(value, name) => [value, name === "x" ? "Lines" : "Density"]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }} />
              <Scatter data={density.ai} name="AI-assisted" fill="#34d399" />
              <Scatter data={density.human} name="Human" fill="#d4d4d8" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <header className="mb-2">
          <h2 className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Head-to-head</h2>
          <p className="mt-1 text-xs text-zinc-500">Approval velocity is the median time to merge. Rollback rate is defect leakage on merged PRs.</p>
        </header>
        <div className="grid gap-2 md:grid-cols-4">
          {models.map((model) => (
            <article key={model.author} className="rounded-md border border-white/10 px-3 py-3">
              <p className="text-xs text-zinc-300">{model.label}</p>
              <p className="mt-2 font-mono text-lg tabular-nums text-zinc-100">
                {formatDuration(model.medianMinutes)}
              </p>
              <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Median merge</p>
              <p className="mt-3 font-mono text-sm tabular-nums text-zinc-300">
                {formatPercent(model.rollbackRate)}
              </p>
              <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Rollback rate</p>
              <p className="mt-3 font-mono text-[11px] text-zinc-500">
                n={model.merged}
                {model.author !== "human" ? ` · ${formatUsd(model.meanCost)} avg` : ""}
              </p>
            </article>
          ))}
        </div>
        <div className="mt-3 h-[220px] rounded-md border border-white/10 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={velocity} layout="vertical" margin={{ top: 4, right: 12, left: 16, bottom: 0 }}>
              <CartesianGrid stroke={grid} horizontal={false} />
              <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={axisTick} axisLine={false} tickLine={false} width={88} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatDuration(Number(value)), "Median"]} />
              <Bar dataKey="minutes" name="Median merge" radius={[0, 2, 2, 0]} maxBarSize={16}>
                {velocity.map((row) => (
                  <Cell key={row.author} fill={MODEL_COLOR[row.author]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
