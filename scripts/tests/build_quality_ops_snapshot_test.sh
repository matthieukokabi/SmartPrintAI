#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SNAPSHOT_SCRIPT="${ROOT_DIR}/scripts/build_quality_ops_snapshot.ts"

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
  node -e "const fs=require('fs');const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const keys=process.argv[2].split('.');let cur=data;for(const key of keys){cur=cur?.[key];}if(cur===undefined){process.exit(2);}process.stdout.write(String(cur));" "$file_path" "$path_expr"
}

run_case_warmup_amber() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  mkdir -p "${tmp_dir}/inputs"

  cat > "${tmp_dir}/inputs/lighthouse-summary.json" <<'JSON'
{
  "failures": [],
  "productDetailResolution": { "strategy": "fixture", "resolvedPath": "/products/p1", "sourcePath": "/products" },
  "routeResults": [
    { "finalScores": { "performance": 0.91, "accessibility": 0.95, "seo": 0.97 } },
    { "finalScores": { "performance": 0.9, "accessibility": 0.94, "seo": 0.96 } }
  ]
}
JSON

  cat > "${tmp_dir}/inputs/rendered-summary.json" <<'JSON'
{
  "failures": [],
  "targets": [
    {
      "routeResults": [
        {
          "expectedTrustExpectation": "required",
          "actualTrustVisible": true,
          "schema": { "expected": "breadcrumb", "parseErrors": [], "hasBreadcrumbList": true, "hasItemList": false, "hasProductOfferShape": false },
          "legalLinks": {
            "expected": "required",
            "supportPathFound": true,
            "supportLabelFound": true,
            "termsPathFound": true,
            "termsLabelFound": true,
            "reachability": { "/support": 200, "/terms": 200 }
          }
        }
      ]
    }
  ]
}
JSON

  cat > "${tmp_dir}/inputs/trend-summary.json" <<'JSON'
{
  "status": "warmup",
  "findings": [],
  "warmup": {
    "remaining": { "lighthouse": 2, "rendered": 1 }
  }
}
JSON

  cat > "${tmp_dir}/inputs/checkpoint.json" <<JSON
{
  "generatedAt": "2026-03-18T12:00:00Z",
  "commitSha": "abc1234",
  "stages": {
    "rendered": { "status": 0, "summary": "${tmp_dir}/inputs/rendered-summary.json" },
    "lighthouse": { "status": 0, "summary": "${tmp_dir}/inputs/lighthouse-summary.json" },
    "trend": { "status": 0, "summary": "${tmp_dir}/inputs/trend-summary.json" }
  }
}
JSON

  QUALITY_CHECKPOINT_FILE="${tmp_dir}/inputs/checkpoint.json" \
  QUALITY_SNAPSHOT_JSON="${tmp_dir}/snapshot.json" \
  QUALITY_SNAPSHOT_REPORT="${tmp_dir}/snapshot.md" \
  node --import tsx "$SNAPSHOT_SCRIPT" >/dev/null

  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "overallFlag")" "amber" "overall flag should be amber during warmup"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "flags.trend")" "amber" "trend flag should be amber"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "flags.deterministicRoute")" "green" "deterministic route flag"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "flags.conversionPulse")" "amber" "conversion pulse should be amber when conversion summary is unavailable"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "flags.deployHealth")" "amber" "deploy health should be watch during trend warmup"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "conversion.amberReasonCode")" "conversion_stage_missing" "missing conversion stage should set amber reason"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "releaseConfidenceCard.conversionPulse.db_connectivity_status")" "unknown" "db connectivity should be unknown when conversion summary missing"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "releaseConfidenceCard.conversionPulse.conversion_pulse_mode")" "unknown" "conversion mode should be unknown when summary missing"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "releaseConfidenceCard.conversionPulse.amber_reason_code")" "conversion_stage_missing" "release card should expose amber reason code"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_legal_failure_red() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  mkdir -p "${tmp_dir}/inputs"

  cat > "${tmp_dir}/inputs/lighthouse-summary.json" <<'JSON'
{
  "failures": [],
  "productDetailResolution": { "strategy": "fixture", "resolvedPath": "/products/p1", "sourcePath": "/products" },
  "routeResults": [
    { "finalScores": { "performance": 0.9, "accessibility": 0.95, "seo": 0.96 } }
  ]
}
JSON

  cat > "${tmp_dir}/inputs/rendered-summary.json" <<'JSON'
{
  "failures": [],
  "targets": [
    {
      "routeResults": [
        {
          "expectedTrustExpectation": "required",
          "actualTrustVisible": true,
          "schema": { "expected": "breadcrumb", "parseErrors": [], "hasBreadcrumbList": true, "hasItemList": false, "hasProductOfferShape": false },
          "legalLinks": {
            "expected": "required",
            "supportPathFound": true,
            "supportLabelFound": true,
            "termsPathFound": false,
            "termsLabelFound": false,
            "reachability": { "/support": 200, "/terms": 404 }
          }
        }
      ]
    }
  ]
}
JSON

  cat > "${tmp_dir}/inputs/trend-summary.json" <<'JSON'
{
  "status": "pass",
  "findings": []
}
JSON

  cat > "${tmp_dir}/inputs/checkpoint.json" <<JSON
{
  "generatedAt": "2026-03-18T12:00:00Z",
  "commitSha": "abc1234",
  "stages": {
    "rendered": { "status": 0, "summary": "${tmp_dir}/inputs/rendered-summary.json" },
    "lighthouse": { "status": 0, "summary": "${tmp_dir}/inputs/lighthouse-summary.json" },
    "trend": { "status": 0, "summary": "${tmp_dir}/inputs/trend-summary.json" }
  }
}
JSON

  QUALITY_CHECKPOINT_FILE="${tmp_dir}/inputs/checkpoint.json" \
  QUALITY_SNAPSHOT_JSON="${tmp_dir}/snapshot.json" \
  QUALITY_SNAPSHOT_REPORT="${tmp_dir}/snapshot.md" \
  node --import tsx "$SNAPSHOT_SCRIPT" >/dev/null

  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "overallFlag")" "red" "overall flag should be red on legal failure"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "flags.legalLinks")" "red" "legal links flag should be red"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "flags.trend")" "green" "trend flag should remain green"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "flags.deployHealth")" "green" "deploy health should remain green when render/lighthouse pass"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_conversion_critical_red() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  mkdir -p "${tmp_dir}/inputs"

  cat > "${tmp_dir}/inputs/lighthouse-summary.json" <<'JSON'
{
  "failures": [],
  "productDetailResolution": { "strategy": "fixture", "resolvedPath": "/products/p1", "sourcePath": "/products" },
  "routeResults": [
    { "finalScores": { "performance": 0.92, "accessibility": 0.96, "seo": 0.97 } }
  ]
}
JSON

  cat > "${tmp_dir}/inputs/rendered-summary.json" <<'JSON'
{
  "failures": [],
  "targets": [
    {
      "routeResults": [
        {
          "expectedTrustExpectation": "required",
          "actualTrustVisible": true,
          "schema": { "expected": "breadcrumb", "parseErrors": [], "hasBreadcrumbList": true, "hasItemList": false, "hasProductOfferShape": false },
          "legalLinks": {
            "expected": "required",
            "supportPathFound": true,
            "supportLabelFound": true,
            "termsPathFound": true,
            "termsLabelFound": true,
            "reachability": { "/support": 200, "/terms": 200 }
          }
        }
      ]
    }
  ]
}
JSON

  cat > "${tmp_dir}/inputs/trend-summary.json" <<'JSON'
{
  "status": "pass",
  "findings": []
}
JSON

  cat > "${tmp_dir}/inputs/conversion-summary.json" <<'JSON'
{
  "status": "ok",
  "mode": "connected_live",
  "reasonCode": "live_database",
  "connectivity": {
    "status": "connected_live",
    "reasonCode": "live_database"
  },
  "freshness": {
    "ageSeconds": 42,
    "stale": false
  },
  "totals": {
    "generatedCount": 40,
    "purchaseCount": 8,
    "conversionRate": 0.2
  },
  "anomalies": [
    { "severity": "critical" }
  ]
}
JSON

  cat > "${tmp_dir}/inputs/checkpoint.json" <<JSON
{
  "generatedAt": "2026-03-18T12:00:00Z",
  "commitSha": "abc1234",
  "stages": {
    "rendered": { "status": 0, "summary": "${tmp_dir}/inputs/rendered-summary.json" },
    "lighthouse": { "status": 0, "summary": "${tmp_dir}/inputs/lighthouse-summary.json" },
    "trend": { "status": 0, "summary": "${tmp_dir}/inputs/trend-summary.json" },
    "conversion": { "status": 0, "summary": "${tmp_dir}/inputs/conversion-summary.json" }
  }
}
JSON

  QUALITY_CHECKPOINT_FILE="${tmp_dir}/inputs/checkpoint.json" \
  QUALITY_SNAPSHOT_JSON="${tmp_dir}/snapshot.json" \
  QUALITY_SNAPSHOT_REPORT="${tmp_dir}/snapshot.md" \
  node --import tsx "$SNAPSHOT_SCRIPT" >/dev/null

  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "overallFlag")" "red" "overall flag should be red on critical conversion anomaly"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "flags.conversionPulse")" "red" "conversion pulse flag should be red"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "releaseConfidenceCard.conversionPulse.flag")" "red" "release card conversion pulse should be red"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "releaseConfidenceCard.deployHealth.flag")" "green" "deploy health should stay green"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "releaseConfidenceCard.conversionPulse.db_connectivity_status")" "connected_live" "db connectivity should flow into release card"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "releaseConfidenceCard.conversionPulse.conversion_pulse_mode")" "connected_live" "conversion mode should flow into release card"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "releaseConfidenceCard.conversionPulse.data_freshness_age")" "42" "freshness age should flow into release card"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "releaseConfidenceCard.conversionPulse.amber_reason_code")" "null" "amber reason should be null when conversion flag is red"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_conversion_cached_amber_metadata() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  mkdir -p "${tmp_dir}/inputs"

  cat > "${tmp_dir}/inputs/lighthouse-summary.json" <<'JSON'
{
  "failures": [],
  "productDetailResolution": { "strategy": "fixture", "resolvedPath": "/products/p1", "sourcePath": "/products" },
  "routeResults": [
    { "finalScores": { "performance": 0.9, "accessibility": 0.95, "seo": 0.96 } }
  ]
}
JSON

  cat > "${tmp_dir}/inputs/rendered-summary.json" <<'JSON'
{
  "failures": [],
  "targets": [
    {
      "routeResults": [
        {
          "expectedTrustExpectation": "required",
          "actualTrustVisible": true,
          "schema": { "expected": "breadcrumb", "parseErrors": [], "hasBreadcrumbList": true, "hasItemList": false, "hasProductOfferShape": false },
          "legalLinks": {
            "expected": "required",
            "supportPathFound": true,
            "supportLabelFound": true,
            "termsPathFound": true,
            "termsLabelFound": true,
            "reachability": { "/support": 200, "/terms": 200 }
          }
        }
      ]
    }
  ]
}
JSON

  cat > "${tmp_dir}/inputs/trend-summary.json" <<'JSON'
{
  "status": "pass",
  "findings": []
}
JSON

  cat > "${tmp_dir}/inputs/conversion-summary.json" <<'JSON'
{
  "status": "ok",
  "mode": "stale_cached",
  "reasonCode": "cache_fallback_missing_database_url",
  "connectivity": {
    "status": "stale_cached",
    "reasonCode": "cache_fallback_missing_database_url"
  },
  "freshness": {
    "ageSeconds": 900,
    "stale": false
  },
  "totals": {
    "generatedCount": 25,
    "purchaseCount": 5,
    "conversionRate": 0.2
  },
  "anomalies": []
}
JSON

  cat > "${tmp_dir}/inputs/checkpoint.json" <<JSON
{
  "generatedAt": "2026-03-18T12:00:00Z",
  "commitSha": "abc1234",
  "stages": {
    "rendered": { "status": 0, "summary": "${tmp_dir}/inputs/rendered-summary.json" },
    "lighthouse": { "status": 0, "summary": "${tmp_dir}/inputs/lighthouse-summary.json" },
    "trend": { "status": 0, "summary": "${tmp_dir}/inputs/trend-summary.json" },
    "conversion": { "status": 0, "summary": "${tmp_dir}/inputs/conversion-summary.json" }
  }
}
JSON

  QUALITY_CHECKPOINT_FILE="${tmp_dir}/inputs/checkpoint.json" \
  QUALITY_SNAPSHOT_JSON="${tmp_dir}/snapshot.json" \
  QUALITY_SNAPSHOT_REPORT="${tmp_dir}/snapshot.md" \
  node --import tsx "$SNAPSHOT_SCRIPT" >/dev/null

  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "overallFlag")" "amber" "cached conversion mode should keep overall status amber"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "flags.conversionPulse")" "amber" "stale cached conversion mode should be amber"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "conversion.dbConnectivityStatus")" "stale_cached" "snapshot db connectivity status"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "conversion.mode")" "stale_cached" "snapshot conversion mode"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "conversion.dataFreshnessAge")" "900" "snapshot freshness age"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "conversion.amberReasonCode")" "cache_fallback_missing_database_url" "snapshot amber reason code"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "releaseConfidenceCard.conversionPulse.db_connectivity_status")" "stale_cached" "release card db connectivity status"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "releaseConfidenceCard.conversionPulse.conversion_pulse_mode")" "stale_cached" "release card conversion mode"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "releaseConfidenceCard.conversionPulse.data_freshness_age")" "900" "release card freshness age"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "releaseConfidenceCard.conversionPulse.amber_reason_code")" "cache_fallback_missing_database_url" "release card amber reason code"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_conversion_stage_failure_still_generates_card() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  mkdir -p "${tmp_dir}/inputs"

  cat > "${tmp_dir}/inputs/lighthouse-summary.json" <<'JSON'
{
  "failures": [],
  "productDetailResolution": { "strategy": "fixture", "resolvedPath": "/products/p1", "sourcePath": "/products" },
  "routeResults": [
    { "finalScores": { "performance": 0.9, "accessibility": 0.95, "seo": 0.96 } }
  ]
}
JSON

  cat > "${tmp_dir}/inputs/rendered-summary.json" <<'JSON'
{
  "failures": [],
  "targets": [
    {
      "routeResults": [
        {
          "expectedTrustExpectation": "required",
          "actualTrustVisible": true,
          "schema": { "expected": "breadcrumb", "parseErrors": [], "hasBreadcrumbList": true, "hasItemList": false, "hasProductOfferShape": false },
          "legalLinks": {
            "expected": "required",
            "supportPathFound": true,
            "supportLabelFound": true,
            "termsPathFound": true,
            "termsLabelFound": true,
            "reachability": { "/support": 200, "/terms": 200 }
          }
        }
      ]
    }
  ]
}
JSON

  cat > "${tmp_dir}/inputs/trend-summary.json" <<'JSON'
{
  "status": "pass",
  "findings": []
}
JSON

  cat > "${tmp_dir}/inputs/checkpoint.json" <<JSON
{
  "generatedAt": "2026-03-18T12:00:00Z",
  "commitSha": "abc1234",
  "stages": {
    "rendered": { "status": 0, "summary": "${tmp_dir}/inputs/rendered-summary.json" },
    "lighthouse": { "status": 0, "summary": "${tmp_dir}/inputs/lighthouse-summary.json" },
    "trend": { "status": 0, "summary": "${tmp_dir}/inputs/trend-summary.json" },
    "conversion": { "status": 19, "summary": "${tmp_dir}/inputs/missing-conversion-summary.json" }
  }
}
JSON

  QUALITY_CHECKPOINT_FILE="${tmp_dir}/inputs/checkpoint.json" \
  QUALITY_SNAPSHOT_JSON="${tmp_dir}/snapshot.json" \
  QUALITY_SNAPSHOT_REPORT="${tmp_dir}/snapshot.md" \
  node --import tsx "$SNAPSHOT_SCRIPT" >/dev/null

  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "flags.conversionPulse")" "red" "failed conversion stage should be red"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "releaseConfidenceCard.conversionPulse.status")" "unknown" "release card should still render conversion status"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "releaseConfidenceCard.conversionPulse.db_connectivity_status")" "unknown" "release card should still render db status in degraded mode"
  assert_eq "$(json_value "${tmp_dir}/snapshot.json" "releaseConfidenceCard.conversionPulse.amber_reason_code")" "null" "amber reason should be null for red conversion state"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_warmup_amber
run_case_legal_failure_red
run_case_conversion_critical_red
run_case_conversion_cached_amber_metadata
run_case_conversion_stage_failure_still_generates_card

echo "All quality snapshot tests passed."
