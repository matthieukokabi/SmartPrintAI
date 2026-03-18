#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SYNC_SCRIPT="${ROOT_DIR}/scripts/sync_vps_checkpoint_artifacts.sh"

assert_eq() {
  local actual="$1"
  local expected="$2"
  local message="$3"
  if [ "$actual" != "$expected" ]; then
    echo "ASSERTION FAILED: ${message}. expected='${expected}' actual='${actual}'" >&2
    exit 1
  fi
}

assert_file_exists() {
  local file_path="$1"
  local message="$2"
  if [ ! -f "$file_path" ]; then
    echo "ASSERTION FAILED: ${message}. missing file '${file_path}'" >&2
    exit 1
  fi
}

setup_fixture_workspace() {
  local tmp_dir="$1"
  mkdir -p "${tmp_dir}/scripts" "${tmp_dir}/docs/reports/artifacts"
  cp "$SYNC_SCRIPT" "${tmp_dir}/scripts/sync_vps_checkpoint_artifacts.sh"
  chmod +x "${tmp_dir}/scripts/sync_vps_checkpoint_artifacts.sh"
}

setup_remote_fixture() {
  local remote_root="$1"
  mkdir -p \
    "${remote_root}/docs/reports/artifacts/wave5-checkpoints" \
    "${remote_root}/docs/reports/artifacts/wave5-rendered-semantics-2026-03-18_21-48-49-abc1234" \
    "${remote_root}/docs/reports/artifacts/wave5-lighthouse-deterministic-2026-03-18_21-48-49-abc1234" \
    "${remote_root}/docs/reports/artifacts/wave5-trend-history-2026-03-18_21-48-49-abc1234" \
    "${remote_root}/docs/reports/artifacts/wave6-conversion-insights-2026-03-18_21-48-49-abc1234" \
    "${remote_root}/docs/reports/artifacts/wave6-alerts-2026-03-18_21-48-49-abc1234" \
    "${remote_root}/docs/reports/artifacts/wave6-alert-state"

  cat > "${remote_root}/docs/reports/artifacts/wave5-checkpoints/latest.json" <<'JSON'
{
  "generatedAt": "2026-03-18T21:48:49Z",
  "commitSha": "abc1234",
  "stages": {
    "rendered": { "summary": "docs/reports/artifacts/wave5-rendered-semantics-2026-03-18_21-48-49-abc1234/summary.json" },
    "lighthouse": { "summary": "docs/reports/artifacts/wave5-lighthouse-deterministic-2026-03-18_21-48-49-abc1234/summary.json" },
    "trend": {
      "summary": "docs/reports/artifacts/wave5-trend-history-2026-03-18_21-48-49-abc1234/summary.json",
      "report": "docs/reports/WAVE5_TREND_GATE_2026-03-18_21-48-49_abc1234.md"
    },
    "conversion": {
      "summary": "docs/reports/artifacts/wave6-conversion-insights-2026-03-18_21-48-49-abc1234/summary.json",
      "report": "docs/reports/WAVE6_CONVERSION_INSIGHTS_2026-03-18_21-48-49_abc1234.md"
    },
    "alerts": {
      "summary": "docs/reports/artifacts/wave6-alerts-2026-03-18_21-48-49-abc1234/summary.json",
      "report": "docs/reports/WAVE6_ALERTS_2026-03-18_21-48-49_abc1234.md",
      "state": "docs/reports/artifacts/wave6-alert-state/state.json"
    }
  },
  "snapshot": {
    "json": "docs/reports/artifacts/wave5-checkpoints/snapshot-2026-03-18_21-48-49-abc1234.json",
    "report": "docs/reports/WAVE5_QUALITY_SNAPSHOT_2026-03-18_21-48-49_abc1234.md"
  }
}
JSON

  cp \
    "${remote_root}/docs/reports/artifacts/wave5-checkpoints/latest.json" \
    "${remote_root}/docs/reports/artifacts/wave5-checkpoints/checkpoint-2026-03-18_21-48-49-abc1234.json"

  cat > "${remote_root}/docs/reports/artifacts/wave5-checkpoints/latest-snapshot.json" <<'JSON'
{"overallFlag":"green"}
JSON

  cat > "${remote_root}/docs/reports/artifacts/wave5-checkpoints/snapshot-2026-03-18_21-48-49-abc1234.json" <<'JSON'
{"overallFlag":"green","source":"fixture"}
JSON

  cat > "${remote_root}/docs/reports/artifacts/wave5-rendered-semantics-2026-03-18_21-48-49-abc1234/summary.json" <<'JSON'
{"failures":[]}
JSON
  cat > "${remote_root}/docs/reports/artifacts/wave5-lighthouse-deterministic-2026-03-18_21-48-49-abc1234/summary.json" <<'JSON'
{"failures":[]}
JSON
  cat > "${remote_root}/docs/reports/artifacts/wave5-trend-history-2026-03-18_21-48-49-abc1234/summary.json" <<'JSON'
{"status":"pass"}
JSON
  cat > "${remote_root}/docs/reports/artifacts/wave6-conversion-insights-2026-03-18_21-48-49-abc1234/summary.json" <<'JSON'
{"status":"ok"}
JSON
  cat > "${remote_root}/docs/reports/artifacts/wave6-alerts-2026-03-18_21-48-49-abc1234/summary.json" <<'JSON'
{"alerts":[]}
JSON
  cat > "${remote_root}/docs/reports/artifacts/wave6-alert-state/state.json" <<'JSON'
{"alerts":[]}
JSON

  cat > "${remote_root}/docs/reports/WAVE5_TREND_GATE_2026-03-18_21-48-49_abc1234.md" <<'EOF'
# trend fixture
EOF
  cat > "${remote_root}/docs/reports/WAVE6_CONVERSION_INSIGHTS_2026-03-18_21-48-49_abc1234.md" <<'EOF'
# conversion fixture
EOF
  cat > "${remote_root}/docs/reports/WAVE6_ALERTS_2026-03-18_21-48-49_abc1234.md" <<'EOF'
# alerts fixture
EOF
  cat > "${remote_root}/docs/reports/WAVE5_QUALITY_SNAPSHOT_2026-03-18_21-48-49_abc1234.md" <<'EOF'
# snapshot fixture
EOF
}

run_case_sync_success() {
  local tmp_dir remote_root
  tmp_dir="$(mktemp -d)"
  remote_root="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir" "$remote_root"' RETURN

  setup_fixture_workspace "$tmp_dir"
  setup_remote_fixture "$remote_root"

  (
    cd "$tmp_dir"
    bash scripts/sync_vps_checkpoint_artifacts.sh --source-root "$remote_root" >/dev/null
  )

  assert_file_exists "${tmp_dir}/docs/reports/artifacts/wave5-checkpoints/latest.json" "latest checkpoint should be synced"
  assert_file_exists "${tmp_dir}/docs/reports/artifacts/wave5-checkpoints/checkpoint-2026-03-18_21-48-49-abc1234.json" "run checkpoint should be synced"
  assert_file_exists "${tmp_dir}/docs/reports/artifacts/wave5-rendered-semantics-2026-03-18_21-48-49-abc1234/summary.json" "rendered summary should be synced"

  local sync_json
  sync_json="$(ls -1 "${tmp_dir}/docs/reports/artifacts"/wave8-artifact-sync-*/wave8-artifact-sync-*.json | head -n 1)"
  assert_file_exists "$sync_json" "wave8 sync summary json should exist"

  local commit_sha
  commit_sha="$(node -e "const fs=require('fs');const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(data.checkpointCommitSha||''));" "$sync_json")"
  assert_eq "$commit_sha" "abc1234" "sync summary should capture checkpoint commit sha"

  rm -rf "$tmp_dir" "$remote_root"
  trap - RETURN
}

run_case_missing_latest_file_fails() {
  local tmp_dir remote_root status
  tmp_dir="$(mktemp -d)"
  remote_root="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir" "$remote_root"' RETURN

  setup_fixture_workspace "$tmp_dir"
  mkdir -p "${remote_root}/docs/reports/artifacts/wave5-checkpoints"

  set +e
  (
    cd "$tmp_dir"
    bash scripts/sync_vps_checkpoint_artifacts.sh --source-root "$remote_root" >/dev/null 2>&1
  )
  status=$?
  set -e

  if [ "$status" -eq 0 ]; then
    echo "ASSERTION FAILED: sync should fail when latest checkpoint is missing" >&2
    exit 1
  fi

  rm -rf "$tmp_dir" "$remote_root"
  trap - RETURN
}

run_case_sync_success
run_case_missing_latest_file_fails

echo "All VPS artifact sync tests passed."
