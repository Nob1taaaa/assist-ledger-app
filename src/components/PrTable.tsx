import type { PullRequest } from '../lib/sim/types'
import { AuthorPill } from './AuthorPill'
import { CiBadge, ReviewBadge } from './Badges'

export function PrTable({
  prs,
  selectedId,
  freshIds,
  onSelect,
}: {
  prs: readonly PullRequest[]
  selectedId: string | null
  freshIds: ReadonlySet<string>
  onSelect: (id: string) => void
}) {
  return (
    <div className="overflow-x-auto rounded border border-white/10">
      <table className="w-full min-w-[760px] border-collapse text-left text-[12px]">
        <thead className="border-b border-white/10 text-[10px] tracking-wide text-zinc-500 uppercase">
          <tr>
            <th className="px-3 py-2 font-medium">ID</th>
            <th className="px-3 py-2 font-medium">Title</th>
            <th className="px-3 py-2 font-medium">Author</th>
            <th className="px-3 py-2 font-medium">Diff</th>
            <th className="px-3 py-2 font-medium">CI</th>
            <th className="px-3 py-2 font-medium">Review</th>
          </tr>
        </thead>
        <tbody>
          {prs.map((pr) => {
            const selected = pr.id === selectedId
            const fresh = freshIds.has(pr.id)
            return (
              <tr
                key={pr.id}
                onClick={() => onSelect(pr.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelect(pr.id)
                  }
                }}
                tabIndex={0}
                aria-selected={selected}
                className={`cursor-pointer border-b border-white/5 last:border-b-0 ${
                  selected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                } ${fresh ? 'ledger-row-in' : ''}`}
              >
                <td className="px-3 py-2 font-mono text-[11px] text-zinc-300">{pr.id}</td>
                <td className="max-w-[440px] truncate px-3 py-2 text-zinc-200">{pr.title}</td>
                <td className="px-3 py-2">
                  <AuthorPill author={pr.author} />
                </td>
                <td className="px-3 py-2 font-mono text-[11px] tabular-nums">
                  <span className="text-emerald-400/90">+{pr.additions}</span>
                  <span className="text-zinc-600"> / </span>
                  <span className="text-rose-400/90">−{pr.deletions}</span>
                </td>
                <td className="px-3 py-2">
                  <CiBadge status={pr.ciStatus} />
                </td>
                <td className="px-3 py-2">
                  <ReviewBadge status={pr.reviewStatus} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
