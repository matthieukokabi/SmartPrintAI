#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -s /root/.nvm/nvm.sh ]; then
  # shellcheck source=/dev/null
  . /root/.nvm/nvm.sh
fi

TIMESTAMP="$(date -u '+%Y-%m-%d_%H-%M-%S')"
COMMIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
RENDERED_ARTIFACT_DIR="docs/reports/artifacts/wave5-rendered-semantics-ci-${TIMESTAMP}-${COMMIT_SHA}"
LIGHTHOUSE_ARTIFACT_DIR="docs/reports/artifacts/wave5-lighthouse-deterministic-ci-${TIMESTAMP}-${COMMIT_SHA}"
TREND_ARTIFACT_DIR="docs/reports/artifacts/wave5-trend-history-ci-${TIMESTAMP}-${COMMIT_SHA}"
TREND_REPORT_FILE="docs/reports/WAVE5_TREND_GATE_CI_${TIMESTAMP}_${COMMIT_SHA}.md"
TREND_HISTORY_DIR="docs/reports/artifacts/wave5-trend-history"
MOCKUP_QUALITY_ARTIFACT_DIR="docs/reports/artifacts/wave9-mockup-quality-ci-${TIMESTAMP}-${COMMIT_SHA}"
CI_GUARD_MOCKUP_BASE_URL="${CI_GUARD_MOCKUP_BASE_URL:-https://smartprintai.com}"
CI_GUARD_STRICT_MOCKUP_SMOKE="${CI_GUARD_STRICT_MOCKUP_SMOKE:-0}"

echo "[1/13] Lint"
npm run lint -- --no-cache

echo "[2/13] Build"
npm run build

echo "[3/13] Rendered head assertions"
npm run seo:assert:rendered

echo "[4/13] Rendered head + trust verification harness"
SEO_VERIFY_INCLUDE_LOCAL=0 \
SEO_VERIFY_INCLUDE_PROD=1 \
SEO_VERIFY_COMMIT_SHA="$COMMIT_SHA" \
SEO_VERIFY_ARTIFACT_DIR="$RENDERED_ARTIFACT_DIR" \
npm run seo:verify:rendered

echo "[5/13] Deploy retry tests"
npm run test:deploy:vps

echo "[6/13] Trend gate unit tests"
npm run test:quality:trend

echo "[7/13] CI guardrail unit tests"
npm run test:quality:ci-guardrails

echo "[8/13] SEO quality gates"
npm run test:seo:gates

echo "[9/13] Lighthouse budget gate"
LIGHTHOUSE_REQUIRE_FIXTURE=1 \
LIGHTHOUSE_ARTIFACT_DIR="$LIGHTHOUSE_ARTIFACT_DIR" \
npm run perf:lighthouse:gate

echo "[10/13] Lighthouse trend gate"
QUALITY_TREND_HISTORY_DIR="$TREND_HISTORY_DIR" \
QUALITY_TREND_LIGHTHOUSE_SUMMARY="${LIGHTHOUSE_ARTIFACT_DIR}/summary.json" \
QUALITY_TREND_RENDERED_SUMMARY="${RENDERED_ARTIFACT_DIR}/summary.json" \
QUALITY_TREND_ARTIFACT_DIR="$TREND_ARTIFACT_DIR" \
QUALITY_TREND_REPORT_FILE="$TREND_REPORT_FILE" \
npm run perf:lighthouse:trend-gate

echo "[11/13] Mockup quality smoke (non-critical by default)"
set +e
MOCKUP_SMOKE_BASE_URL="$CI_GUARD_MOCKUP_BASE_URL" \
MOCKUP_SMOKE_REPORT_FILE="${MOCKUP_QUALITY_ARTIFACT_DIR}/summary.json" \
npm run ops:mockup-quality:smoke
mockup_smoke_status=$?
set -e

if [ "$mockup_smoke_status" -ne 0 ]; then
  if [ "$CI_GUARD_STRICT_MOCKUP_SMOKE" = "1" ]; then
    echo "Mockup-quality smoke failed with strict mode enabled (exit ${mockup_smoke_status})." >&2
    exit "$mockup_smoke_status"
  fi
  echo "Warning: mockup-quality smoke failed (exit ${mockup_smoke_status}); continuing because CI_GUARD_STRICT_MOCKUP_SMOKE=0." >&2
fi

echo "[12/13] CI release guardrails"
CI_GUARD_LIGHTHOUSE_SUMMARY="${LIGHTHOUSE_ARTIFACT_DIR}/summary.json" \
CI_GUARD_RENDERED_SUMMARY="${RENDERED_ARTIFACT_DIR}/summary.json" \
CI_GUARD_TREND_SUMMARY="${TREND_ARTIFACT_DIR}/summary.json" \
npm run ci:quality:guardrails

echo "[13/13] Tests"
if [ "$(npm pkg get scripts.test | tr -d " \"")" != "null" ]; then
  npm test
else
  echo "No npm test script found; skipping tests."
fi

echo "CI non-interactive checks completed."
