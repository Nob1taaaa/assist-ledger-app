import { PrDrawer } from "./components/PrDrawer";
import { TopBar } from "./components/TopBar";
import { useSimulation } from "./context/SimulationContext";
import { BenchmarkView } from "./views/BenchmarkView";
import { IngestionView } from "./views/IngestionView";
import { PulseView } from "./views/PulseView";
import { AuthGate } from "./components/AuthGate";

export function App() {
  const sim = useSimulation();

  return (
    <AuthGate>
      <div className="flex h-full min-h-screen flex-col bg-[#09090b] text-zinc-200">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-auto">
          {sim.tab === "pulse" ? <PulseView /> : null}
          {sim.tab === "benchmark" ? <BenchmarkView /> : null}
          {sim.tab === "ingestion" ? <IngestionView /> : null}
        </main>
        <PrDrawer
          pullRequest={sim.selected}
          ciRuns={sim.selectedCi}
          token={sim.selectedToken}
          onClose={() => sim.select(null)}
        />
      </div>
    </AuthGate>
  );
}
