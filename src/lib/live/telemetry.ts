import { supabase } from "../repo/supabaseClient";

export interface ModelUsageRow {
  id: number;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number | null;
  pull_request_number: number | null;
  created_at: string;
}

export interface CursorActivityRow {
  id: number;
  source: "cursor_agent" | "cursor_tab";
  edits_count: number;
  changed_chars: number;
  created_at: string;
}

export interface CiRunRow {
  id: number;
  pull_request_number: number;
  workflow_name: string;
  conclusion: string;
  duration_seconds: number;
  url: string;
  completed_at: string;
}

export interface LiveTelemetrySnapshot {
  usage: {
    calls: number;
    tokens: number;
    models: string[];
    averageLatency: number | null;
    rows: ModelUsageRow[];
  };
  cursor: {
    agent: number;
    tab: number;
    changedChars: number;
    events: number;
    rows: CursorActivityRow[];
  };
  ci: {
    runs: number;
    passed: number;
    failed: number;
    averageSeconds: number | null;
    rows: CiRunRow[];
  };
  fetchedAt: string;
}

const empty: LiveTelemetrySnapshot = {
  usage: { calls: 0, tokens: 0, models: [], averageLatency: null, rows: [] },
  cursor: { agent: 0, tab: 0, changedChars: 0, events: 0, rows: [] },
  ci: { runs: 0, passed: 0, failed: 0, averageSeconds: null, rows: [] },
  fetchedAt: new Date().toISOString(),
};

export async function fetchLiveTelemetry(repository: string): Promise<LiveTelemetrySnapshot> {
  if (!supabase || !repository.trim()) return { ...empty, fetchedAt: new Date().toISOString() };

  const [usageResult, cursorResult, ciResult] = await Promise.all([
    supabase
      .from("model_usage")
      .select("id,model,prompt_tokens,completion_tokens,latency_ms,pull_request_number,created_at")
      .eq("repository", repository)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("cursor_activity")
      .select("id,source,edits_count,changed_chars,created_at")
      .eq("repository", repository)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("ci_runs")
      .select("id,pull_request_number,workflow_name,conclusion,duration_seconds,url,completed_at")
      .eq("repository", repository)
      .order("completed_at", { ascending: false })
      .limit(200),
  ]);

  const usageRows = (usageResult.data ?? []) as ModelUsageRow[];
  const latencies = usageRows.flatMap((row) => (row.latency_ms === null ? [] : [row.latency_ms]));
  const cursorRows = (cursorResult.data ?? []) as CursorActivityRow[];
  const ciRows = (ciResult.data ?? []) as CiRunRow[];

  return {
    usage: {
      calls: usageRows.length,
      tokens: usageRows.reduce((sum, row) => sum + row.prompt_tokens + row.completion_tokens, 0),
      models: [...new Set(usageRows.map((row) => row.model))],
      averageLatency: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null,
      rows: usageRows,
    },
    cursor: {
      agent: cursorRows.filter((row) => row.source === "cursor_agent").reduce((sum, row) => sum + row.edits_count, 0),
      tab: cursorRows.filter((row) => row.source === "cursor_tab").reduce((sum, row) => sum + row.edits_count, 0),
      changedChars: cursorRows.reduce((sum, row) => sum + row.changed_chars, 0),
      events: cursorRows.length,
      rows: cursorRows,
    },
    ci: {
      runs: ciRows.length,
      passed: ciRows.filter((row) => row.conclusion === "success").length,
      failed: ciRows.filter((row) => row.conclusion === "failure").length,
      averageSeconds: ciRows.length
        ? Math.round(ciRows.reduce((sum, row) => sum + row.duration_seconds, 0) / ciRows.length)
        : null,
      rows: ciRows,
    },
    fetchedAt: new Date().toISOString(),
  };
}

export async function listImportedRepositories(): Promise<string[]> {
  if (!supabase) return [];
  const { data } = await supabase.from("pull_requests").select("repository").limit(500);
  if (!data) return [];
  return [...new Set(data.map((row) => row.repository as string))].sort();
}
