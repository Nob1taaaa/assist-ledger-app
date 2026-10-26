#!/usr/bin/env bash
# Interactive Continue session for Assist Ledger telemetry (tokens → record-continue-usage).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! curl -sf http://127.0.0.1:11435/health >/dev/null; then
  echo "Start the Ollama telemetry proxy first: npm run rag:proxy"
  exit 1
fi

echo "Continue → Supabase telemetry is configured in ~/.continue/config.yaml (data: block)."
echo "After you chat, open Pulse → Refresh on Nob1taaaa/assist-ledger-app (Live mode)."
echo ""

npx @continuedev/cli@1.5.47 \
  --config "${HOME}/.continue/config.yaml" \
  --add-dir "${ROOT}/src" \
  --add-dir "${ROOT}/rag" \
  --readonly \
  --exclude Fetch --exclude Git --exclude Bash --exclude Edit --exclude Write --exclude Terminal --exclude Grep
