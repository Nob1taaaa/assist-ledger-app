# Assist Ledger

Assist Ledger is a final-year developer analytics project for studying pull request flow alongside **explicitly instrumented** AI and CI signals. It keeps three layers separate:

| Layer | What it is | Where it appears |
|-------|------------|------------------|
| **Live telemetry** | GitHub PR facts, Ollama and Continue token events, Cursor hook counts, Actions CI results, labeled defects | Pulse + Benchmark when **Live telemetry** mode is on |
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

## Deploy dashboard to Vercel

Deploy **only the React cockpit** (`src/`). Supabase stays on Supabase; `rag/` and Ollama stay on your laptop.

1. Push this repo (includes root `vercel.json` so Vercel treats the project as **Vite**, not multi-service Python).
2. [Vercel](https://vercel.com/new) → Import `Nob1taaaa/assist-ledger-app` → branch `main`.
3. **Application preset:** **Vite** (not “Services”). Root directory: `./`.
4. **Environment variables** (Production + Preview):

   | Name | Value |
   |------|--------|
   | `VITE_SUPABASE_URL` | `https://YOUR_PROJECT_REF.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key |

5. Deploy. Open the `.vercel.app` URL → sign in → **Live telemetry**.

6. **Supabase → Authentication → URL configuration:** add `https://YOUR_APP.vercel.app` to **Site URL** and **Redirect URLs** (`https://YOUR_APP.vercel.app/**`).

Telemetry from RAG, Cursor, Continue, and GitHub Actions still posts to **Supabase Edge Functions**; the Vercel site only reads that data.

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
npx supabase functions deploy record-continue-usage
npx supabase functions deploy record-cursor-activity
npx supabase functions deploy record-ci-run
```

### 3. Function secrets (Supabase Dashboard → Edge Functions → Secrets)

| Secret | Used by | Purpose |
|--------|---------|---------|
| `GITHUB_TOKEN` | `import-github-repository` | Optional; needed for private repos and higher rate limits |
| `ASSIST_LEDGER_INGEST_KEY` | `record-*` functions | Shared secret; clients send `x-assist-ledger-key` |
| `ASSIST_LEDGER_OWNER_ID` | `record-*` functions | UUID of your Supabase Auth user (telemetry rows attach to this user) |
| `CONTINUE_MODEL_PRICES_JSON` | `record-continue-usage` | Optional price card for calculating Continue token spend; unknown models remain unpriced |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically to Edge Functions.

### 4. Auth

Create a user in Supabase Auth (email/password). The dashboard requires sign-in; PR import uses your session JWT.

## Ollama + Python RAG (included in this repo)

The full local assistant lives in **`rag/`** — same stack as your earlier `LocalAIAgentWithRAG-Assistant` project, now bundled here.

```sh
cd rag
python3 -m pip install -r requirements.txt
cp .env.example .env
# Edit .env — Supabase ingest URL/key and ASSIST_LEDGER_REPOSITORY (owner/name on GitHub)
```

**Ollama** must be installed on your machine (`ollama pull llama3.2:3b` and `mxbai-embed-large`).

From the repo root:

```sh
npm run rag:proxy   # terminal 1 — skip if :11435/health is already ok
npm run rag:chat    # terminal 2 — interactive RAG
npm run dev         # terminal 3 — cockpit dashboard
```

See [rag/README.md](rag/README.md) for `/add`, workspaces, and commands.

**Privacy:** only token counts, model name, latency, and optional PR number are sent. Prompts, documents, and answers are not stored.

## Continue coding assistant

Continue can send token-only usage events directly to the new `record-continue-usage` function. The example config selects only `tokensGenerated` and uses Continue's `noCode` level, so prompts, completions, code, and diffs are excluded.

1. Copy [integrations/continue/config.example.yaml](integrations/continue/config.example.yaml) to `~/.continue/config.yaml`, merging its `data` entry into your current config if needed.
2. Replace the Supabase project ref, `owner/repository`, and local ingest-key placeholder.
3. Add `&pull_request_number=123` to the destination URL to attach events to a study PR. Remove it for unlinked events.
4. To calculate spend, set `CONTINUE_MODEL_PRICES_JSON` in Supabase function secrets with your models' current input/output USD rates per million tokens. Example format: `{"openai/gpt-4o":{"promptUsdPerMillion":2.5,"completionUsdPerMillion":10}}`. The numbers are examples; use current prices for your account. Without a matching rate, spend is shown as unmeasured.
5. Deploy the function and restart Continue after saving the config.

Continue's token event reports model, provider, prompt-token count, and generated-token count. It does not report billing cost, so Assist Ledger estimates spend only for models with a configured rate card. See the [Continue development-data docs](https://docs.continue.dev/customize/deep-dives/development-data) and [data config reference](https://docs.continue.dev/reference#data).

## Cursor Agent / Tab activity

Open **this repository** in Cursor. Hooks are already in [`.cursor/hooks.json`](.cursor/hooks.json); they read **`rag/.env`** and POST edit metadata to Supabase.

Hooks count edits and character deltas only — not file contents.

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
4. Use Continue with the token telemetry config — confirm **Continue calls** and tokens in Study Report, and link the active PR in its destination URL for benchmark costs.
5. Edit code in Cursor with hooks enabled — confirm **Cursor edit activity**.
6. Add `assist-ledger:defect` (or `assist-ledger:defect:N`) to a merged PR that later causes a bug or rework, then re-import the repository.
7. Open a PR and let **CI** finish — confirm **GitHub Actions CI** counts (after telemetry workflow runs).

Use **Live telemetry** in the top bar for all reporting. Use **Simulation / Demo** only for UI exploration.

## Known limitations

- GitHub **list pulls** API may return `0` changed lines until per-PR detail fetching is added (redeploy `import-github-repository` after updates).
- Live benchmark compares only PRs with explicit study labels; small samples are descriptive, not causal.
- Cursor hooks depend on local Cursor configuration; they do not run in the browser dashboard.
- `ASSIST_LEDGER_OWNER_ID` must match the user you use to sign in, or telemetry rows will not appear under your account.
- No GitHub webhook receiver is deployed yet; import is on-demand from the UI.

## Study mini project (test import + CI)

Folder **`study-mini/`** is a tiny standalone app you can push to its own GitHub repo and import into the cockpit. See [study-mini/README.md](study-mini/README.md) and run:

```sh
./study-mini/scripts/publish-to-github.sh Nob1taaaa/assist-ledger-study-mini
```

## Repository layout (everything in one project)

| Path | Role |
|------|------|
| `study-mini/` | **Optional** mini repo for PR/CI/Benchmark testing |
| `src/` | React **telemetry cockpit** (Pulse, Benchmark, Ingestion, Study Report) |
| `rag/` | **Ollama RAG** assistant + `ollama_telemetry_proxy.py` + `assist_ledger.py` |
| `supabase/` | **Backend** migrations + Edge Functions (deploy to Supabase cloud) |
| `.cursor/` | **Cursor hooks** for this monorepo (uses `rag/.env`) |
| `integrations/` | Legacy copy-paste samples (prefer `rag/` instead) |
| `.github/workflows/` | CI build + optional CI telemetry to Supabase |

**Ollama** itself is system software (not in git). **Supabase** is your cloud project linked via CLI + secrets.
