import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { SimulationProvider } from "./context/SimulationContext";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element missing");

createRoot(root).render(
  <StrictMode>
    <SimulationProvider>
      <App />
    </SimulationProvider>
  </StrictMode>,
);
