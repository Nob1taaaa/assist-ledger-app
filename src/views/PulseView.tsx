import { KpiStrip } from "../components/KpiStrip";
import { PrStream } from "../components/PrStream";
import { useSimulation } from "../context/SimulationContext";
import { GitHubPulse } from "./GitHubPulse";
import { ArrowRight, Database, GitBranch, LoaderCircle } from "lucide-react";
import { DEFAULT_STUDY_REPOSITORY } from "../lib/live/importRepository";

export function PulseView() {
  const sim = useSimulation();
  if (sim.dataMode === "live" && sim.githubImportStatus === "importing") {
    return (
      <section className="mx-auto grid min-h-[50vh] max-w-lg place-items-center px-5 py-16 text-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-emerald-300" aria-hidden />
        <p className="mt-4 text-sm text-zinc-300">Importing pull requests from GitHub…</p>
        <p className="mt-2 text-xs text-zinc-500">{sim.githubRepository ?? DEFAULT_STUDY_REPOSITORY}</p>
      </section>
    );
  }
  if (sim.dataMode === "live" && sim.githubPullRequests !== null && sim.githubRepository) {
    return <GitHubPulse repository={sim.githubRepository} pullRequests={sim.githubPullRequests} />;
  }
  if (sim.dataMode === "live") {
    return (
      <section className="mx-auto grid min-h-[62vh] max-w-6xl content-center px-5 py-12 sm:px-8">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />Live workspace</p>
          <h1 className="mt-5 max-w-xl text-3xl font-medium leading-tight tracking-tight text-zinc-100 sm:text-5xl">Your engineering activity, from the source.</h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7">Pull requests load from GitHub. Model and CI measurements appear only after those integrations record them. Nothing is filled in with sample numbers in live mode.</p>
          {sim.githubImportError ? <p className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/[0.06] px-3 py-2 text-sm text-rose-200">{sim.githubImportError}</p> : null}
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={() => void sim.importGitHubRepository()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-300 px-4 text-sm font-medium text-[#07110d] transition hover:bg-emerald-200">Import study repository <ArrowRight size={16} /></button>
            <button type="button" onClick={() => sim.setTab("ingestion")} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 px-4 text-sm text-zinc-200 hover:bg-white/[0.04]">Advanced setup</button>
          </div>
          <div className="mt-12 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2">
            <div className="flex gap-3 rounded-lg border border-white/[0.07] bg-white/[0.02] p-4"><GitBranch size={17} className="mt-0.5 shrink-0 text-zinc-300" /><div><p className="text-sm text-zinc-200">GitHub history</p><p className="mt-1 text-xs leading-5 text-zinc-500">Import up to 100 recent pull requests.</p></div></div>
            <div className="flex gap-3 rounded-lg border border-white/[0.07] bg-white/[0.02] p-4"><Database size={17} className="mt-0.5 shrink-0 text-zinc-300" /><div><p className="text-sm text-zinc-200">Supabase workspace</p><p className="mt-1 text-xs leading-5 text-zinc-500">Live data is scoped to your signed-in account.</p></div></div>
          </div>
        </div>
      </section>
    );
  }
  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300/20 bg-amber-300/[0.045] px-4 py-3">
        <div><p className="text-xs font-medium text-amber-200">Simulation preview</p><p className="mt-1 text-xs text-zinc-400">Generated sample events for exploring the interface. These are not repository measurements.</p></div>
        <button onClick={() => sim.setDataMode("live")} className="rounded-md border border-amber-200/20 px-3 py-2 text-xs text-amber-100 hover:bg-amber-200/[0.06]">Switch to live data</button>
      </div>
      <KpiStrip kpis={sim.kpis} />
      <PrStream
        pullRequests={sim.pullRequests}
        selectedId={sim.selectedId}
        lastInsertedId={sim.lastInsertedId}
        onSelect={sim.select}
      />
    </div>
  );
}
