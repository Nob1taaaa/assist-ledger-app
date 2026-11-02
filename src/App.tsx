import { useEffect, useState } from "react";
import { LivePrDrawer } from "./components/LivePrDrawer";
import { PrDrawer } from "./components/PrDrawer";
import { SignInDialog } from "./components/SignInDialog";
import { TopBar } from "./components/TopBar";
import { useLiveTelemetry } from "./hooks/useLiveTelemetry";
import { SIGN_IN_REQUEST_EVENT, useSimulation } from "./context/SimulationContext";
import { supabase } from "./lib/repo/supabaseClient";
import { BenchmarkView } from "./views/BenchmarkView";
import { IngestionView } from "./views/IngestionView";
import { PulseView } from "./views/PulseView";
import { StudyReportView } from "./views/StudyReportView";

type AppProps = { guest: boolean; email: string | null };

export function App({ guest, email }: AppProps) {
  const sim = useSimulation();
  const [showSignIn, setShowSignIn] = useState(false);
  const liveTelemetry = useLiveTelemetry(sim.githubRepository, sim.dataMode === "live" && Boolean(sim.githubRepository));
  const selectedLivePr = sim.githubPullRequests?.find((pr) => pr.number === sim.selectedLivePrNumber) ?? null;

  useEffect(() => {
    const open = () => setShowSignIn(true);
    window.addEventListener(SIGN_IN_REQUEST_EVENT, open);
    return () => window.removeEventListener(SIGN_IN_REQUEST_EVENT, open);
  }, []);

  return (
    <div className="flex h-full min-h-screen flex-col bg-[#09090b] text-zinc-200">
      <TopBar guest={guest} onRequestSignIn={() => setShowSignIn(true)} />

      {guest ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-300/20 bg-amber-300/[0.04] px-4 py-2 text-xs text-amber-100/80">
          <span>You're viewing a demo ledger with simulated pull requests. Sign in to import your own GitHub repository.</span>
          <button type="button" onClick={() => setShowSignIn(true)} className="rounded-md bg-amber-200 px-2.5 py-1 font-medium text-zinc-950 hover:bg-amber-100">
            Sign in
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-end gap-2 border-b border-white/10 px-4 py-1.5 text-[10px] text-zinc-500">
          <span>Signed in as {email}</span>
          <button type="button" onClick={() => void supabase?.auth.signOut()} className="text-zinc-300 hover:text-white">Sign out</button>
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-auto">
        {sim.tab === "pulse" ? <PulseView /> : null}
        {sim.tab === "benchmark" ? <BenchmarkView /> : null}
        {sim.tab === "ingestion" ? (
          guest ? (
            <section className="mx-auto mt-16 max-w-md rounded-xl border border-white/10 bg-white/[0.025] p-6 text-center">
              <h2 className="text-lg font-medium text-zinc-100">Sign in to import a repository</h2>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                Importing pulls real pull-request data from GitHub into your private ledger. Visitors can explore the demo without an account.
              </p>
              <button type="button" onClick={() => setShowSignIn(true)} className="mt-5 rounded-md bg-emerald-300 px-3 py-2 text-xs font-medium text-zinc-950">
                Sign in
              </button>
            </section>
          ) : (
            <IngestionView />
          )
        ) : null}
        {sim.tab === "report" ? <StudyReportView /> : null}
      </main>

      {sim.dataMode === "demo" ? (
        <PrDrawer
          pullRequest={sim.selected}
          ciRuns={sim.selectedCi}
          token={sim.selectedToken}
          onClose={() => sim.select(null)}
        />
      ) : (
        <LivePrDrawer
          pullRequest={selectedLivePr}
          repository={sim.githubRepository ?? ""}
          telemetry={liveTelemetry.snapshot}
          onClose={() => sim.selectLivePr(null)}
        />
      )}

      {showSignIn ? <SignInDialog onClose={() => setShowSignIn(false)} /> : null}
    </div>
  );
}
