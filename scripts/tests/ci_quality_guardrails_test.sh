#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
GUARD_SCRIPT="${ROOT_DIR}/scripts/ci_quality_guardrails.ts"

assert_eq() {
  local actual="$1"
  local expected="$2"
  local message="$3"
  if [ "$actual" != "$expected" ]; then
    echo "ASSERTION FAILED: ${message}. expected='${expected}' actual='${actual}'" >&2
    exit 1
  fi
}

assert_contains() {
  local haystack="$1"
  local needle="$2"
  local message="$3"
  if [[ "$haystack" != *"$needle"* ]]; then
    echo "ASSERTION FAILED: ${message}. missing='${needle}'" >&2
    echo "--- output ---" >&2
    echo "$haystack" >&2
    echo "-------------" >&2
    exit 1
  fi
}

run_case_pass_with_warmup() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  cat > "${tmp_dir}/lighthouse.json" <<'JSON'
{
  "failures": [],
  "productDetailResolution": {
    "strategy": "fixture",
    "configuredFixturePath": "/products/fixed-item",
    "selectedPath": "/products/fixed-item",
    "discoverySourcePath": "/products"
  },
  "routeResults": [
    { "key": "home", "path": "/" },
    { "key": "productDetail", "path": "/products/fixed-item" }
  ]
}
JSON

  cat > "${tmp_dir}/rendered.json" <<'JSON'
{
  "failures": [],
  "targets": [
    {
      "target": "prod",
      "routeResults": [
        { "path": "/create", "expectedTrustExpectation": "required", "actualTrustVisible": true }
      ]
    }
  ]
}
JSON

  cat > "${tmp_dir}/trend.json" <<'JSON'
{
  "status": "warmup",
  "warmup": {
    "active": true,
    "remaining": {
      "lighthouse": 1,
      "rendered": 2
    }
  },
  "findings": []
}
JSON

  local output status
  set +e
  output="$(
    CI_GUARD_LIGHTHOUSE_SUMMARY="${tmp_dir}/lighthouse.json" \
    CI_GUARD_RENDERED_SUMMARY="${tmp_dir}/rendered.json" \
    CI_GUARD_TREND_SUMMARY="${tmp_dir}/trend.json" \
    node --import tsx "$GUARD_SCRIPT" 2>&1
  )"
  status=$?
  set -e

  assert_eq "$status" "0" "warmup pass should succeed"
  assert_contains "$output" "CI quality release guardrails passed." "pass confirmation"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_non_fixture_fails() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  cat > "${tmp_dir}/lighthouse.json" <<'JSON'
{
  "failures": [],
  "productDetailResolution": {
    "strategy": "discovery",
    "configuredFixturePath": "/products/fixed-item",
    "selectedPath": "/products/discovered-item",
    "discoverySourcePath": "/products"
  },
  "routeResults": [
    { "key": "productDetail", "path": "/products/discovered-item" }
  ]
}
JSON

  cat > "${tmp_dir}/rendered.json" <<'JSON'
{
  "failures": [],
  "targets": [
    {
      "target": "prod",
      "routeResults": [
        { "path": "/create", "expectedTrustExpectation": "required", "actualTrustVisible": true }
      ]
    }
  ]
}
JSON

  cat > "${tmp_dir}/trend.json" <<'JSON'
{
  "status": "pass",
  "findings": []
}
JSON

  local output status
  set +e
  output="$(
    CI_GUARD_LIGHTHOUSE_SUMMARY="${tmp_dir}/lighthouse.json" \
    CI_GUARD_RENDERED_SUMMARY="${tmp_dir}/rendered.json" \
    CI_GUARD_TREND_SUMMARY="${tmp_dir}/trend.json" \
    node --import tsx "$GUARD_SCRIPT" 2>&1
  )"
  status=$?
  set -e

  assert_eq "$status" "1" "non-fixture strategy should fail"
  assert_contains "$output" "Deterministic fixture route is required" "non-fixture failure message"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_rendered_regression_fails() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  cat > "${tmp_dir}/lighthouse.json" <<'JSON'
{
  "failures": [],
  "productDetailResolution": {
    "strategy": "fixture",
    "configuredFixturePath": "/products/fixed-item",
    "selectedPath": "/products/fixed-item",
    "discoverySourcePath": "/products"
  },
  "routeResults": [
    { "key": "productDetail", "path": "/products/fixed-item" }
  ]
}
JSON

  cat > "${tmp_dir}/rendered.json" <<'JSON'
{
  "failures": ["[prod] /create: trust strip missing"],
  "targets": [
    {
      "target": "prod",
      "routeResults": [
        { "path": "/create", "expectedTrustExpectation": "required", "actualTrustVisible": false }
      ]
    }
  ]
}
JSON

  cat > "${tmp_dir}/trend.json" <<'JSON'
{
  "status": "pass",
  "findings": []
}
JSON

  local output status
  set +e
  output="$(
    CI_GUARD_LIGHTHOUSE_SUMMARY="${tmp_dir}/lighthouse.json" \
    CI_GUARD_RENDERED_SUMMARY="${tmp_dir}/rendered.json" \
    CI_GUARD_TREND_SUMMARY="${tmp_dir}/trend.json" \
    node --import tsx "$GUARD_SCRIPT" 2>&1
  )"
  status=$?
  set -e

  assert_eq "$status" "1" "rendered semantic regressions should fail"
  assert_contains "$output" "Rendered semantic harness reported 1 failure(s)." "rendered failure message"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_trend_fail_fails() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  cat > "${tmp_dir}/lighthouse.json" <<'JSON'
{
  "failures": [],
  "productDetailResolution": {
    "strategy": "fixture",
    "configuredFixturePath": "/products/fixed-item",
    "selectedPath": "/products/fixed-item",
    "discoverySourcePath": "/products"
  },
  "routeResults": [
    { "key": "productDetail", "path": "/products/fixed-item" }
  ]
}
JSON

  cat > "${tmp_dir}/rendered.json" <<'JSON'
{
  "failures": [],
  "targets": [
    {
      "target": "prod",
      "routeResults": [
        { "path": "/create", "expectedTrustExpectation": "required", "actualTrustVisible": true }
      ]
    }
  ]
}
JSON

  cat > "${tmp_dir}/trend.json" <<'JSON'
{
  "status": "fail",
  "warmup": {
    "active": false
  },
  "findings": [
    { "metric": "products.seo" }
  ]
}
JSON

  local output status
  set +e
  output="$(
    CI_GUARD_LIGHTHOUSE_SUMMARY="${tmp_dir}/lighthouse.json" \
    CI_GUARD_RENDERED_SUMMARY="${tmp_dir}/rendered.json" \
    CI_GUARD_TREND_SUMMARY="${tmp_dir}/trend.json" \
    node --import tsx "$GUARD_SCRIPT" 2>&1
  )"
  status=$?
  set -e

  assert_eq "$status" "1" "trend fail should fail"
  assert_contains "$output" "Trend gate reported 'fail'" "trend failure message"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_pass_with_warmup
run_case_non_fixture_fails
run_case_rendered_regression_fails
run_case_trend_fail_fails

echo "All CI quality guardrail tests passed."
