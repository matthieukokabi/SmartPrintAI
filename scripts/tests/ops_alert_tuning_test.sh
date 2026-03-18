#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ALERT_SCRIPT="${ROOT_DIR}/scripts/build_ops_alert_summary.ts"

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
  node -e "const fs=require('fs');const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const keys=process.argv[2].split('.');let cur=data;for(const key of keys){const match=key.match(/^([^[\\]]+)\\[(\\d+)\\]$/);if(match){cur=cur?.[match[1]]?.[Number(match[2])];}else{cur=cur?.[key];}}if(cur===undefined){process.exit(2);}process.stdout.write(String(cur));" "$file_path" "$path_expr"
}

json_array_contains_id() {
  local file_path="$1"
  local array_key="$2"
  local expected_id="$3"
  node -e "const fs=require('fs');const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const arr=data[process.argv[2]];if(!Array.isArray(arr)){process.exit(2);}const found=arr.some((entry)=>entry && entry.id===process.argv[3]);process.stdout.write(found ? '1' : '0');" "$file_path" "$array_key" "$expected_id"
}

run_case_warning_cooldown() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  cat > "${tmp_dir}/trend.json" <<'JSON'
{
  "status": "warmup",
  "findings": []
}
JSON

  cat > "${tmp_dir}/conversion.json" <<'JSON'
{
  "anomalies": [
    {
      "id": "attribution_coverage_low",
      "severity": "warning",
      "message": "Session attribution coverage is low.",
      "reasonHint": "Ensure conversion session IDs are passed."
    }
  ]
}
JSON

  QUALITY_ALERT_NOW="2026-03-18T08:00:00.000Z" \
  QUALITY_ALERT_COOLDOWN_HOURS="24" \
  QUALITY_ALERT_TREND_SUMMARY="${tmp_dir}/trend.json" \
  QUALITY_ALERT_CONVERSION_SUMMARY="${tmp_dir}/conversion.json" \
  QUALITY_ALERT_STATE_FILE="${tmp_dir}/state.json" \
  QUALITY_ALERT_ARTIFACT_DIR="${tmp_dir}/run1" \
  QUALITY_ALERT_REPORT_FILE="${tmp_dir}/run1.md" \
  node --import tsx "$ALERT_SCRIPT" >/dev/null

  local summary1="${tmp_dir}/run1/summary.json"
  assert_eq "$(json_value "$summary1" "totals.emittedCount")" "2" "first run should emit warning alerts"
  assert_eq "$(json_value "$summary1" "totals.suppressedCount")" "0" "first run should not suppress warnings"

  QUALITY_ALERT_NOW="2026-03-18T09:00:00.000Z" \
  QUALITY_ALERT_COOLDOWN_HOURS="24" \
  QUALITY_ALERT_TREND_SUMMARY="${tmp_dir}/trend.json" \
  QUALITY_ALERT_CONVERSION_SUMMARY="${tmp_dir}/conversion.json" \
  QUALITY_ALERT_STATE_FILE="${tmp_dir}/state.json" \
  QUALITY_ALERT_ARTIFACT_DIR="${tmp_dir}/run2" \
  QUALITY_ALERT_REPORT_FILE="${tmp_dir}/run2.md" \
  node --import tsx "$ALERT_SCRIPT" >/dev/null

  local summary2="${tmp_dir}/run2/summary.json"
  assert_eq "$(json_value "$summary2" "totals.emittedCount")" "0" "second run should suppress warning alerts in cooldown"
  assert_eq "$(json_value "$summary2" "totals.suppressedCount")" "2" "second run suppressed warning count"
  assert_eq "$(json_array_contains_id "$summary2" "suppressed" "trend_gate_warmup")" "1" "warmup warning should be suppressed"
  assert_eq "$(json_array_contains_id "$summary2" "suppressed" "conversion_attribution_coverage_low")" "1" "conversion warning should be suppressed"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_critical_immediate() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  cat > "${tmp_dir}/trend.json" <<'JSON'
{
  "status": "fail",
  "findings": [{ "metric": "create.performance" }]
}
JSON

  cat > "${tmp_dir}/conversion.json" <<'JSON'
{
  "anomalies": [
    {
      "id": "conversion_rate_drop",
      "severity": "critical",
      "message": "Weekly conversion rate dropped.",
      "reasonHint": "Review checkout regressions."
    }
  ]
}
JSON

  QUALITY_ALERT_NOW="2026-03-18T10:00:00.000Z" \
  QUALITY_ALERT_COOLDOWN_HOURS="24" \
  QUALITY_ALERT_TREND_SUMMARY="${tmp_dir}/trend.json" \
  QUALITY_ALERT_CONVERSION_SUMMARY="${tmp_dir}/conversion.json" \
  QUALITY_ALERT_STATE_FILE="${tmp_dir}/state.json" \
  QUALITY_ALERT_ARTIFACT_DIR="${tmp_dir}/run1" \
  QUALITY_ALERT_REPORT_FILE="${tmp_dir}/run1.md" \
  node --import tsx "$ALERT_SCRIPT" >/dev/null

  local summary1="${tmp_dir}/run1/summary.json"
  assert_eq "$(json_value "$summary1" "totals.emittedCount")" "2" "first run emits critical alerts"
  assert_eq "$(json_value "$summary1" "totals.suppressedCount")" "0" "first run has no suppression"

  QUALITY_ALERT_NOW="2026-03-18T10:30:00.000Z" \
  QUALITY_ALERT_COOLDOWN_HOURS="24" \
  QUALITY_ALERT_TREND_SUMMARY="${tmp_dir}/trend.json" \
  QUALITY_ALERT_CONVERSION_SUMMARY="${tmp_dir}/conversion.json" \
  QUALITY_ALERT_STATE_FILE="${tmp_dir}/state.json" \
  QUALITY_ALERT_ARTIFACT_DIR="${tmp_dir}/run2" \
  QUALITY_ALERT_REPORT_FILE="${tmp_dir}/run2.md" \
  node --import tsx "$ALERT_SCRIPT" >/dev/null

  local summary2="${tmp_dir}/run2/summary.json"
  assert_eq "$(json_value "$summary2" "totals.emittedCount")" "2" "critical alerts must bypass cooldown"
  assert_eq "$(json_value "$summary2" "totals.suppressedCount")" "0" "critical alerts should not be suppressed"
  assert_eq "$(json_array_contains_id "$summary2" "emitted" "trend_gate_fail")" "1" "trend fail alert should be emitted"
  assert_eq "$(json_array_contains_id "$summary2" "emitted" "conversion_conversion_rate_drop")" "1" "critical conversion alert should be emitted"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_warning_cooldown
run_case_critical_immediate

echo "All ops alert tuning tests passed."
