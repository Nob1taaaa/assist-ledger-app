# Assist Ledger study protocol

## What GitHub provides

GitHub pull request metadata includes title, author login, state, timestamps, and (when available) changed line counts. **GitHub does not report whether AI wrote the code**, model token usage, or IDE edit sources.

## Declaring study groups

Label study pull requests with **exactly one** of:

- `assist-ledger:ai-assisted` — a coding assistant contributed to implementation.
- `assist-ledger:human-only` — no generative coding assistant was used for implementation.

The importer maps these labels to `study_group` in Supabase. Unlabelled PRs remain ungrouped and are excluded from live benchmark comparisons.

## Measured signals (not inferred)

| Signal | Source | Stored content |
|--------|--------|----------------|
| PR metadata | GitHub API via `import-github-repository` | Facts returned by GitHub |
| Local Ollama usage | `record-model-usage` from your RAG app | Token counts, model name, latency — **no prompts** |
| Cursor edits | `record-cursor-activity` via Cursor hooks | Edit counts and character deltas — **no file contents** |
| CI outcomes | `record-ci-run` from GitHub Actions | Workflow conclusion, duration, PR numbers |

## Ethics and limits

- Do not treat PR author as proof of human-only authorship.
- Do not compare AI vs human groups without explicit labels and sufficient sample size.
- Simulation mode in the dashboard is labelled and must not be cited as study data.
