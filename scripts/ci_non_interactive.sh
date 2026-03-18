#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -s /root/.nvm/nvm.sh ]; then
  # shellcheck source=/dev/null
  . /root/.nvm/nvm.sh
fi

echo "[1/10] Lint"
npm run lint -- --no-cache

echo "[2/10] Build"
npm run build

echo "[3/10] Rendered head assertions"
npm run seo:assert:rendered

echo "[4/10] Rendered head + trust verification harness"
npm run seo:verify:rendered

echo "[5/10] Deploy retry tests"
npm run test:deploy:vps

echo "[6/10] Trend gate unit tests"
npm run test:quality:trend

echo "[7/10] SEO quality gates"
npm run test:seo:gates

echo "[8/10] Lighthouse budget gate"
npm run perf:lighthouse:gate

echo "[9/10] Lighthouse trend gate"
npm run perf:lighthouse:trend-gate

echo "[10/10] Tests"
if [ "$(npm pkg get scripts.test | tr -d " \"")" != "null" ]; then
  npm test
else
  echo "No npm test script found; skipping tests."
fi

echo "CI non-interactive checks completed."
