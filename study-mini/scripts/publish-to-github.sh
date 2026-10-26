#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-Nob1taaaa/assist-ledger-study-mini}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="/tmp/assist-ledger-study-mini-publish"
rm -rf "$STAGE"
mkdir -p "$STAGE"
rsync -a --exclude node_modules --exclude dist --exclude .DS_Store "$ROOT/" "$STAGE/"

cd "$STAGE"
if [[ ! -d .git ]]; then
  git init -b main
  git add .
  git commit -m "Initial Assist Ledger study mini project."
fi

if gh repo view "$REPO" >/dev/null 2>&1; then
  echo "Repo $REPO exists — pushing main"
  git remote remove origin 2>/dev/null || true
  git remote add origin "https://github.com/${REPO}.git"
  git push -u origin main --force
else
  echo "Creating $REPO"
  gh repo create "$REPO" --private --source=. --remote=origin --push
fi

echo ""
echo "Done. Import in Assist Ledger: $REPO"
echo "Add GitHub Actions secrets/vars (see study-mini/README.md)."
