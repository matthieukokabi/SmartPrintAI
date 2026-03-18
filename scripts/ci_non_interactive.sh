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

echo "[1/12] Lint"
npm run lint -- --no-cache

echo "[2/12] Build"
npm run build

echo "[3/12] Rendered head assertions"
npm run seo:assert:rendered

echo "[4/12] Rendered head + trust verification harness"
SEO_VERIFY_INCLUDE_LOCAL=0 \
SEO_VERIFY_INCLUDE_PROD=1 \
SEO_VERIFY_COMMIT_SHA="$COMMIT_SHA" \
SEO_VERIFY_ARTIFACT_DIR="$RENDERED_ARTIFACT_DIR" \
npm run seo:verify:rendered

echo "[5/12] Deploy retry tests"
npm run test:deploy:vps

echo "[6/12] Trend gate unit tests"
npm run test:quality:trend

echo "[7/12] CI guardrail unit tests"
npm run test:quality:ci-guardrails

echo "[8/12] SEO quality gates"
npm run test:seo:gates

echo "[9/12] Lighthouse budget gate"
LIGHTHOUSE_REQUIRE_FIXTURE=1 \
LIGHTHOUSE_ARTIFACT_DIR="$LIGHTHOUSE_ARTIFACT_DIR" \
npm run perf:lighthouse:gate

echo "[10/12] Lighthouse trend gate"
QUALITY_TREND_HISTORY_DIR="$TREND_HISTORY_DIR" \
QUALITY_TREND_LIGHTHOUSE_SUMMARY="${LIGHTHOUSE_ARTIFACT_DIR}/summary.json" \
QUALITY_TREND_RENDERED_SUMMARY="${RENDERED_ARTIFACT_DIR}/summary.json" \
QUALITY_TREND_ARTIFACT_DIR="$TREND_ARTIFACT_DIR" \
QUALITY_TREND_REPORT_FILE="$TREND_REPORT_FILE" \
npm run perf:lighthouse:trend-gate

echo "[11/12] CI release guardrails"
CI_GUARD_LIGHTHOUSE_SUMMARY="${LIGHTHOUSE_ARTIFACT_DIR}/summary.json" \
CI_GUARD_RENDERED_SUMMARY="${RENDERED_ARTIFACT_DIR}/summary.json" \
CI_GUARD_TREND_SUMMARY="${TREND_ARTIFACT_DIR}/summary.json" \
npm run ci:quality:guardrails

echo "[12/12] Tests"
if [ "$(npm pkg get scripts.test | tr -d " \"")" != "null" ]; then
  npm test
else
  echo "No npm test script found; skipping tests."
fi

echo "CI non-interactive checks completed."
