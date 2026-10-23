import { createClient } from "npm:@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "POST required" }, 405);
  const expectedKey = Deno.env.get("ASSIST_LEDGER_INGEST_KEY");
  if (!expectedKey || request.headers.get("x-assist-ledger-key") !== expectedKey) return json({ error: "Invalid ingestion key" }, 401);
  try {
    const ownerId = Deno.env.get("ASSIST_LEDGER_OWNER_ID");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!ownerId || !supabaseUrl || !serviceKey) return json({ error: "Server configuration is incomplete" }, 503);
    const body = await request.json();
    const repository = typeof body.repository === "string" ? body.repository.trim() : "";
    const workflowName = typeof body.workflow_name === "string" ? body.workflow_name.trim() : "";
    const conclusions = ["success", "failure", "cancelled", "skipped", "timed_out", "action_required", "neutral", "stale", "startup_failure"];
    if (!repository || repository.length > 200 || !workflowName || workflowName.length > 200 || !conclusions.includes(body.conclusion)) {
      return json({ error: "Invalid workflow metadata" }, 400);
    }
    if (!Number.isSafeInteger(body.workflow_run_id) || body.workflow_run_id < 1 || !Number.isInteger(body.duration_seconds) || body.duration_seconds < 0) {
      return json({ error: "Invalid workflow run id or duration" }, 400);
    }
    if (!Array.isArray(body.pull_request_numbers) || body.pull_request_numbers.length > 20 || body.pull_request_numbers.some((n: unknown) => !Number.isInteger(n) || Number(n) < 1)) {
      return json({ error: "pull_request_numbers must be a list of positive PR numbers" }, 400);
    }
    const completedAt = new Date(body.completed_at);
    if (Number.isNaN(completedAt.getTime())) return json({ error: "Invalid completion time" }, 400);
    const url = typeof body.url === "string" && body.url.startsWith("https://github.com/") ? body.url : "";
    if (!url) return json({ error: "Invalid GitHub workflow URL" }, 400);

    const rows = body.pull_request_numbers.map((number: number) => ({
      user_id: ownerId,
      repository,
      pull_request_number: number,
      workflow_run_id: body.workflow_run_id,
      workflow_name: workflowName,
      conclusion: body.conclusion,
      duration_seconds: body.duration_seconds,
      url,
      completed_at: completedAt.toISOString(),
    }));
    if (!rows.length) return json({ stored: 0 }, 200);
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { error } = await admin.from("ci_runs").upsert(rows, { onConflict: "user_id,repository,workflow_run_id,pull_request_number" });
    if (error) return json({ error: "Could not store CI results" }, 500);
    return json({ stored: rows.length }, 201);
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
});
