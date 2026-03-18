#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
INSIGHT_SCRIPT="${ROOT_DIR}/scripts/build_conversion_insights.ts"

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

run_case_conversion_drop_anomaly() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  mkdir -p "${tmp_dir}/inputs"

  node - "${tmp_dir}/inputs/fixture.json" <<'NODE'
const fs = require('fs')
const fixturePath = process.argv[2]
const makeSession = (source) => `spai1|src=${source}|entry=/create|sid=${Math.random().toString(36).slice(2, 12)}`

const current = { designs: [], orders: [] }
for (let i = 0; i < 15; i += 1) current.designs.push({ sessionId: makeSession('homepage_popup') })
for (let i = 0; i < 10; i += 1) current.designs.push({ sessionId: makeSession('seo_blog') })
for (let i = 0; i < 5; i += 1) current.orders.push({ status: 'paid', sessionId: makeSession('homepage_popup') })
for (let i = 0; i < 3; i += 1) current.orders.push({ status: 'processing', sessionId: makeSession('seo_blog') })

const previous = { designs: [], orders: [] }
for (let i = 0; i < 12; i += 1) previous.designs.push({ sessionId: makeSession('homepage_popup') })
for (let i = 0; i < 13; i += 1) previous.designs.push({ sessionId: makeSession('seo_blog') })
for (let i = 0; i < 8; i += 1) previous.orders.push({ status: 'paid', sessionId: makeSession('homepage_popup') })
for (let i = 0; i < 7; i += 1) previous.orders.push({ status: 'shipped', sessionId: makeSession('seo_blog') })

fs.writeFileSync(
  fixturePath,
  JSON.stringify({ current, previous }, null, 2),
  'utf8'
)
NODE

  CONVERSION_INSIGHTS_INPUT_FILE="${tmp_dir}/inputs/fixture.json" \
  CONVERSION_INSIGHTS_ARTIFACT_DIR="${tmp_dir}/artifact" \
  CONVERSION_INSIGHTS_REPORT_FILE="${tmp_dir}/report.md" \
  node --import tsx "$INSIGHT_SCRIPT" >/dev/null

  local summary="${tmp_dir}/artifact/summary.json"
  assert_eq "$(json_value "$summary" "status")" "ok" "status should be ok with fixture input"
  assert_eq "$(json_value "$summary" "totals.generatedCount")" "25" "current generated count"
  assert_eq "$(json_value "$summary" "totals.purchaseCount")" "8" "current purchase count"
  assert_eq "$(json_value "$summary" "sourceBreakdown[0].source")" "homepage_popup" "top source ordering"
  assert_eq "$(json_value "$summary" "sourceBreakdown[0].dropoffCount")" "10" "homepage dropoff count"
  assert_eq "$(json_value "$summary" "pageDropoff[1].dropoffFromPrevious")" "17" "checkout dropoff count"
  assert_eq "$(json_value "$summary" "anomalies[0].id")" "conversion_rate_drop" "conversion drop anomaly"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_database_unavailable() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  env -u DATABASE_URL \
    CONVERSION_INSIGHTS_ARTIFACT_DIR="${tmp_dir}/artifact" \
    CONVERSION_INSIGHTS_REPORT_FILE="${tmp_dir}/report.md" \
    node --import tsx "$INSIGHT_SCRIPT" >/dev/null

  local summary="${tmp_dir}/artifact/summary.json"
  assert_eq "$(json_value "$summary" "status")" "unavailable" "status should be unavailable without db or fixture"
  assert_eq "$(json_value "$summary" "totals.generatedCount")" "0" "generated count should be zero in unavailable mode"
  assert_eq "$(json_value "$summary" "anomalies[0].id")" "database_unavailable" "unavailable anomaly id"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_conversion_drop_anomaly
run_case_database_unavailable

echo "All conversion insight tests passed."
