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
CONVERSION_ARTIFACT_DIR="docs/reports/artifacts/wave6-conversion-insights-${TIMESTAMP}-${COMMIT_SHA}"
CONVERSION_REPORT_FILE="docs/reports/WAVE6_CONVERSION_INSIGHTS_${TIMESTAMP}_${COMMIT_SHA}.md"
ALERT_ARTIFACT_DIR="docs/reports/artifacts/wave6-alerts-${TIMESTAMP}-${COMMIT_SHA}"
ALERT_REPORT_FILE="docs/reports/WAVE6_ALERTS_${TIMESTAMP}_${COMMIT_SHA}.md"
ALERT_STATE_FILE="docs/reports/artifacts/wave6-alert-state/state.json"
CHECKPOINT_DIR="docs/reports/artifacts/wave5-checkpoints"
CHECKPOINT_FILE="${CHECKPOINT_DIR}/checkpoint-${TIMESTAMP}-${COMMIT_SHA}.json"
SNAPSHOT_FILE="${CHECKPOINT_DIR}/snapshot-${TIMESTAMP}-${COMMIT_SHA}.json"
SNAPSHOT_REPORT_FILE="docs/reports/WAVE5_QUALITY_SNAPSHOT_${TIMESTAMP}_${COMMIT_SHA}.md"

rendered_summary="${RENDERED_ARTIFACT_DIR}/summary.json"
lighthouse_summary="${LIGHTHOUSE_ARTIFACT_DIR}/summary.json"
trend_summary="${TREND_ARTIFACT_DIR}/summary.json"
conversion_summary="${CONVERSION_ARTIFACT_DIR}/summary.json"
alert_summary="${ALERT_ARTIFACT_DIR}/summary.json"

RETENTION_DAYS="${QUALITY_CHECKPOINT_RETENTION_DAYS:-14}"
QUALITY_TREND_HISTORY_RETENTION="${QUALITY_TREND_HISTORY_RETENTION:-60}"
QUALITY_CHECKPOINT_INCLUDE_LOCAL="${QUALITY_CHECKPOINT_INCLUDE_LOCAL:-0}"
QUALITY_CHECKPOINT_INCLUDE_PROD="${QUALITY_CHECKPOINT_INCLUDE_PROD:-1}"
QUALITY_CHECKPOINT_REQUIRE_FIXTURE="${QUALITY_CHECKPOINT_REQUIRE_FIXTURE:-1}"
QUALITY_CHECKPOINT_LIGHTHOUSE_RESOLVER="${QUALITY_CHECKPOINT_LIGHTHOUSE_RESOLVER:-${ROOT_DIR}/scripts/resolve_lighthouse_chrome_path.sh}"
QUALITY_CHECKPOINT_DB_MAX_RETRIES_RAW="${QUALITY_CHECKPOINT_DB_MAX_RETRIES:-3}"
QUALITY_CHECKPOINT_DB_RETRY_BACKOFF_SECONDS_RAW="${QUALITY_CHECKPOINT_DB_RETRY_BACKOFF_SECONDS:-5}"
QUALITY_CHECKPOINT_STRICT_NON_CRITICAL="${QUALITY_CHECKPOINT_STRICT_NON_CRITICAL:-0}"
mkdir -p "$CHECKPOINT_DIR"

normalize_positive_int() {
  local raw_value="$1"
  local fallback="$2"
  if [[ "$raw_value" =~ ^[0-9]+$ ]] && [ "$raw_value" -ge 1 ]; then
    printf '%s' "$raw_value"
    return
  fi

  printf '%s' "$fallback"
}

QUALITY_CHECKPOINT_DB_MAX_RETRIES="$(normalize_positive_int "$QUALITY_CHECKPOINT_DB_MAX_RETRIES_RAW" 3)"
QUALITY_CHECKPOINT_DB_RETRY_BACKOFF_SECONDS="$(normalize_positive_int "$QUALITY_CHECKPOINT_DB_RETRY_BACKOFF_SECONDS_RAW" 5)"
if [ "$QUALITY_CHECKPOINT_STRICT_NON_CRITICAL" != "1" ]; then
  QUALITY_CHECKPOINT_STRICT_NON_CRITICAL="0"
fi

EXIT_CRITICAL_RENDERED=11
EXIT_CRITICAL_LIGHTHOUSE=12
EXIT_CRITICAL_TREND=13
EXIT_NON_CRITICAL_CONVERSION=41
EXIT_NON_CRITICAL_ALERTS=42

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

run_stage_with_retry() {
  local stage_name="$1"
  local max_attempts="$2"
  local backoff_seconds="$3"
  shift 3

  local attempt=1
  local status=0
  while [ "$attempt" -le "$max_attempts" ]; do
    local labeled_stage="$stage_name"
    if [ "$max_attempts" -gt 1 ]; then
      labeled_stage="${stage_name} (attempt ${attempt}/${max_attempts})"
    fi

    run_stage "$labeled_stage" "$@" && return 0
    status=$?

    if [ "$attempt" -ge "$max_attempts" ]; then
      return "$status"
    fi

    local sleep_seconds=$((backoff_seconds * attempt))
    echo "[checkpoint] ${stage_name}: retrying in ${sleep_seconds}s (next attempt $((attempt + 1))/${max_attempts})" >&2
    sleep "$sleep_seconds"
    attempt=$((attempt + 1))
  done

  return "$status"
}

stage_hint() {
  local stage_name="$1"
  case "$stage_name" in
    rendered)
      printf '%s' "Check rendered harness connectivity/HTML assertions and re-run with SEO_VERIFY_INCLUDE_PROD=1."
      ;;
    lighthouse)
      printf '%s' "Review Lighthouse runtime preflight, fixture resolution, and rerun perf:lighthouse:gate."
      ;;
    trend)
      printf '%s' "Inspect trend summary findings/warmup lifecycle and verify history artifact continuity."
      ;;
    conversion)
      printf '%s' "Verify DATABASE_URL/runtime DB reachability or seed CONVERSION_INSIGHTS_CACHE_FILE for fallback."
      ;;
    alerts)
      printf '%s' "Check QUALITY_ALERT_* inputs and ensure trend/conversion summaries exist before alert stage."
      ;;
    *)
      printf '%s' "Review stage logs and rerun checkpoint with verbose artifacts."
      ;;
  esac
}

rendered_status=0
lighthouse_status=0
trend_status=0
conversion_status=0
alert_status=0
lighthouse_runtime_status="unknown"
lighthouse_runtime_path=""

run_stage "rendered" env \
  SEO_VERIFY_INCLUDE_LOCAL="$QUALITY_CHECKPOINT_INCLUDE_LOCAL" \
  SEO_VERIFY_INCLUDE_PROD="$QUALITY_CHECKPOINT_INCLUDE_PROD" \
  SEO_VERIFY_COMMIT_SHA="$COMMIT_SHA" \
  SEO_VERIFY_ARTIFACT_DIR="$RENDERED_ARTIFACT_DIR" \
  npm run seo:verify:rendered || rendered_status=$?

if [ ! -x "$QUALITY_CHECKPOINT_LIGHTHOUSE_RESOLVER" ]; then
  lighthouse_runtime_status="resolver_missing"
  lighthouse_status=65
  echo "[checkpoint] lighthouse preflight: FAIL (resolver not executable: ${QUALITY_CHECKPOINT_LIGHTHOUSE_RESOLVER})" >&2
else
  set +e
  lighthouse_runtime_path="$("$QUALITY_CHECKPOINT_LIGHTHOUSE_RESOLVER")"
  lighthouse_status=$?
  set -e

  if [ "$lighthouse_status" -ne 0 ]; then
    lighthouse_runtime_status="missing_binary"
    echo "[checkpoint] lighthouse preflight: FAIL (exit ${lighthouse_status})" >&2
  else
    lighthouse_runtime_status="ready"
    echo "[checkpoint] lighthouse preflight: resolved browser at ${lighthouse_runtime_path}"
    run_stage "lighthouse" env \
      LIGHTHOUSE_CHROME_PATH="$lighthouse_runtime_path" \
      LIGHTHOUSE_REQUIRE_FIXTURE="$QUALITY_CHECKPOINT_REQUIRE_FIXTURE" \
      LIGHTHOUSE_ARTIFACT_DIR="$LIGHTHOUSE_ARTIFACT_DIR" \
      npm run perf:lighthouse:gate || lighthouse_status=$?
  fi
fi

run_stage "trend" env \
  QUALITY_TREND_HISTORY_DIR="$TREND_HISTORY_DIR" \
  QUALITY_TREND_HISTORY_RETENTION="$QUALITY_TREND_HISTORY_RETENTION" \
  QUALITY_TREND_LIGHTHOUSE_SUMMARY="$lighthouse_summary" \
  QUALITY_TREND_RENDERED_SUMMARY="$rendered_summary" \
  QUALITY_TREND_ARTIFACT_DIR="$TREND_ARTIFACT_DIR" \
  QUALITY_TREND_REPORT_FILE="$TREND_REPORT_FILE" \
  npm run perf:lighthouse:trend-gate || trend_status=$?

run_stage_with_retry "conversion" "$QUALITY_CHECKPOINT_DB_MAX_RETRIES" "$QUALITY_CHECKPOINT_DB_RETRY_BACKOFF_SECONDS" env \
  CONVERSION_INSIGHTS_COMMIT_SHA="$COMMIT_SHA" \
  CONVERSION_INSIGHTS_ARTIFACT_DIR="$CONVERSION_ARTIFACT_DIR" \
  CONVERSION_INSIGHTS_REPORT_FILE="$CONVERSION_REPORT_FILE" \
  npm run ops:conversion-insights || conversion_status=$?

run_stage "alerts" env \
  QUALITY_ALERT_COMMIT_SHA="$COMMIT_SHA" \
  QUALITY_ALERT_TREND_SUMMARY="$trend_summary" \
  QUALITY_ALERT_CONVERSION_SUMMARY="$conversion_summary" \
  QUALITY_ALERT_STATE_FILE="$ALERT_STATE_FILE" \
  QUALITY_ALERT_ARTIFACT_DIR="$ALERT_ARTIFACT_DIR" \
  QUALITY_ALERT_REPORT_FILE="$ALERT_REPORT_FILE" \
  npm run ops:alerts:tune || alert_status=$?

trend_phase="unknown"
if [ -f "$trend_summary" ]; then
  trend_phase="$(node -e "const fs=require('fs');const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(data.status || 'unknown'));" "$trend_summary")"
fi

conversion_warning=0
alerts_warning=0
if [ "$conversion_status" -ne 0 ]; then
  conversion_warning=1
fi
if [ "$alert_status" -ne 0 ]; then
  alerts_warning=1
fi

cat > "$CHECKPOINT_FILE" <<JSON
{
  "generatedAt": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "commitSha": "${COMMIT_SHA}",
  "retentionDays": ${RETENTION_DAYS},
  "trendHistoryRetention": ${QUALITY_TREND_HISTORY_RETENTION},
  "executionPolicy": {
    "dbRetry": {
      "maxAttempts": ${QUALITY_CHECKPOINT_DB_MAX_RETRIES},
      "baseBackoffSeconds": ${QUALITY_CHECKPOINT_DB_RETRY_BACKOFF_SECONDS}
    },
    "strictNonCritical": ${QUALITY_CHECKPOINT_STRICT_NON_CRITICAL}
  },
  "stages": {
    "rendered": {
      "status": ${rendered_status},
      "summary": "${rendered_summary}"
    },
    "lighthouse": {
      "status": ${lighthouse_status},
      "runtime": {
        "status": "${lighthouse_runtime_status}",
        "chromePath": "${lighthouse_runtime_path}"
      },
      "summary": "${lighthouse_summary}"
    },
    "trend": {
      "status": ${trend_status},
      "phase": "${trend_phase}",
      "summary": "${trend_summary}",
      "report": "${TREND_REPORT_FILE}"
    },
    "conversion": {
      "status": ${conversion_status},
      "summary": "${conversion_summary}",
      "report": "${CONVERSION_REPORT_FILE}"
    },
    "alerts": {
      "status": ${alert_status},
      "summary": "${alert_summary}",
      "report": "${ALERT_REPORT_FILE}",
      "state": "${ALERT_STATE_FILE}"
    }
  },
  "warnings": {
    "conversion": {
      "present": ${conversion_warning},
      "status": ${conversion_status},
      "hint": "$(stage_hint conversion)"
    },
    "alerts": {
      "present": ${alerts_warning},
      "status": ${alert_status},
      "hint": "$(stage_hint alerts)"
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
  find docs/reports/artifacts -maxdepth 1 -type d -name 'wave6-conversion-insights-*' -mtime +"$RETENTION_DAYS" -exec rm -rf {} +
  find docs/reports/artifacts -maxdepth 1 -type d -name 'wave6-alerts-*' -mtime +"$RETENTION_DAYS" -exec rm -rf {} +
  find "$CHECKPOINT_DIR" -maxdepth 1 -type f -name 'checkpoint-*.json' -mtime +"$RETENTION_DAYS" -delete
  find "$CHECKPOINT_DIR" -maxdepth 1 -type f -name 'snapshot-*.json' -mtime +"$RETENTION_DAYS" -delete
  find docs/reports -maxdepth 1 -type f -name 'WAVE5_TREND_GATE_*.md' -mtime +"$RETENTION_DAYS" -delete
  find docs/reports -maxdepth 1 -type f -name 'WAVE5_QUALITY_SNAPSHOT_*.md' -mtime +"$RETENTION_DAYS" -delete
  find docs/reports -maxdepth 1 -type f -name 'WAVE6_CONVERSION_INSIGHTS_*.md' -mtime +"$RETENTION_DAYS" -delete
  find docs/reports -maxdepth 1 -type f -name 'WAVE6_ALERTS_*.md' -mtime +"$RETENTION_DAYS" -delete
fi

echo "[checkpoint] summary: ${CHECKPOINT_FILE}"

if [ "$conversion_status" -ne 0 ]; then
  echo "[checkpoint] warning: conversion stage failed (exit ${conversion_status}). $(stage_hint conversion)" >&2
fi
if [ "$alert_status" -ne 0 ]; then
  echo "[checkpoint] warning: alerts stage failed (exit ${alert_status}). $(stage_hint alerts)" >&2
fi

if [ "$rendered_status" -ne 0 ]; then
  echo "[checkpoint] critical failure: rendered stage failed (exit ${rendered_status}). $(stage_hint rendered)" >&2
  exit "$EXIT_CRITICAL_RENDERED"
fi
if [ "$lighthouse_status" -ne 0 ]; then
  echo "[checkpoint] critical failure: lighthouse stage failed (exit ${lighthouse_status}). $(stage_hint lighthouse)" >&2
  exit "$EXIT_CRITICAL_LIGHTHOUSE"
fi
if [ "$trend_status" -ne 0 ]; then
  echo "[checkpoint] critical failure: trend stage failed (exit ${trend_status}). $(stage_hint trend)" >&2
  exit "$EXIT_CRITICAL_TREND"
fi

if [ "$QUALITY_CHECKPOINT_STRICT_NON_CRITICAL" = "1" ]; then
  if [ "$conversion_status" -ne 0 ]; then
    exit "$EXIT_NON_CRITICAL_CONVERSION"
  fi
  if [ "$alert_status" -ne 0 ]; then
    exit "$EXIT_NON_CRITICAL_ALERTS"
  fi
elif [ "$conversion_status" -ne 0 ] || [ "$alert_status" -ne 0 ]; then
  echo "[checkpoint] completed with non-critical warnings (strict mode disabled)." >&2
fi
