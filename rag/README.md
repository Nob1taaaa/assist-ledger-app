# Local RAG + Ollama (bundled with Assist Ledger)

Document-grounded chat using **Ollama** on your machine. Usage metadata is sent to Supabase for the cockpit dashboard — **not** prompts or retrieved text.

## Setup

```bash
cd rag
python3 -m pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Supabase ingest URL, key, and GitHub study repo (owner/name)
ollama pull llama3.2:3b
ollama pull mxbai-embed-large
```

## Run (two terminals)

**Terminal A — telemetry proxy** (skip if `curl http://127.0.0.1:11435/health` returns `{"ok":true}`):

```bash
cd rag
python3 ollama_telemetry_proxy.py
```

**Terminal B — assistant:**

```bash
cd rag
python3 main.py
```

Open the **cockpit** from the repo root: `npm run dev` (see root README).

## Cursor hooks

Open the **assist-ledger** repo root in Cursor. Hooks in `/.cursor/hooks.json` record edit metadata to Supabase when `rag/.env` is configured.
