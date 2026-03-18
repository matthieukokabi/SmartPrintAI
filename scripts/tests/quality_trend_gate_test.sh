#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TREND_SCRIPT="${ROOT_DIR}/scripts/quality_trend_gate.ts"

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

run_case_insufficient_baseline_passes() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  mkdir -p "${tmp_dir}/inputs" "${tmp_dir}/history" "${tmp_dir}/artifacts"

  cat > "${tmp_dir}/inputs/lighthouse-summary.json" <<'JSON'
{
  "generatedAt": "2026-03-18T10:00:00.000Z",
  "generatedDate": "2026-03-18",
  "artifactRoot": "docs/reports/artifacts/lighthouse-2026-03-18_10-00-00",
  "routeResults": [
    {
      "key": "create",
      "path": "/create",
      "finalScores": {
        "performance": 0.92,
        "accessibility": 0.96,
        "seo": 0.97
      }
    }
  ],
  "failures": []
}
JSON

  cat > "${tmp_dir}/inputs/rendered-summary.json" <<'JSON'
{
  "generatedAt": "2026-03-18T10:00:00.000Z",
  "generatedDate": "2026-03-18",
  "commitSha": "abc1234",
  "artifactRoot": "docs/reports/artifacts/wave4-rendered-head-2026-03-18_10-00-00-abc1234",
  "targets": [
    {
      "routeResults": [
        {
          "expectedTrustExpectation": "required",
          "actualTrustVisible": true
        }
      ]
    }
  ],
  "failures": []
}
JSON

  local output status
  set +e
  output="$(
    QUALITY_TREND_WINDOW=5 \
    QUALITY_TREND_MIN_BASELINE=3 \
    QUALITY_TREND_LIGHTHOUSE_SUMMARY="${tmp_dir}/inputs/lighthouse-summary.json" \
    QUALITY_TREND_RENDERED_SUMMARY="${tmp_dir}/inputs/rendered-summary.json" \
    QUALITY_TREND_HISTORY_DIR="${tmp_dir}/history" \
    QUALITY_TREND_ARTIFACT_DIR="${tmp_dir}/artifacts/run-pass" \
    QUALITY_TREND_REPORT_FILE="${tmp_dir}/report-pass.md" \
    node --import tsx "$TREND_SCRIPT" 2>&1
  )"
  status=$?
  set -e

  assert_eq "$status" "0" "insufficient baseline should pass"
  assert_contains "$output" "Quality trend report:" "pass case output"

  test -f "${tmp_dir}/history/lighthouse_history.json"
  test -f "${tmp_dir}/history/rendered_head_history.json"
  test -f "${tmp_dir}/artifacts/run-pass/summary.json"
  test -f "${tmp_dir}/report-pass.md"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_statistical_regression_fails() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  mkdir -p "${tmp_dir}/inputs" "${tmp_dir}/history" "${tmp_dir}/artifacts"

  cat > "${tmp_dir}/history/lighthouse_history.json" <<'JSON'
[
  {
    "generatedAt": "2026-03-15T10:00:00.000Z",
    "commitSha": "hist001",
    "summaryPath": "docs/reports/artifacts/lighthouse-2026-03-15_10-00-00/summary.json",
    "overall": { "performance": 0.95, "accessibility": 0.95, "seo": 0.95 },
    "routes": {
      "create": { "performance": 0.95, "accessibility": 0.95, "seo": 0.95 }
    }
  },
  {
    "generatedAt": "2026-03-16T10:00:00.000Z",
    "commitSha": "hist002",
    "summaryPath": "docs/reports/artifacts/lighthouse-2026-03-16_10-00-00/summary.json",
    "overall": { "performance": 0.95, "accessibility": 0.95, "seo": 0.95 },
    "routes": {
      "create": { "performance": 0.95, "accessibility": 0.95, "seo": 0.95 }
    }
  },
  {
    "generatedAt": "2026-03-17T10:00:00.000Z",
    "commitSha": "hist003",
    "summaryPath": "docs/reports/artifacts/lighthouse-2026-03-17_10-00-00/summary.json",
    "overall": { "performance": 0.95, "accessibility": 0.95, "seo": 0.95 },
    "routes": {
      "create": { "performance": 0.95, "accessibility": 0.95, "seo": 0.95 }
    }
  }
]
JSON

  cat > "${tmp_dir}/history/rendered_head_history.json" <<'JSON'
[
  {
    "generatedAt": "2026-03-15T10:00:00.000Z",
    "commitSha": "hist001",
    "summaryPath": "docs/reports/artifacts/wave4-rendered-head-2026-03-15_10-00-00-hist001/summary.json",
    "failureCount": 0,
    "requiredTrustVisible": 5,
    "requiredTrustTotal": 5,
    "requiredTrustRate": 1
  },
  {
    "generatedAt": "2026-03-16T10:00:00.000Z",
    "commitSha": "hist002",
    "summaryPath": "docs/reports/artifacts/wave4-rendered-head-2026-03-16_10-00-00-hist002/summary.json",
    "failureCount": 0,
    "requiredTrustVisible": 5,
    "requiredTrustTotal": 5,
    "requiredTrustRate": 1
  },
  {
    "generatedAt": "2026-03-17T10:00:00.000Z",
    "commitSha": "hist003",
    "summaryPath": "docs/reports/artifacts/wave4-rendered-head-2026-03-17_10-00-00-hist003/summary.json",
    "failureCount": 0,
    "requiredTrustVisible": 5,
    "requiredTrustTotal": 5,
    "requiredTrustRate": 1
  }
]
JSON

  cat > "${tmp_dir}/inputs/lighthouse-summary.json" <<'JSON'
{
  "generatedAt": "2026-03-18T10:00:00.000Z",
  "generatedDate": "2026-03-18",
  "artifactRoot": "docs/reports/artifacts/lighthouse-2026-03-18_10-00-00",
  "routeResults": [
    {
      "key": "create",
      "path": "/create",
      "finalScores": {
        "performance": 0.70,
        "accessibility": 0.95,
        "seo": 0.95
      }
    }
  ],
  "failures": []
}
JSON

  cat > "${tmp_dir}/inputs/rendered-summary.json" <<'JSON'
{
  "generatedAt": "2026-03-18T10:00:00.000Z",
  "generatedDate": "2026-03-18",
  "commitSha": "abc1234",
  "artifactRoot": "docs/reports/artifacts/wave4-rendered-head-2026-03-18_10-00-00-abc1234",
  "targets": [
    {
      "routeResults": [
        {
          "expectedTrustExpectation": "required",
          "actualTrustVisible": true
        }
      ]
    }
  ],
  "failures": []
}
JSON

  local output status
  set +e
  output="$(
    QUALITY_TREND_WINDOW=5 \
    QUALITY_TREND_MIN_BASELINE=3 \
    QUALITY_TREND_WRITE_HISTORY=0 \
    QUALITY_TREND_LIGHTHOUSE_SUMMARY="${tmp_dir}/inputs/lighthouse-summary.json" \
    QUALITY_TREND_RENDERED_SUMMARY="${tmp_dir}/inputs/rendered-summary.json" \
    QUALITY_TREND_HISTORY_DIR="${tmp_dir}/history" \
    QUALITY_TREND_ARTIFACT_DIR="${tmp_dir}/artifacts/run-fail" \
    QUALITY_TREND_REPORT_FILE="${tmp_dir}/report-fail.md" \
    node --import tsx "$TREND_SCRIPT" 2>&1
  )"
  status=$?
  set -e

  assert_eq "$status" "1" "statistically significant regression should fail"
  assert_contains "$output" "create.performance" "regression finding output"
  test -f "${tmp_dir}/artifacts/run-fail/summary.json"
  test -f "${tmp_dir}/report-fail.md"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_insufficient_baseline_passes
run_case_statistical_regression_fails

echo "All quality trend gate tests passed."
