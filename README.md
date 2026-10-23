# Assist Ledger

Assist Ledger is a final-year developer analytics project for studying pull request flow alongside **explicitly instrumented** AI and CI signals. It keeps three layers separate:

| Layer | What it is | Where it appears |
|-------|------------|------------------|
| **Live telemetry** | GitHub PR facts, Ollama usage metadata, Cursor hook counts, Actions CI results | Pulse + Benchmark when **Live telemetry** mode is on |
| **Simulation / Demo** | Deterministic synthetic PR stream | Clearly labelled amber banner; never mixed into live charts |
| **Not inferred** | AI authorship, token spend from GitHub, defects, “first-pass CI” without workflow data | Never fabricated |

GitHub PR metadata does **not** prove whether AI was used. Study groups come only from PR labels (`assist-ledger:ai-assisted` / `assist-ledger:human-only`). See [docs/study-protocol.md](docs/study-protocol.md).

## Quick start (dashboard)

```sh
cd assist-ledger
npm install
cp .env.example .env.local
# Fill VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY from Supabase → Project Settings → API
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Sign in with a user you create in Supabase Auth, then use **Developer Ingestion Hub** to import `owner/name` (default suggestion: your RAG study repo).

```sh
npm run build   # production build (also run in GitHub Actions CI)
```

### Frontend environment variables (`.env.local`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Publishable (anon) key for Auth and RLS reads |

Never put `GITHUB_TOKEN`, service role keys, or `ASSIST_LEDGER_INGEST_KEY` in `.env.local`.

## Supabase backend

### 1. Link project and apply schema

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Migrations create: `pull_requests`, `model_usage`, `cursor_activity`, `ci_runs` (all RLS-scoped per user).

### 2. Deploy Edge Functions

```sh
npx supabase functions deploy import-github-repository
npx supabase functions deploy record-model-usage
npx supabase functions deploy record-cursor-activity
npx supabase functions deploy record-ci-run
```

### 3. Function secrets (Supabase Dashboard → Edge Functions → Secrets)

| Secret | Used by | Purpose |
|--------|---------|---------|
| `GITHUB_TOKEN` | `import-github-repository` | Optional; needed for private repos and higher rate limits |
| `ASSIST_LEDGER_INGEST_KEY` | `record-*` functions | Shared secret; clients send `x-assist-ledger-key` |
| `ASSIST_LEDGER_OWNER_ID` | `record-*` functions | UUID of your Supabase Auth user (telemetry rows attach to this user) |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically to Edge Functions.

### 4. Auth

Create a user in Supabase Auth (email/password). The dashboard requires sign-in; PR import uses your session JWT.

## Connect your Local RAG / Ollama project

The reference integration lives in **`~/LocalAIAgentWithRAG-Assistant`** (your existing Python RAG app). Equivalent copy-paste helpers are in this repo under `integrations/`.

1. Copy [integrations/.env.example](integrations/.env.example) to `.env` in the **study repository** (not committed).
2. Set `ASSIST_LEDGER_FUNCTION_URL` to `https://YOUR_PROJECT_REF.supabase.co/functions/v1/record-model-usage`.
3. Set `ASSIST_LEDGER_INGEST_KEY` to the same value configured in Supabase secrets.
4. Set `ASSIST_LEDGER_REPOSITORY` to `owner/name` of the repo you import in the dashboard.
5. After each Ollama answer, call `report_usage()` — see `integrations/python/report_usage.py` or `assist_ledger.py` in the RAG repo.

**Privacy:** only token counts, model name, latency, and optional PR number are sent. Prompts, retrieved documents, and answers are not stored.

Optional: set `ASSIST_LEDGER_PULL_REQUEST_NUMBER` to link inference rows to a PR for the live benchmark table.

## Cursor Agent / Tab activity

Cursor supports **project hooks** (`afterFileEdit`, `afterTabFileEdit`). There is no official cloud API that streams edit history to third parties; hooks are the supported way to record **metadata** locally and POST to Assist Ledger.

1. Copy [integrations/cursor/hooks.json](integrations/cursor/hooks.json) into `.cursor/hooks.json` in your study repo (adjust paths if needed).
2. Use the same `.env` variables as the RAG app (`ASSIST_LEDGER_*`, `SUPABASE_PUBLISHABLE_KEY`).
3. Deploy `record-cursor-activity` and set ingest secrets as above.

Hooks count edits and character deltas only — not file contents. Cursor must be opened on the study repository for hooks to run.

## GitHub Actions CI telemetry

This repository includes:

- [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — `npm ci` + `npm run build`
- [`.github/workflows/telemetry.yml`](.github/workflows/telemetry.yml) — after **CI** completes on a **pull_request**, posts workflow metadata to `record-ci-run`

Configure in **this** GitHub repo (or mirror the workflow in your study repo):

| GitHub secret / variable | Purpose |
|--------------------------|---------|
| `ASSIST_LEDGER_INGEST_KEY` (secret) | Matches Supabase function secret |
| `ASSIST_LEDGER_SUPABASE_URL` (variable) | `https://YOUR_PROJECT_REF.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` (variable) | Optional; some gateways expect `apikey` header |

If secrets are missing, the telemetry workflow skips reporting (CI still passes).

## Collecting real study data (checklist)

1. Label PRs in the study repo per [docs/study-protocol.md](docs/study-protocol.md).
2. Sign in to the dashboard and **Import repository**.
3. Run Ollama/RAG queries with telemetry env vars set — confirm **Measured local model usage** on Pulse.
4. Edit code in Cursor with hooks enabled — confirm **Cursor edit activity**.
5. Open a PR and let **CI** finish — confirm **GitHub Actions CI** counts (after telemetry workflow runs).

Use **Live telemetry** in the top bar for all reporting. Use **Simulation / Demo** only for UI exploration.

## Known limitations

- GitHub **list pulls** API may return `0` changed lines until per-PR detail fetching is added (redeploy `import-github-repository` after updates).
- Live benchmark compares only PRs with explicit study labels; small samples are descriptive, not causal.
- Cursor hooks depend on local Cursor configuration; they do not run in the browser dashboard.
- `ASSIST_LEDGER_OWNER_ID` must match the user you use to sign in, or telemetry rows will not appear under your account.
- No GitHub webhook receiver is deployed yet; import is on-demand from the UI.

## Repository layout

- `src/` — React dashboard (Vite + Tailwind)
- `supabase/migrations/` — Postgres schema + RLS
- `supabase/functions/` — Import and ingestion Edge Functions
- `integrations/` — Python and Cursor hook references for study repos
- `.github/workflows/` — CI and CI telemetry reporting
