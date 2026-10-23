import { useState } from "react";
import { Activity, Check, Database, Download, GitBranch, LoaderCircle, ShieldCheck } from "lucide-react";
import { useSimulation } from "../context/SimulationContext";
import { supabase, supabaseSetupError } from "../lib/repo/supabaseClient";

export function IngestionView() {
  const sim = useSimulation();
  const [repository, setRepository] = useState(sim.githubRepository ?? "Nob1taaaa/LocalAIAgentWithRAG-Assistant");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function importRepository() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const setupError = supabaseSetupError();
      if (setupError || !supabase) throw new Error(setupError ?? "Supabase is not configured.");
      const { data, error: functionError } = await supabase.functions.invoke("import-github-repository", {
        body: { repository: repository.trim() },
      });
      if (functionError) throw new Error(functionError.message);
      if (data?.error) throw new Error(data.error);
      sim.setGitHubData(data.repository, data.pullRequests);
      setSuccess(`Imported ${data.pullRequests.length} pull requests from ${data.repository}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to import this repository.");
    } finally {
      setLoading(false);
    }
  }

  const integrations = [
    {
      title: "GitHub pull requests",
      detail: sim.githubRepository ? `${sim.githubPullRequests?.length ?? 0} PRs loaded · ${sim.githubRepository}` : "Not imported yet",
      state: sim.githubRepository ? "Connected" : "Waiting",
      icon: GitBranch,
      connected: Boolean(sim.githubRepository),
    },
    {
      title: "Supabase storage",
      detail: supabase ? "Authenticated workspace · row-level access" : "Add project URL and publishable key",
      state: supabase ? "Configured" : "Setup needed",
      icon: Database,
      connected: Boolean(supabase),
    },
    {
      title: "CI and local model telemetry",
      detail: "Appears after Actions runs and Ollama sessions are recorded",
      state: "Awaiting events",
      icon: Activity,
      connected: false,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-8">
      <header className="max-w-2xl">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-300">Data connections</p>
        <h1 className="mt-3 text-2xl font-medium tracking-tight text-zinc-100 sm:text-3xl">Connect a real repository</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Import actual pull request metadata from GitHub into your Supabase workspace. The dashboard keeps GitHub facts separate from CI and local model events until those sources send their own data.
        </p>
      </header>

      <section className="grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-3">
        {integrations.map(({ title, detail, state, icon: Icon, connected }) => (
          <article key={title} className="min-h-36 bg-[#101114] p-5">
            <div className="flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.025] text-zinc-300"><Icon size={16} strokeWidth={1.7} /></span>
              <span className={`inline-flex items-center gap-1.5 text-[11px] ${connected ? "text-emerald-300" : "text-zinc-500"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-300" : "bg-zinc-600"}`} />{state}
              </span>
            </div>
            <h2 className="mt-5 text-sm font-medium text-zinc-100">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-zinc-500">{detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 rounded-xl border border-white/10 bg-[#101114] p-5 sm:p-7 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <div className="flex items-center gap-2 text-emerald-300"><GitBranch size={16} /><span className="text-[11px] font-medium uppercase tracking-[0.16em]">GitHub source</span></div>
          <h2 className="mt-3 text-lg font-medium text-zinc-100">Import pull request history</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">Enter a repository as <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs text-zinc-300">owner/name</code>. Assist Ledger fetches up to 100 recent pull requests and stores the returned metadata in Supabase.</p>
          <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void importRepository(); }}>
            <label className="min-w-0 flex-1">
              <span className="sr-only">GitHub repository</span>
              <input aria-label="GitHub repository" value={repository} onChange={(event) => setRepository(event.target.value)} placeholder="owner/repository" className="h-11 w-full rounded-lg border border-white/10 bg-[#09090b] px-3 font-mono text-sm text-zinc-200 outline-none transition focus:border-emerald-300/50" />
            </label>
            <button disabled={loading || !repository.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-300 px-4 text-sm font-medium text-[#07110d] transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}
              {loading ? "Importing…" : "Import repository"}
            </button>
          </form>
          {error ? <p role="alert" className="mt-3 rounded-lg border border-rose-400/20 bg-rose-400/[0.06] px-3 py-2 text-sm text-rose-200">{error}</p> : null}
          {success ? <p role="status" className="mt-3 inline-flex items-center gap-2 text-sm text-emerald-300"><Check size={15} />{success}</p> : null}
          <div className="mt-5 flex items-start gap-2 border-t border-white/[0.07] pt-4 text-xs leading-5 text-zinc-500">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-zinc-400" />
            Private repository credentials stay in the Supabase Edge Function. The browser only receives pull request metadata.
          </div>
        </div>
        <aside className="rounded-lg border border-white/[0.07] bg-black/15 p-5">
          <h3 className="text-sm font-medium text-zinc-100">What this import provides</h3>
          <ul className="mt-4 space-y-3 text-sm text-zinc-400">
            <li className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-emerald-300" />PR title, author, status, and timestamps</li>
            <li className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-emerald-300" />Changed line counts and links to GitHub</li>
            <li className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-emerald-300" />Study group only when an explicit label exists</li>
          </ul>
          <p className="mt-5 border-t border-white/[0.07] pt-4 text-xs leading-5 text-zinc-500">
            GitHub history does not prove who wrote each line or whether AI was used. CI and Ollama metrics appear only after their separate telemetry integrations record events.
          </p>
        </aside>
      </section>

      {sim.githubPullRequests ? (
        <button type="button" onClick={() => sim.clearGitHubData()} className="text-xs text-zinc-500 underline decoration-white/20 underline-offset-4 hover:text-zinc-300">Clear loaded repository and return to the live empty state</button>
      ) : null}
    </div>
  );
}
