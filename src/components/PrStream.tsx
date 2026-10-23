import { useMemo, useState } from "react";
import { AuthorPill } from "./AuthorPill";
import { CiBadge, ReviewBadge } from "./Badges";
import { AUTHOR_LABEL, CI_LABEL } from "../lib/sim/profiles";
import type { AuthorId, CiStatus, PullRequest } from "../lib/sim/types";

const AUTHOR_IDS = Object.keys(AUTHOR_LABEL) as AuthorId[];

const PAGE = 28;

export function PrStream({
  pullRequests,
  selectedId,
  lastInsertedId,
  onSelect,
}: {
  pullRequests: PullRequest[];
  selectedId: string | null;
  lastInsertedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [author, setAuthor] = useState<AuthorId | "all">("all");
  const [ci, setCi] = useState<CiStatus | "all">("all");
  const [limit, setLimit] = useState(PAGE);

  const filtered = useMemo(
    () =>
      pullRequests.filter((pr) => (author === "all" || pr.author === author) && (ci === "all" || pr.ciStatus === ci)),
    [pullRequests, author, ci],
  );
  const visible = filtered.slice(0, limit);

  return (
    <section className="mt-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h2 className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Ingested PR stream</h2>
        <label className="ml-auto text-[11px] text-zinc-500">
          <span className="sr-only">Filter by author</span>
          <select
            data-testid="filter-author"
            value={author}
            onChange={(event) => {
              setAuthor(event.target.value as AuthorId | "all");
              setLimit(PAGE);
            }}
            className="rounded-md border border-white/10 bg-transparent px-1.5 py-1 text-xs text-zinc-300"
          >
            <option value="all">All authors</option>
            {AUTHOR_IDS.map((id) => (
              <option key={id} value={id}>
                {AUTHOR_LABEL[id]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] text-zinc-500">
          <span className="sr-only">Filter by CI</span>
          <select
            data-testid="filter-ci"
            value={ci}
            onChange={(event) => {
              setCi(event.target.value as CiStatus | "all");
              setLimit(PAGE);
            }}
            className="rounded-md border border-white/10 bg-transparent px-1.5 py-1 text-xs text-zinc-300"
          >
            <option value="all">All CI</option>
            {(Object.keys(CI_LABEL) as CiStatus[]).map((status) => (
              <option key={status} value={status}>
                {CI_LABEL[status]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="max-h-[calc(100vh-292px)] overflow-auto rounded-md border border-white/10">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-[#0c0c0e] text-[10px] uppercase tracking-[0.12em] text-zinc-500">
            <tr className="border-b border-white/10">
              <th className="px-3 py-2 font-medium">PR</th>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Author</th>
              <th className="px-3 py-2 font-medium">Lines</th>
              <th className="px-3 py-2 font-medium">CI</th>
              <th className="px-3 py-2 font-medium">Review</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((pr) => {
              const selected = pr.id === selectedId;
              return (
                <tr
                  key={pr.id}
                  data-testid="pr-row"
                  data-pr-id={pr.id}
                  onClick={() => onSelect(pr.id)}
                  className={`cursor-pointer border-b border-white/[0.06] text-[13px] hover:bg-white/[0.03] ${
                    selected ? "bg-white/[0.05]" : ""
                  } ${pr.id === lastInsertedId ? "row-enter" : ""}`}
                >
                  <td className="px-3 py-2 font-mono text-xs tabular-nums text-zinc-400">{pr.id}</td>
                  <td className="max-w-[360px] truncate px-3 py-2 text-zinc-200">{pr.title}</td>
                  <td className="px-3 py-2">
                    <AuthorPill author={pr.author} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs tabular-nums">
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
              );
            })}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-xs text-zinc-500">
                  No pull requests match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
        <span className="font-mono tabular-nums">
          Showing {visible.length} of {filtered.length}
        </span>
        {limit < filtered.length ? (
          <button
            type="button"
            onClick={() => setLimit((value) => value + PAGE)}
            className="rounded-md border border-white/10 px-2 py-1 text-zinc-300 hover:bg-white/[0.04]"
          >
            Show more
          </button>
        ) : null}
      </div>
    </section>
  );
}
