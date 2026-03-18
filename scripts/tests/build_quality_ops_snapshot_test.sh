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

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_warmup_amber
run_case_legal_failure_red
run_case_conversion_critical_red

echo "All quality snapshot tests passed."
