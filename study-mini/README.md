# Assist Ledger Study Mini

Tiny standalone project to **test** [Assist Ledger](https://github.com/Nob1taaaa/assist-ledger-app):

- GitHub **pull request import**
- **CI** + optional **CI telemetry** to Supabase
- Study **labels** for Benchmark

## What’s inside

| Piece | Purpose |
|-------|---------|
| `index.html` | Minimal static “app” |
| `npm test` / `npm run build` | CI jobs |
| `.github/workflows/ci.yml` | Runs on every PR |
| `.github/workflows/telemetry.yml` | Reports PR CI to Assist Ledger (needs secrets) |

## Push as its own GitHub repo (recommended)

From your Mac:

```bash
cd /Users/harshitshah/assist-ledger/study-mini
./scripts/publish-to-github.sh Nob1taaaa/assist-ledger-study-mini
```

This copies a clean tree to `/tmp`, creates the repo if needed, and pushes.

Or manually:

```bash
rsync -a --exclude node_modules /Users/harshitshah/assist-ledger/study-mini/ /tmp/assist-ledger-study-mini/
cd /tmp/assist-ledger-study-mini
git init && git add . && git commit -m "Initial study mini project for Assist Ledger"
gh repo create Nob1taaaa/assist-ledger-study-mini --private --source=. --remote=origin --push
```

## GitHub secrets (copy from `assist-ledger-app`)

Repo → **Settings → Secrets and variables → Actions**

| Secret / variable | Same as main app |
|-------------------|------------------|
| `ASSIST_LEDGER_INGEST_KEY` | secret |
| `ASSIST_LEDGER_SUPABASE_URL` | variable |
| `SUPABASE_PUBLISHABLE_KEY` | variable |

## Create study labels (once per repo)

```bash
gh label create "assist-ledger:ai-assisted" --color "0E8A16" --repo Nob1taaaa/assist-ledger-study-mini
gh label create "assist-ledger:human-only" --color "1D76DB" --repo Nob1taaaa/assist-ledger-study-mini
```

## Open a test PR

```bash
cd /tmp/assist-ledger-study-mini   # or your clone
git checkout -b test/assist-ledger-demo
echo "<!-- demo -->" >> index.html
git add index.html && git commit -m "chore: demo PR for Assist Ledger"
git push -u origin test/assist-ledger-demo
gh pr create --title "Study mini demo PR" --label "assist-ledger:ai-assisted"
```

## Test in Assist Ledger

1. Open https://assist-ledger-app.vercel.app (or local dashboard).
2. **Live telemetry** → **Ingestion Hub** → import `Nob1taaaa/assist-ledger-study-mini`.
3. **Pulse** → **Refresh** → see PRs + CI after workflow runs.
4. Point `rag/.env` → `ASSIST_LEDGER_REPOSITORY=Nob1taaaa/assist-ledger-study-mini` for local model telemetry on the same repo.

## Local verify

```bash
npm test
npm run build
```
