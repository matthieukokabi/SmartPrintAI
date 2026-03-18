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
  CONVERSION_INSIGHTS_CACHE_FILE="${tmp_dir}/cache/latest.json" \
  CONVERSION_INSIGHTS_REPORT_FILE="${tmp_dir}/report.md" \
  node --import tsx "$INSIGHT_SCRIPT" >/dev/null

  local summary="${tmp_dir}/artifact/summary.json"
  assert_eq "$(json_value "$summary" "status")" "ok" "status should be ok with fixture input"
  assert_eq "$(json_value "$summary" "mode")" "connected_live" "fixture run mode"
  assert_eq "$(json_value "$summary" "reasonCode")" "fixture_input" "fixture reason code"
  assert_eq "$(json_value "$summary" "connectivity.status")" "connected_live" "fixture run connectivity status"
  assert_eq "$(json_value "$summary" "connectivity.reasonCode")" "fixture_input" "fixture connectivity reason"
  assert_eq "$(json_value "$summary" "freshness.stale")" "false" "fixture run freshness should not be stale"
  assert_eq "$(json_value "$summary" "freshness.cacheFile")" "${tmp_dir}/cache/latest.json" "cache file path should be preserved"
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
    CONVERSION_INSIGHTS_CACHE_FILE="${tmp_dir}/cache/latest.json" \
    CONVERSION_INSIGHTS_REPORT_FILE="${tmp_dir}/report.md" \
    node --import tsx "$INSIGHT_SCRIPT" >/dev/null

  local summary="${tmp_dir}/artifact/summary.json"
  assert_eq "$(json_value "$summary" "status")" "unavailable" "status should be unavailable without db or fixture"
  assert_eq "$(json_value "$summary" "mode")" "degraded_no_db" "mode should be degraded_no_db without cache"
  assert_eq "$(json_value "$summary" "reasonCode")" "missing_database_url_no_cache" "reason code should include cache miss"
  assert_eq "$(json_value "$summary" "connectivity.status")" "degraded_no_db" "degraded connectivity status"
  assert_eq "$(json_value "$summary" "connectivity.reasonCode")" "missing_database_url_no_cache" "degraded reason code"
  assert_eq "$(json_value "$summary" "freshness.stale")" "true" "unavailable mode should be stale"
  assert_eq "$(json_value "$summary" "totals.generatedCount")" "0" "generated count should be zero in unavailable mode"
  assert_eq "$(json_value "$summary" "anomalies[0].id")" "missing_database_url_no_cache" "unavailable anomaly id"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_database_unavailable_cached_fallback() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  mkdir -p "${tmp_dir}/cache"
  node - "${tmp_dir}/cache/latest.json" <<'NODE'
const fs = require('fs')
const cachePath = process.argv[2]
const generatedAt = new Date(Date.now() - (15 * 60 * 1000)).toISOString()

const summary = {
  generatedAt,
  commitSha: 'cached123',
  status: 'ok',
  mode: 'connected_live',
  reasonCode: 'live_database',
  connectivity: {
    status: 'connected_live',
    policy: 'warn',
    reasonCode: 'live_database',
    message: 'cached'
  },
  freshness: {
    ttlSeconds: 21600,
    sourceGeneratedAt: generatedAt,
    ageSeconds: 0,
    stale: false,
    cacheFile: cachePath
  },
  window: {
    days: 7,
    currentStart: new Date(Date.now() - (7 * 24 * 3600 * 1000)).toISOString(),
    currentEnd: new Date().toISOString(),
    previousStart: new Date(Date.now() - (14 * 24 * 3600 * 1000)).toISOString(),
    previousEnd: new Date(Date.now() - (7 * 24 * 3600 * 1000)).toISOString()
  },
  totals: {
    generatedCount: 20,
    purchaseCount: 4,
    conversionRate: 0.2,
    previousGeneratedCount: 18,
    previousPurchaseCount: 5,
    previousConversionRate: 0.2778
  },
  attributionCoverage: {
    recordCount: 24,
    attributedCount: 20,
    legacyCount: 2,
    unattributedCount: 2,
    unattributedRate: 0.0833
  },
  sourceBreakdown: [
    {
      source: 'homepage_popup',
      generatedCount: 12,
      purchaseCount: 3,
      dropoffCount: 9,
      dropoffRate: 0.75,
      conversionRate: 0.25
    }
  ],
  pageDropoff: [
    { key: 'create', label: '/create', count: 20, dropoffFromPrevious: 0, dropoffRateFromPrevious: 0 },
    { key: 'checkout', label: '/checkout', count: 4, dropoffFromPrevious: 16, dropoffRateFromPrevious: 0.8 }
  ],
  formStepDropoff: [
    { key: 'generate_success', label: 'generate_success', count: 20, dropoffFromPrevious: 0, dropoffRateFromPrevious: 0 },
    { key: 'purchase_completed', label: 'purchase_completed', count: 4, dropoffFromPrevious: 16, dropoffRateFromPrevious: 0.8 }
  ],
  anomalies: []
}

fs.writeFileSync(cachePath, JSON.stringify(summary, null, 2), 'utf8')
NODE

  env -u DATABASE_URL \
    CONVERSION_INSIGHTS_ARTIFACT_DIR="${tmp_dir}/artifact" \
    CONVERSION_INSIGHTS_CACHE_FILE="${tmp_dir}/cache/latest.json" \
    CONVERSION_INSIGHTS_CACHE_TTL_SECONDS=3600 \
    CONVERSION_INSIGHTS_REPORT_FILE="${tmp_dir}/report.md" \
    node --import tsx "$INSIGHT_SCRIPT" >/dev/null

  local summary="${tmp_dir}/artifact/summary.json"
  assert_eq "$(json_value "$summary" "status")" "ok" "status should stay ok with cached fallback"
  assert_eq "$(json_value "$summary" "mode")" "stale_cached" "mode should show cached fallback"
  assert_eq "$(json_value "$summary" "reasonCode")" "cache_fallback_missing_database_url" "fallback reason code"
  assert_eq "$(json_value "$summary" "connectivity.status")" "stale_cached" "connectivity mode should show cached fallback"
  assert_eq "$(json_value "$summary" "freshness.stale")" "false" "cache should be fresh for this test"
  assert_eq "$(json_value "$summary" "anomalies[0].id")" "conversion_pulse_cached_fallback" "cached fallback anomaly id"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_database_unavailable_policy_fail() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  set +e
  env -u DATABASE_URL \
    CONVERSION_INSIGHTS_DEGRADED_POLICY="fail" \
    CONVERSION_INSIGHTS_ARTIFACT_DIR="${tmp_dir}/artifact" \
    CONVERSION_INSIGHTS_CACHE_FILE="${tmp_dir}/cache/latest.json" \
    CONVERSION_INSIGHTS_REPORT_FILE="${tmp_dir}/report.md" \
    node --import tsx "$INSIGHT_SCRIPT" >/dev/null 2>&1
  local status=$?
  set -e

  if [ "$status" -eq 0 ]; then
    echo "ASSERTION FAILED: degraded policy fail should return non-zero" >&2
    exit 1
  fi

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_conversion_drop_anomaly
run_case_database_unavailable
run_case_database_unavailable_cached_fallback
run_case_database_unavailable_policy_fail

echo "All conversion insight tests passed."
