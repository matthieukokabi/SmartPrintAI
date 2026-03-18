#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -s /root/.nvm/nvm.sh ]; then
  # shellcheck source=/dev/null
  . /root/.nvm/nvm.sh
fi

echo "[1/5] Lint"
npm run lint -- --no-cache

echo "[2/5] Build"
npm run build

echo "[3/5] Rendered head assertions"
npm run seo:assert:rendered

echo "[4/5] SEO quality gates"
npm run test:seo:gates

echo "[5/5] Tests"
if [ "$(npm pkg get scripts.test | tr -d " \"")" != "null" ]; then
  npm test
else
  echo "No npm test script found; skipping tests."
fi

echo "CI non-interactive checks completed."
