import { LivePrDrawer } from "./components/LivePrDrawer";
import { PrDrawer } from "./components/PrDrawer";
import { TopBar } from "./components/TopBar";
import { useLiveTelemetry } from "./hooks/useLiveTelemetry";
import { useSimulation } from "./context/SimulationContext";
import { BenchmarkView } from "./views/BenchmarkView";
import { IngestionView } from "./views/IngestionView";
import { PulseView } from "./views/PulseView";
import { StudyReportView } from "./views/StudyReportView";
import { AuthGate } from "./components/AuthGate";

export function App() {
  const sim = useSimulation();
  const liveTelemetry = useLiveTelemetry(sim.githubRepository, sim.dataMode === "live" && Boolean(sim.githubRepository));
  const selectedLivePr = sim.githubPullRequests?.find((pr) => pr.number === sim.selectedLivePrNumber) ?? null;

  return (
    <AuthGate>
      <div className="flex h-full min-h-screen flex-col bg-[#09090b] text-zinc-200">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-auto">
          {sim.tab === "pulse" ? <PulseView /> : null}
          {sim.tab === "benchmark" ? <BenchmarkView /> : null}
          {sim.tab === "ingestion" ? <IngestionView /> : null}
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
      </div>
    </AuthGate>
  );
}
