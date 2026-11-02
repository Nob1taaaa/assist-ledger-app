import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { SimulationProvider } from "./context/SimulationContext";
import { useAuthSession } from "./lib/repo/useAuthSession";
import "./index.css";

function Root() {
  const { session, checking } = useAuthSession();
  if (checking) return <div className="grid min-h-screen place-items-center bg-[#09090b] text-xs text-zinc-500">Loading Assist Ledger…</div>;
  // Signed-out visitors get the public demo; signing in unlocks live telemetry.
  return (
    <SimulationProvider guest={!session}>
      <App guest={!session} email={session?.user.email ?? null} />
    </SimulationProvider>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Root element missing");

createRoot(root).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
