import { createClient } from "npm:@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function isCount(value: unknown): value is number {
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
    if (body.source !== "cursor_agent" && body.source !== "cursor_tab") return json({ error: "Invalid edit source" }, 400);
    const repository = typeof body.repository === "string" ? body.repository.trim() : "";
    if (!repository || repository.length > 200 || !isCount(body.edits_count) || !isCount(body.changed_chars)) {
      return json({ error: "Invalid activity metadata" }, 400);
    }
    const cleanOptional = (value: unknown) => typeof value === "string" ? value.slice(0, 200) : null;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { error } = await admin.from("cursor_activity").insert({
      user_id: ownerId,
      repository,
      source: body.source,
      model: cleanOptional(body.model),
      conversation_id: cleanOptional(body.conversation_id),
      generation_id: cleanOptional(body.generation_id),
      edits_count: body.edits_count,
      changed_chars: body.changed_chars,
    });
    if (error) return json({ error: "Could not store Cursor activity" }, 500);
    return json({ stored: true }, 201);
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
});
