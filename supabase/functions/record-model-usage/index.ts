import { createClient } from "npm:@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "POST required" }, 405);
  const expectedKey = Deno.env.get("ASSIST_LEDGER_INGEST_KEY");
  if (!expectedKey || request.headers.get("x-assist-ledger-key") !== expectedKey) {
    return json({ error: "Invalid ingestion key" }, 401);
  }

  try {
    const ownerId = Deno.env.get("ASSIST_LEDGER_OWNER_ID");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!ownerId || !supabaseUrl || !serviceKey) return json({ error: "Server configuration is incomplete" }, 503);

    const body = await request.json();
    const repository = typeof body.repository === "string" ? body.repository.trim() : "";
    const model = typeof body.model === "string" ? body.model.trim() : "";
    const provider = typeof body.provider === "string" ? body.provider.trim() : "";
    if (!repository || repository.length > 200 || !model || model.length > 120 || !provider || provider.length > 40) {
      return json({ error: "Repository, provider, and model are required" }, 400);
    }
    if (!nonNegativeInteger(body.prompt_tokens) || !nonNegativeInteger(body.completion_tokens)) {
      return json({ error: "Token counts must be non-negative integers" }, 400);
    }
    const latency = body.latency_ms;
    if (latency !== null && latency !== undefined && !nonNegativeInteger(latency)) {
      return json({ error: "latency_ms must be a non-negative integer or null" }, 400);
    }
    const prNumber = body.pull_request_number;
    if (prNumber !== null && prNumber !== undefined && (!Number.isInteger(prNumber) || prNumber < 1)) {
      return json({ error: "pull_request_number must be a positive integer or null" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { error } = await admin.from("model_usage").insert({
      user_id: ownerId,
      repository,
      pull_request_number: prNumber ?? null,
      provider,
      model,
      prompt_tokens: body.prompt_tokens,
      completion_tokens: body.completion_tokens,
      latency_ms: latency ?? null,
      // Local Ollama has no per-token API charge; energy cost is not estimated here.
      estimated_cost_usd: 0,
    });
    if (error) return json({ error: "Could not store usage metadata" }, 500);
    return json({ stored: true }, 201);
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
});
