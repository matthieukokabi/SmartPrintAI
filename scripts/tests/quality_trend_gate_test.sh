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

assert_not_eq() {
  local actual="$1"
  local unexpected="$2"
  local message="$3"
  if [ "$actual" = "$unexpected" ]; then
    echo "ASSERTION FAILED: ${message}. unexpected='${unexpected}'" >&2
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

json_value() {
  local file_path="$1"
  local path_expr="$2"
  node -e "const fs=require('fs');const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const keys=process.argv[2].split('.');let cur=data;for(const key of keys){cur=cur?.[key];}if(cur===undefined){process.exit(2);}process.stdout.write(String(cur));" "$file_path" "$path_expr"
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
  test -f "${tmp_dir}/history/trend_lifecycle_state.json"
  test -f "${tmp_dir}/artifacts/run-pass/summary.json"
  test -f "${tmp_dir}/report-pass.md"

  assert_eq "$(json_value "${tmp_dir}/artifacts/run-pass/summary.json" "status")" "warmup" "warmup status for insufficient baseline"
  assert_eq "$(json_value "${tmp_dir}/artifacts/run-pass/summary.json" "mode")" "warmup" "warmup mode for insufficient baseline"
  assert_eq "$(json_value "${tmp_dir}/artifacts/run-pass/summary.json" "warmup.active")" "true" "warmup active flag"
  assert_eq "$(json_value "${tmp_dir}/artifacts/run-pass/summary.json" "warmup.eta.remainingRuns")" "3" "warmup eta remaining runs"
  assert_eq "$(json_value "${tmp_dir}/artifacts/run-pass/summary.json" "warmup.eta.checkpointIntervalHours")" "24" "default checkpoint interval"

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
  assert_eq "$(json_value "${tmp_dir}/artifacts/run-fail/summary.json" "status")" "fail" "fail status when findings exist"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_retention_trims_history() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  mkdir -p "${tmp_dir}/inputs" "${tmp_dir}/history" "${tmp_dir}/artifacts"

  cat > "${tmp_dir}/history/lighthouse_history.json" <<'JSON'
[
  { "generatedAt": "2026-03-10T10:00:00.000Z", "commitSha": "h1", "summaryPath": "l1", "overall": { "performance": 0.9, "accessibility": 0.9, "seo": 0.9 }, "routes": { "create": { "performance": 0.9, "accessibility": 0.9, "seo": 0.9 } } },
  { "generatedAt": "2026-03-11T10:00:00.000Z", "commitSha": "h2", "summaryPath": "l2", "overall": { "performance": 0.9, "accessibility": 0.9, "seo": 0.9 }, "routes": { "create": { "performance": 0.9, "accessibility": 0.9, "seo": 0.9 } } },
  { "generatedAt": "2026-03-12T10:00:00.000Z", "commitSha": "h3", "summaryPath": "l3", "overall": { "performance": 0.9, "accessibility": 0.9, "seo": 0.9 }, "routes": { "create": { "performance": 0.9, "accessibility": 0.9, "seo": 0.9 } } }
]
JSON

  cat > "${tmp_dir}/history/rendered_head_history.json" <<'JSON'
[
  { "generatedAt": "2026-03-10T10:00:00.000Z", "commitSha": "h1", "summaryPath": "r1", "failureCount": 0, "requiredTrustVisible": 5, "requiredTrustTotal": 5, "requiredTrustRate": 1 },
  { "generatedAt": "2026-03-11T10:00:00.000Z", "commitSha": "h2", "summaryPath": "r2", "failureCount": 0, "requiredTrustVisible": 5, "requiredTrustTotal": 5, "requiredTrustRate": 1 },
  { "generatedAt": "2026-03-12T10:00:00.000Z", "commitSha": "h3", "summaryPath": "r3", "failureCount": 0, "requiredTrustVisible": 5, "requiredTrustTotal": 5, "requiredTrustRate": 1 }
]
JSON

  cat > "${tmp_dir}/inputs/lighthouse-summary.json" <<'JSON'
{
  "generatedAt": "2026-03-18T10:00:00.000Z",
  "generatedDate": "2026-03-18",
  "artifactRoot": "docs/reports/artifacts/lighthouse-2026-03-18_10-00-00",
  "routeResults": [
    { "key": "create", "path": "/create", "finalScores": { "performance": 0.91, "accessibility": 0.95, "seo": 0.97 } }
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
    { "routeResults": [ { "expectedTrustExpectation": "required", "actualTrustVisible": true } ] }
  ],
  "failures": []
}
JSON

  QUALITY_TREND_MIN_BASELINE=10 \
  QUALITY_TREND_HISTORY_RETENTION=2 \
  QUALITY_TREND_LIGHTHOUSE_SUMMARY="${tmp_dir}/inputs/lighthouse-summary.json" \
  QUALITY_TREND_RENDERED_SUMMARY="${tmp_dir}/inputs/rendered-summary.json" \
  QUALITY_TREND_HISTORY_DIR="${tmp_dir}/history" \
  QUALITY_TREND_ARTIFACT_DIR="${tmp_dir}/artifacts/run-retention" \
  QUALITY_TREND_REPORT_FILE="${tmp_dir}/report-retention.md" \
  node --import tsx "$TREND_SCRIPT" >/dev/null

  local lighthouse_count rendered_count
  lighthouse_count="$(node -e "const fs=require('fs');const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(data.length));" "${tmp_dir}/history/lighthouse_history.json")"
  rendered_count="$(node -e "const fs=require('fs');const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(data.length));" "${tmp_dir}/history/rendered_head_history.json")"
  assert_eq "$lighthouse_count" "2" "lighthouse history retention"
  assert_eq "$rendered_count" "2" "rendered history retention"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_warmup_transitions_to_active() {
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
    "routes": { "create": { "performance": 0.95, "accessibility": 0.95, "seo": 0.95 } }
  },
  {
    "generatedAt": "2026-03-16T10:00:00.000Z",
    "commitSha": "hist002",
    "summaryPath": "docs/reports/artifacts/lighthouse-2026-03-16_10-00-00/summary.json",
    "overall": { "performance": 0.95, "accessibility": 0.95, "seo": 0.95 },
    "routes": { "create": { "performance": 0.95, "accessibility": 0.95, "seo": 0.95 } }
  },
  {
    "generatedAt": "2026-03-17T10:00:00.000Z",
    "commitSha": "hist003",
    "summaryPath": "docs/reports/artifacts/lighthouse-2026-03-17_10-00-00/summary.json",
    "overall": { "performance": 0.95, "accessibility": 0.95, "seo": 0.95 },
    "routes": { "create": { "performance": 0.95, "accessibility": 0.95, "seo": 0.95 } }
  }
]
JSON

  cat > "${tmp_dir}/history/rendered_head_history.json" <<'JSON'
[
  {
    "generatedAt": "2026-03-15T10:00:00.000Z",
    "commitSha": "hist001",
    "summaryPath": "docs/reports/artifacts/wave5-rendered-semantics-2026-03-15_10-00-00-hist001/summary.json",
    "failureCount": 0,
    "requiredTrustVisible": 5,
    "requiredTrustTotal": 5,
    "requiredTrustRate": 1
  },
  {
    "generatedAt": "2026-03-16T10:00:00.000Z",
    "commitSha": "hist002",
    "summaryPath": "docs/reports/artifacts/wave5-rendered-semantics-2026-03-16_10-00-00-hist002/summary.json",
    "failureCount": 0,
    "requiredTrustVisible": 5,
    "requiredTrustTotal": 5,
    "requiredTrustRate": 1
  },
  {
    "generatedAt": "2026-03-17T10:00:00.000Z",
    "commitSha": "hist003",
    "summaryPath": "docs/reports/artifacts/wave5-rendered-semantics-2026-03-17_10-00-00-hist003/summary.json",
    "failureCount": 0,
    "requiredTrustVisible": 5,
    "requiredTrustTotal": 5,
    "requiredTrustRate": 1
  }
]
JSON

  cat > "${tmp_dir}/history/trend_lifecycle_state.json" <<'JSON'
{
  "mode": "warmup",
  "activeSince": null,
  "updatedAt": "2026-03-17T10:00:00.000Z",
  "minBaseline": 3,
  "baselineCount": {
    "lighthouse": 0,
    "rendered": 0
  }
}
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
        "performance": 0.95,
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
  "artifactRoot": "docs/reports/artifacts/wave5-rendered-semantics-2026-03-18_10-00-00-abc1234",
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

  QUALITY_TREND_WINDOW=5 \
  QUALITY_TREND_MIN_BASELINE=3 \
  QUALITY_TREND_LIGHTHOUSE_SUMMARY="${tmp_dir}/inputs/lighthouse-summary.json" \
  QUALITY_TREND_RENDERED_SUMMARY="${tmp_dir}/inputs/rendered-summary.json" \
  QUALITY_TREND_HISTORY_DIR="${tmp_dir}/history" \
  QUALITY_TREND_ARTIFACT_DIR="${tmp_dir}/artifacts/run-active-first" \
  QUALITY_TREND_REPORT_FILE="${tmp_dir}/report-active-first.md" \
  node --import tsx "$TREND_SCRIPT" >/dev/null

  assert_eq "$(json_value "${tmp_dir}/artifacts/run-active-first/summary.json" "status")" "pass" "active transition status"
  assert_eq "$(json_value "${tmp_dir}/artifacts/run-active-first/summary.json" "mode")" "active" "active mode after warmup completion"
  assert_eq "$(json_value "${tmp_dir}/artifacts/run-active-first/summary.json" "lifecycle.justActivated")" "true" "activation transition should be detected"
  assert_not_eq "$(json_value "${tmp_dir}/artifacts/run-active-first/summary.json" "lifecycle.activeSince")" "null" "activeSince should be populated"
  assert_eq "$(json_value "${tmp_dir}/history/trend_lifecycle_state.json" "mode")" "active" "lifecycle state persisted as active"

  QUALITY_TREND_WINDOW=5 \
  QUALITY_TREND_MIN_BASELINE=3 \
  QUALITY_TREND_LIGHTHOUSE_SUMMARY="${tmp_dir}/inputs/lighthouse-summary.json" \
  QUALITY_TREND_RENDERED_SUMMARY="${tmp_dir}/inputs/rendered-summary.json" \
  QUALITY_TREND_HISTORY_DIR="${tmp_dir}/history" \
  QUALITY_TREND_ARTIFACT_DIR="${tmp_dir}/artifacts/run-active-second" \
  QUALITY_TREND_REPORT_FILE="${tmp_dir}/report-active-second.md" \
  node --import tsx "$TREND_SCRIPT" >/dev/null

  assert_eq "$(json_value "${tmp_dir}/artifacts/run-active-second/summary.json" "mode")" "active" "active mode remains active"
  assert_eq "$(json_value "${tmp_dir}/artifacts/run-active-second/summary.json" "lifecycle.justActivated")" "false" "activation transition should not repeat"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_insufficient_baseline_passes
run_case_statistical_regression_fails
run_case_retention_trims_history
run_case_warmup_transitions_to_active

echo "All quality trend gate tests passed."
