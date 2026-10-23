import { formatDelta, formatDuration, formatHours, formatPercent, formatUsd } from "../lib/format";
import type { KpiModel } from "../lib/metrics";

function DeltaChip({ delta, goodWhen }: { delta: number | null; goodWhen: "neg" | "pos" }) {
  if (delta == null) {
    return <span className="font-mono text-[11px] text-zinc-500">—</span>;
  }
  const good = goodWhen === "neg" ? delta < 0 : delta > 0;
  const tone = Math.abs(delta) < 0.05 ? "text-zinc-400 border-zinc-700" : good ? "text-emerald-400 border-emerald-900/80" : "text-rose-400 border-rose-900/80";
  return (
    <span className={`inline-flex rounded-md border px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${tone}`}>
      {formatDelta(delta)}
    </span>
  );
}

function Cell({
  label,
  ai,
  human,
  delta,
  goodWhen,
  footnote,
}: {
  label: string;
  ai: string;
  human: string;
  delta: number | null;
  goodWhen: "neg" | "pos";
  footnote?: string;
}) {
  return (
    <div className="px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{label}</p>
        <DeltaChip delta={delta} goodWhen={goodWhen} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-zinc-500">AI-assisted</p>
          <p className="mt-0.5 font-mono text-lg tabular-nums text-zinc-100">{ai}</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500">Human baseline</p>
          <p className="mt-0.5 font-mono text-lg tabular-nums text-zinc-300">{human}</p>
        </div>
      </div>
      {footnote ? <p className="mt-2 text-[10px] leading-snug text-zinc-500">{footnote}</p> : null}
    </div>
  );
}

export function KpiStrip({ kpis }: { kpis: KpiModel }) {
  const token = kpis.tokenCostUsd;
  const labor = kpis.laborValueUsd;
  return (
    <section
      data-testid="kpi-strip"
      className="grid border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] md:grid-cols-4 md:divide-x md:divide-white/10"
    >
      <Cell
        label="Time to merge"
        ai={formatDuration(kpis.ai.medianMergeMinutes)}
        human={formatDuration(kpis.human.medianMergeMinutes)}
        delta={kpis.timeDelta}
        goodWhen="neg"
      />
      <Cell
        label="CI first-pass"
        ai={formatPercent(kpis.ai.ciFirstPassRate)}
        human={formatPercent(kpis.human.ciFirstPassRate)}
        delta={kpis.ciDelta}
        goodWhen="pos"
      />
      <Cell
        label="Defect leakage"
        ai={formatPercent(kpis.ai.defectRate)}
        human={formatPercent(kpis.human.defectRate)}
        delta={kpis.defectDelta}
        goodWhen="neg"
      />
      <div className="px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Net / accepted PR</p>
          <DeltaChip delta={kpis.costDelta} goodWhen="neg" />
        </div>
        <p className={`mt-2 font-mono text-lg tabular-nums ${(kpis.netSavedUsd ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {formatUsd(kpis.netSavedUsd)}
          <span className="ml-1.5 text-[10px] font-sans text-zinc-500">saved</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] tabular-nums text-zinc-400">
          <span>Tokens {formatUsd(token)}</span>
          <span>
            Hours saved {formatHours(kpis.hoursSaved)} · {formatUsd(labor)}
          </span>
        </div>
        <p className="mt-2 text-[10px] leading-snug text-zinc-500">
          Assumption: hours saved = (human − AI) median merge time × ${kpis.blendedRate}/hr blended rate, minus mean
          LLM token cost of merged AI PRs.
        </p>
      </div>
    </section>
  );
}
