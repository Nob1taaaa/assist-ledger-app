import { useCallback, useEffect, useState } from "react";
import { fetchLiveTelemetry, type LiveTelemetrySnapshot } from "../lib/live/telemetry";

const POLL_MS = 45_000;

export function useLiveTelemetry(repository: string | null, enabled: boolean) {
  const [snapshot, setSnapshot] = useState<LiveTelemetrySnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !repository) {
      setSnapshot(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await fetchLiveTelemetry(repository);
      setSnapshot(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load telemetry.");
    } finally {
      setLoading(false);
    }
  }, [enabled, repository]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled || !repository) return;
    const handle = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(handle);
  }, [enabled, repository, refresh]);

  return { snapshot, loading, error, refresh };
}
