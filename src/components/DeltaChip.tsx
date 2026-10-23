import { formatDelta } from '../lib/format'

export function DeltaChip({
  delta,
  lowerIsBetter,
}: {
  delta: number | null
  lowerIsBetter: boolean
}) {
  if (delta == null || Number.isNaN(delta)) {
    return <span className="font-mono text-[11px] text-zinc-500">—</span>
  }
  const favorable = lowerIsBetter ? delta < 0 : delta > 0
  const unfavorable = lowerIsBetter ? delta > 0 : delta < 0
  const tone = favorable
    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400'
    : unfavorable
      ? 'border-rose-400/30 bg-rose-400/10 text-rose-400'
      : 'border-white/10 bg-white/5 text-zinc-400'
  return (
    <span className={`inline-flex rounded border px-1.5 py-0.5 font-mono text-[10px] ${tone}`}>
      {formatDelta(delta)}
    </span>
  )
}
