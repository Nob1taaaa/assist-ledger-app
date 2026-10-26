import { useMemo, useState } from "react";
import { Check, Copy, FileText, Printer } from "lucide-react";
import { useSimulation } from "../context/SimulationContext";
import { useLiveTelemetry } from "../hooks/useLiveTelemetry";
import { buildStudyReportMarkdown } from "../lib/live/buildStudyReport";
import { DEFAULT_STUDY_REPOSITORY } from "../lib/live/importRepository";

export function StudyReportView() {
  const sim = useSimulation();
  const repository = sim.githubRepository ?? DEFAULT_STUDY_REPOSITORY;
  const enabled = sim.dataMode === "live" && Boolean(sim.githubRepository);
  const { snapshot, loading, refresh } = useLiveTelemetry(repository, enabled);
  const [copied, setCopied] = useState(false);

  const markdown = useMemo(() => {
    if (!snapshot || !sim.githubPullRequests) return "";
    return buildStudyReportMarkdown(repository, sim.githubPullRequests, snapshot);
  }, [repository, sim.githubPullRequests, snapshot]);

  async function copyReport() {
    if (!markdown) return;
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function printReport() {
    window.print();
  }

  if (sim.dataMode !== "live") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-zinc-400">Study Report uses live telemetry only. Switch to <strong className="text-zinc-200">Live telemetry</strong> in the top bar.</p>
      </div>
    );
  }

  if (!sim.githubRepository) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <FileText className="mx-auto h-8 w-8 text-emerald-300" aria-hidden />
        <h1 className="mt-4 text-lg text-zinc-100">Study Report mini-project</h1>
        <p className="mt-2 text-sm text-zinc-400">Import a repository first, then return here for a one-page summary you can copy into your report or viva slides.</p>
        <button type="button" onClick={() => void sim.importGitHubRepository()} className="mt-6 rounded-lg bg-emerald-300 px-4 py-2 text-sm font-medium text-[#07110d]">
          Import study repository
        </button>
      </div>
    );
  }

  const t = snapshot;

  return (
    <div className="study-report mx-auto max-w-3xl space-y-6 px-4 py-8 print:max-w-none print:bg-white print:text-black print:py-4">
      <header className="border-b border-white/10 pb-5 print:border-zinc-300">
        <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-300 print:text-emerald-800">Mini-project · Study Report</p>
        <h1 className="mt-2 text-2xl font-medium text-zinc-100 print:text-black">Measured engineering session</h1>
        <p className="mt-2 text-sm text-zinc-400 print:text-zinc-700">{repository}</p>
        <div className="mt-4 flex flex-wrap gap-2 print:hidden">
          <button type="button" onClick={() => void refresh()} disabled={loading} className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/[0.04] disabled:opacity-50">
            {loading ? "Refreshing…" : "Refresh data"}
          </button>
          <button type="button" onClick={() => void copyReport()} disabled={!markdown} className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/[0.04]">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy Markdown"}
          </button>
          <button type="button" onClick={printReport} className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/[0.04]">
            <Printer size={14} /> Print / PDF
          </button>
        </div>
      </header>

      {t ? (
        <section className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Pull requests", value: String(sim.githubPullRequests?.length ?? 0) },
            { label: "Ollama calls", value: String(t.usage.calls) },
            { label: "Total tokens", value: t.usage.tokens.toLocaleString() },
            { label: "Cursor agent edits", value: String(t.cursor.agent) },
            { label: "CI runs", value: String(t.ci.runs) },
            { label: "Last sync", value: new Date(t.fetchedAt).toLocaleTimeString() },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-white/10 bg-white/[0.02] p-4 print:border-zinc-300 print:bg-zinc-50">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">{item.label}</p>
              <p className="mt-2 font-mono text-xl text-zinc-100 print:text-black">{item.value}</p>
            </div>
          ))}
        </section>
      ) : null}

      <section className="rounded-lg border border-white/10 bg-[#0c0c0e] p-4 print:hidden">
        <h2 className="text-xs font-medium text-zinc-300">Report preview (Markdown)</h2>
        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-zinc-400">{markdown || "Loading…"}</pre>
      </section>

      <p className="text-[10px] leading-relaxed text-zinc-600 print:text-zinc-500">
        This mini-project exports observed metrics only. It does not infer AI authorship from GitHub or merge simulation data.
      </p>
    </div>
  );
}
