import { Pause, Play, RotateCcw, Zap } from "lucide-react";
import { useSimulation } from "../context/SimulationContext";
import type { DataMode, TabId } from "../context/SimulationContext";
import { COMPLEXITY_LABEL } from "../lib/sim/profiles";
import type { Complexity, Speed } from "../lib/sim/types";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "pulse", label: "The Pulse" },
  { id: "benchmark", label: "Benchmark Arena" },
  { id: "ingestion", label: "Developer Ingestion Hub" },
];

const PRESETS: Complexity[] = ["L1", "L2", "L3", "L4"];
const SPEEDS: Speed[] = [1, 2, 5];

export function TopBar() {
  const sim = useSimulation();

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#09090b]/95 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.04)] backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 pt-3">
        <div className="text-[13px] font-medium tracking-tight text-zinc-100">
          Assist Ledger <span className="text-zinc-600">//</span> Telemetry Cockpit
        </div>
        <nav className="flex items-center gap-1" aria-label="Views">
          {TABS.map((tab) => {
            const active = sim.tab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`tab-${tab.id}`}
                onClick={() => sim.setTab(tab.id)}
                className={`rounded-md px-2.5 py-1 text-xs ${
                  active
                    ? "bg-white/8 text-zinc-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
        <div className="inline-flex overflow-hidden rounded-md border border-white/10" role="group" aria-label="Data mode">
          {(["live", "demo"] as DataMode[]).map((mode) => (
            <button key={mode} type="button" aria-pressed={sim.dataMode === mode} onClick={() => sim.setDataMode(mode)} className={`px-2.5 py-1 text-xs capitalize ${sim.dataMode === mode ? (mode === "live" ? "bg-emerald-400/10 text-emerald-200" : "bg-amber-400/10 text-amber-200") : "text-zinc-500 hover:text-zinc-300"}`}>
              {mode === "live" ? "Live telemetry" : "Simulation / Demo"}
            </button>
          ))}
        </div>
        {sim.dataMode === "live" ? (
          <>
            <span className="rounded-md border border-emerald-300/20 px-2.5 py-1 text-xs text-emerald-200">{sim.githubRepository ? `Real GitHub data · ${sim.githubRepository}` : "Live source · awaiting repository"}</span>
          </>
        ) : <>
        <button
          type="button"
          data-testid="run-toggle"
          onClick={sim.toggleRunning}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-200 hover:bg-white/[0.06]"
        >
          {sim.running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {sim.running ? "Pause" : "Run"}
        </button>

        <label className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
          Speed
          <select
            data-testid="speed"
            value={sim.speed}
            onChange={(event) => sim.setSpeed(Number(event.target.value) as Speed)}
            className="rounded-md border border-white/10 bg-[#09090b] px-1.5 py-1 font-mono text-xs text-zinc-200"
          >
            {SPEEDS.map((speed) => (
              <option key={speed} value={speed}>
                {speed}×
              </option>
            ))}
          </select>
        </label>

        <div className="inline-flex overflow-hidden rounded-md border border-white/10" role="group" aria-label="PR complexity preset">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              title={COMPLEXITY_LABEL[preset]}
              aria-pressed={sim.preset === preset}
              onClick={() => sim.setPreset(preset)}
              className={`px-2 py-1 font-mono text-[11px] ${
                sim.preset === preset ? "bg-white/10 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>

        <button
          type="button"
          data-testid="trigger-pr"
          onClick={sim.trigger}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 text-xs text-zinc-200 hover:bg-white/[0.04]"
        >
          <Zap className="h-3.5 w-3.5 text-zinc-400" />
          Trigger PR Event
          <span className="font-mono text-[10px] text-zinc-500">{COMPLEXITY_LABEL[sim.preset]}</span>
        </button>

        <button
          type="button"
          data-testid="reset"
          onClick={sim.reset}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
        </>}

        <div className="ml-auto flex items-center gap-2 text-[11px] text-zinc-500">
          <span className="relative flex h-1.5 w-1.5" aria-hidden>
            {sim.dataMode === "demo" && sim.running ? (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            ) : null}
          <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${sim.dataMode === "live" ? (sim.githubPullRequests ? "bg-emerald-400" : "bg-amber-400") : sim.running ? "bg-amber-400" : "bg-zinc-600"}`} />
          </span>
          <span data-testid="status-text" className="max-w-[320px] truncate">
            {sim.dataMode === "live" ? (sim.githubPullRequests ? "Connected · GitHub + Supabase" : "Live mode · no repository loaded") : `Simulation · ${sim.statusText}`}
          </span>
          <span className="font-mono tabular-nums text-zinc-300" data-testid="pr-count">
            {sim.dataMode === "live" ? (sim.githubPullRequests?.length ?? 0) : sim.pullRequests.length} PRs
          </span>
        </div>
      </div>
    </header>
  );
}
