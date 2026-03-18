#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -s /root/.nvm/nvm.sh ]; then
  # shellcheck source=/dev/null
  . /root/.nvm/nvm.sh
fi

echo "[1/7] Lint"
npm run lint -- --no-cache

echo "[2/7] Build"
npm run build

echo "[3/7] Rendered head assertions"
npm run seo:assert:rendered

echo "[4/7] Deploy retry tests"
npm run test:deploy:vps

echo "[5/7] SEO quality gates"
npm run test:seo:gates

echo "[6/7] Lighthouse budget gate"
npm run perf:lighthouse:gate

echo "[7/7] Tests"
if [ "$(npm pkg get scripts.test | tr -d " \"")" != "null" ]; then
  npm test
else
  echo "No npm test script found; skipping tests."
fi

echo "CI non-interactive checks completed."
