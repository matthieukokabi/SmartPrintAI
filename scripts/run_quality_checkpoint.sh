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

RENDERED_ARTIFACT_DIR="docs/reports/artifacts/wave5-rendered-semantics-${TIMESTAMP}-${COMMIT_SHA}"
LIGHTHOUSE_ARTIFACT_DIR="docs/reports/artifacts/wave5-lighthouse-deterministic-${TIMESTAMP}-${COMMIT_SHA}"
TREND_ARTIFACT_DIR="docs/reports/artifacts/wave5-trend-history-${TIMESTAMP}-${COMMIT_SHA}"
TREND_HISTORY_DIR="docs/reports/artifacts/wave5-trend-history"
TREND_REPORT_FILE="docs/reports/WAVE5_TREND_GATE_${TIMESTAMP}_${COMMIT_SHA}.md"
CHECKPOINT_DIR="docs/reports/artifacts/wave5-checkpoints"
CHECKPOINT_FILE="${CHECKPOINT_DIR}/checkpoint-${TIMESTAMP}-${COMMIT_SHA}.json"
SNAPSHOT_FILE="${CHECKPOINT_DIR}/snapshot-${TIMESTAMP}-${COMMIT_SHA}.json"
SNAPSHOT_REPORT_FILE="docs/reports/WAVE5_QUALITY_SNAPSHOT_${TIMESTAMP}_${COMMIT_SHA}.md"

rendered_summary="${RENDERED_ARTIFACT_DIR}/summary.json"
lighthouse_summary="${LIGHTHOUSE_ARTIFACT_DIR}/summary.json"
trend_summary="${TREND_ARTIFACT_DIR}/summary.json"

RETENTION_DAYS="${QUALITY_CHECKPOINT_RETENTION_DAYS:-14}"
QUALITY_TREND_HISTORY_RETENTION="${QUALITY_TREND_HISTORY_RETENTION:-60}"
QUALITY_CHECKPOINT_INCLUDE_LOCAL="${QUALITY_CHECKPOINT_INCLUDE_LOCAL:-0}"
QUALITY_CHECKPOINT_INCLUDE_PROD="${QUALITY_CHECKPOINT_INCLUDE_PROD:-1}"
QUALITY_CHECKPOINT_REQUIRE_FIXTURE="${QUALITY_CHECKPOINT_REQUIRE_FIXTURE:-1}"
mkdir -p "$CHECKPOINT_DIR"

run_stage() {
  local stage_name="$1"
  shift

  set +e
  "$@"
  local status=$?
  set -e

  if [ "$status" -eq 0 ]; then
    echo "[checkpoint] ${stage_name}: PASS"
  else
    echo "[checkpoint] ${stage_name}: FAIL (exit ${status})" >&2
  fi

  return "$status"
}

rendered_status=0
lighthouse_status=0
trend_status=0

run_stage "rendered" env \
  SEO_VERIFY_INCLUDE_LOCAL="$QUALITY_CHECKPOINT_INCLUDE_LOCAL" \
  SEO_VERIFY_INCLUDE_PROD="$QUALITY_CHECKPOINT_INCLUDE_PROD" \
  SEO_VERIFY_COMMIT_SHA="$COMMIT_SHA" \
  SEO_VERIFY_ARTIFACT_DIR="$RENDERED_ARTIFACT_DIR" \
  npm run seo:verify:rendered || rendered_status=$?

run_stage "lighthouse" env \
  LIGHTHOUSE_REQUIRE_FIXTURE="$QUALITY_CHECKPOINT_REQUIRE_FIXTURE" \
  LIGHTHOUSE_ARTIFACT_DIR="$LIGHTHOUSE_ARTIFACT_DIR" \
  npm run perf:lighthouse:gate || lighthouse_status=$?

run_stage "trend" env \
  QUALITY_TREND_HISTORY_DIR="$TREND_HISTORY_DIR" \
  QUALITY_TREND_HISTORY_RETENTION="$QUALITY_TREND_HISTORY_RETENTION" \
  QUALITY_TREND_LIGHTHOUSE_SUMMARY="$lighthouse_summary" \
  QUALITY_TREND_RENDERED_SUMMARY="$rendered_summary" \
  QUALITY_TREND_ARTIFACT_DIR="$TREND_ARTIFACT_DIR" \
  QUALITY_TREND_REPORT_FILE="$TREND_REPORT_FILE" \
  npm run perf:lighthouse:trend-gate || trend_status=$?

trend_phase="unknown"
if [ -f "$trend_summary" ]; then
  trend_phase="$(node -e "const fs=require('fs');const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(data.status || 'unknown'));" "$trend_summary")"
fi

cat > "$CHECKPOINT_FILE" <<JSON
{
  "generatedAt": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "commitSha": "${COMMIT_SHA}",
  "retentionDays": ${RETENTION_DAYS},
  "trendHistoryRetention": ${QUALITY_TREND_HISTORY_RETENTION},
  "stages": {
    "rendered": {
      "status": ${rendered_status},
      "summary": "${rendered_summary}"
    },
    "lighthouse": {
      "status": ${lighthouse_status},
      "summary": "${lighthouse_summary}"
    },
    "trend": {
      "status": ${trend_status},
      "phase": "${trend_phase}",
      "summary": "${trend_summary}",
      "report": "${TREND_REPORT_FILE}"
    }
  },
  "snapshot": {
    "json": "${SNAPSHOT_FILE}",
    "report": "${SNAPSHOT_REPORT_FILE}"
  }
}
JSON

env \
  QUALITY_CHECKPOINT_FILE="$CHECKPOINT_FILE" \
  QUALITY_SNAPSHOT_JSON="$SNAPSHOT_FILE" \
  QUALITY_SNAPSHOT_REPORT="$SNAPSHOT_REPORT_FILE" \
  npm run ops:quality-snapshot

cp "$CHECKPOINT_FILE" "${CHECKPOINT_DIR}/latest.json"
cp "$SNAPSHOT_FILE" "${CHECKPOINT_DIR}/latest-snapshot.json"

if [ "$RETENTION_DAYS" -ge 1 ] 2>/dev/null; then
  find docs/reports/artifacts -maxdepth 1 -type d -name 'wave5-rendered-semantics-*' -mtime +"$RETENTION_DAYS" -exec rm -rf {} +
  find docs/reports/artifacts -maxdepth 1 -type d -name 'wave5-lighthouse-deterministic-*' -mtime +"$RETENTION_DAYS" -exec rm -rf {} +
  find docs/reports/artifacts -maxdepth 1 -type d -name 'wave5-trend-history-*' -mtime +"$RETENTION_DAYS" -exec rm -rf {} +
  find "$CHECKPOINT_DIR" -maxdepth 1 -type f -name 'checkpoint-*.json' -mtime +"$RETENTION_DAYS" -delete
  find "$CHECKPOINT_DIR" -maxdepth 1 -type f -name 'snapshot-*.json' -mtime +"$RETENTION_DAYS" -delete
  find docs/reports -maxdepth 1 -type f -name 'WAVE5_TREND_GATE_*.md' -mtime +"$RETENTION_DAYS" -delete
  find docs/reports -maxdepth 1 -type f -name 'WAVE5_QUALITY_SNAPSHOT_*.md' -mtime +"$RETENTION_DAYS" -delete
fi

echo "[checkpoint] summary: ${CHECKPOINT_FILE}"

if [ "$rendered_status" -ne 0 ] || [ "$lighthouse_status" -ne 0 ] || [ "$trend_status" -ne 0 ]; then
  exit 1
fi
