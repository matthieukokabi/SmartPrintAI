#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CHECKPOINT_SCRIPT="${ROOT_DIR}/scripts/run_quality_checkpoint.sh"

assert_eq() {
  local actual="$1"
  local expected="$2"
  local message="$3"
  if [ "$actual" != "$expected" ]; then
    echo "ASSERTION FAILED: ${message}. expected='${expected}' actual='${actual}'" >&2
    exit 1
  fi
}

json_value() {
  local file_path="$1"
  local path_expr="$2"
  node -e "const fs=require('fs');const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const keys=process.argv[2].split('.');let cur=data;for(const key of keys){if(cur===undefined||cur===null){process.exit(2);}const match=key.match(/^([^[\\]]+)\\[(\\d+)\\]$/);if(match){cur=cur[match[1]]?.[Number(match[2])];}else{cur=cur[key];}}if(cur===undefined){process.exit(2);}process.stdout.write(String(cur));" "$file_path" "$path_expr"
}

setup_fixture_repo() {
  local tmp_dir="$1"

  mkdir -p "${tmp_dir}/scripts" "${tmp_dir}/docs/reports" "${tmp_dir}/docs/reports/artifacts" "${tmp_dir}/bin" "${tmp_dir}/state"
  cp "$CHECKPOINT_SCRIPT" "${tmp_dir}/scripts/run_quality_checkpoint.sh"
  chmod +x "${tmp_dir}/scripts/run_quality_checkpoint.sh"

  cat > "${tmp_dir}/bin/npm" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

if [ "${1:-}" != "run" ]; then
  echo "unsupported npm invocation: $*" >&2
  exit 97
fi

script_name="${2:-}"
if [ -z "$script_name" ]; then
  echo "missing script name" >&2
  exit 98
fi

state_dir="${CHECKPOINT_TEST_STATE_DIR:?}"
mkdir -p "$state_dir"
safe_name="$(printf '%s' "$script_name" | tr ':/-' '_')"
attempt_file="${state_dir}/attempt_${safe_name}.txt"
attempt=1
if [ -f "$attempt_file" ]; then
  attempt=$(( $(cat "$attempt_file") + 1 ))
fi
printf '%s' "$attempt" > "$attempt_file"

if [ "${CHECKPOINT_TEST_FAIL_ALWAYS_SCRIPT:-}" = "$script_name" ]; then
  exit 19
fi
if [ "${CHECKPOINT_TEST_FAIL_ONCE_SCRIPT:-}" = "$script_name" ] && [ "$attempt" -eq 1 ]; then
  exit 9
fi

case "$script_name" in
  seo:verify:rendered)
    mkdir -p "$SEO_VERIFY_ARTIFACT_DIR"
    cat > "${SEO_VERIFY_ARTIFACT_DIR}/summary.json" <<JSON
{"failures":[],"targets":[]}
JSON
    ;;
  perf:lighthouse:gate)
    mkdir -p "$LIGHTHOUSE_ARTIFACT_DIR"
    cat > "${LIGHTHOUSE_ARTIFACT_DIR}/summary.json" <<JSON
{"failures":[],"routeResults":[],"productDetailResolution":{"strategy":"fixture","resolvedPath":"/products/fixture","sourcePath":"/products/fixture"}}
JSON
    ;;
  perf:lighthouse:trend-gate)
    mkdir -p "$QUALITY_TREND_ARTIFACT_DIR" "$(dirname "$QUALITY_TREND_REPORT_FILE")"
    cat > "${QUALITY_TREND_ARTIFACT_DIR}/summary.json" <<JSON
{"status":"pass","warmup":{"active":false},"findings":[]}
JSON
    printf '# trend\n' > "$QUALITY_TREND_REPORT_FILE"
    ;;
  ops:conversion-insights)
    mkdir -p "$CONVERSION_INSIGHTS_ARTIFACT_DIR" "$(dirname "$CONVERSION_INSIGHTS_REPORT_FILE")"
    cat > "${CONVERSION_INSIGHTS_ARTIFACT_DIR}/summary.json" <<JSON
{"status":"ok","totals":{"generatedCount":12,"purchaseCount":3,"conversionRate":0.25},"anomalies":[]}
JSON
    printf '# conversion\n' > "$CONVERSION_INSIGHTS_REPORT_FILE"
    ;;
  ops:alerts:tune)
    mkdir -p "$QUALITY_ALERT_ARTIFACT_DIR" "$(dirname "$QUALITY_ALERT_REPORT_FILE")" "$(dirname "$QUALITY_ALERT_STATE_FILE")"
    cat > "${QUALITY_ALERT_ARTIFACT_DIR}/summary.json" <<JSON
{"generatedAt":"2026-03-18T00:00:00.000Z","alerts":[]}
JSON
    cat > "$QUALITY_ALERT_STATE_FILE" <<JSON
{"lastUpdated":"2026-03-18T00:00:00.000Z","alerts":[]}
JSON
    printf '# alerts\n' > "$QUALITY_ALERT_REPORT_FILE"
    ;;
  ops:quality-snapshot)
    mkdir -p "$(dirname "$QUALITY_SNAPSHOT_JSON")" "$(dirname "$QUALITY_SNAPSHOT_REPORT")"
    cat > "$QUALITY_SNAPSHOT_JSON" <<JSON
{"overallFlag":"green"}
JSON
    printf '# snapshot\n' > "$QUALITY_SNAPSHOT_REPORT"
    ;;
  *)
    echo "unknown script: ${script_name}" >&2
    exit 96
    ;;
esac
EOF
  chmod +x "${tmp_dir}/bin/npm"

  cat > "${tmp_dir}/bin/sleep" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "${1:-0}" >> "${CHECKPOINT_TEST_SLEEP_LOG:?}"
EOF
  chmod +x "${tmp_dir}/bin/sleep"
}

latest_checkpoint_file() {
  local tmp_dir="$1"
  ls -1 "${tmp_dir}"/docs/reports/artifacts/wave5-checkpoints/checkpoint-*.json | head -n 1
}

run_case_conversion_retry_success() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN
  setup_fixture_repo "$tmp_dir"

  CHECKPOINT_TEST_STATE_DIR="${tmp_dir}/state" \
  CHECKPOINT_TEST_SLEEP_LOG="${tmp_dir}/state/sleep.log" \
  CHECKPOINT_TEST_FAIL_ONCE_SCRIPT="ops:conversion-insights" \
  QUALITY_CHECKPOINT_DB_MAX_RETRIES=3 \
  QUALITY_CHECKPOINT_DB_RETRY_BACKOFF_SECONDS=2 \
  QUALITY_CHECKPOINT_RETENTION_DAYS=0 \
  PATH="${tmp_dir}/bin:${PATH}" \
  bash "${tmp_dir}/scripts/run_quality_checkpoint.sh" >/dev/null

  local checkpoint_file
  checkpoint_file="$(latest_checkpoint_file "$tmp_dir")"
  assert_eq "$(json_value "$checkpoint_file" "stages.conversion.status")" "0" "conversion should pass after retry"
  assert_eq "$(json_value "$checkpoint_file" "executionPolicy.dbRetry.maxAttempts")" "3" "retry policy max attempts"
  assert_eq "$(cat "${tmp_dir}/state/attempt_ops_conversion_insights.txt")" "2" "conversion stage should run twice"
  assert_eq "$(wc -l < "${tmp_dir}/state/sleep.log" | tr -d ' ')" "1" "sleep should be called once"
  assert_eq "$(head -n 1 "${tmp_dir}/state/sleep.log")" "2" "first retry backoff should be 2s"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_non_critical_warning_continues() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN
  setup_fixture_repo "$tmp_dir"

  CHECKPOINT_TEST_STATE_DIR="${tmp_dir}/state" \
  CHECKPOINT_TEST_SLEEP_LOG="${tmp_dir}/state/sleep.log" \
  CHECKPOINT_TEST_FAIL_ALWAYS_SCRIPT="ops:conversion-insights" \
  QUALITY_CHECKPOINT_DB_MAX_RETRIES=2 \
  QUALITY_CHECKPOINT_DB_RETRY_BACKOFF_SECONDS=1 \
  QUALITY_CHECKPOINT_STRICT_NON_CRITICAL=0 \
  QUALITY_CHECKPOINT_RETENTION_DAYS=0 \
  PATH="${tmp_dir}/bin:${PATH}" \
  bash "${tmp_dir}/scripts/run_quality_checkpoint.sh" >/dev/null

  local checkpoint_file
  checkpoint_file="$(latest_checkpoint_file "$tmp_dir")"
  assert_eq "$(json_value "$checkpoint_file" "stages.conversion.status")" "19" "conversion status should capture repeated failure"
  assert_eq "$(json_value "$checkpoint_file" "warnings.conversion.present")" "1" "conversion warning should be present"
  assert_eq "$(json_value "$checkpoint_file" "executionPolicy.strictNonCritical")" "0" "strict non-critical policy should be disabled"
  assert_eq "$(cat "${tmp_dir}/state/attempt_ops_conversion_insights.txt")" "2" "conversion should exhaust retries"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_non_critical_strict_exit() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN
  setup_fixture_repo "$tmp_dir"

  set +e
  CHECKPOINT_TEST_STATE_DIR="${tmp_dir}/state" \
  CHECKPOINT_TEST_SLEEP_LOG="${tmp_dir}/state/sleep.log" \
  CHECKPOINT_TEST_FAIL_ALWAYS_SCRIPT="ops:conversion-insights" \
  QUALITY_CHECKPOINT_DB_MAX_RETRIES=2 \
  QUALITY_CHECKPOINT_DB_RETRY_BACKOFF_SECONDS=1 \
  QUALITY_CHECKPOINT_STRICT_NON_CRITICAL=1 \
  QUALITY_CHECKPOINT_RETENTION_DAYS=0 \
  PATH="${tmp_dir}/bin:${PATH}" \
  bash "${tmp_dir}/scripts/run_quality_checkpoint.sh" >/dev/null 2>&1
  local status=$?
  set -e

  assert_eq "$status" "41" "strict non-critical mode should fail on conversion outage"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_critical_stage_exit_code() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN
  setup_fixture_repo "$tmp_dir"

  set +e
  CHECKPOINT_TEST_STATE_DIR="${tmp_dir}/state" \
  CHECKPOINT_TEST_SLEEP_LOG="${tmp_dir}/state/sleep.log" \
  CHECKPOINT_TEST_FAIL_ALWAYS_SCRIPT="seo:verify:rendered" \
  QUALITY_CHECKPOINT_RETENTION_DAYS=0 \
  PATH="${tmp_dir}/bin:${PATH}" \
  bash "${tmp_dir}/scripts/run_quality_checkpoint.sh" >/dev/null 2>&1
  local status=$?
  set -e

  assert_eq "$status" "11" "rendered critical stage should map to dedicated exit code"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_conversion_retry_success
run_case_non_critical_warning_continues
run_case_non_critical_strict_exit
run_case_critical_stage_exit_code

echo "All quality checkpoint tests passed."
