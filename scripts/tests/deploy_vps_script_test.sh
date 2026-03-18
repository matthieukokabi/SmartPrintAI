#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DEPLOY_SCRIPT="${ROOT_DIR}/scripts/deploy_vps.sh"
ORIGINAL_PATH="$PATH"

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

json_value() {
  local json_input="$1"
  local path_expr="$2"
  node -e "const data=JSON.parse(process.argv[1]);const keys=process.argv[2].split('.');let cur=data;for(const key of keys){cur=cur?.[key];}if(cur===undefined){process.exit(2);}process.stdout.write(String(cur));" "$json_input" "$path_expr"
}

run_case() {
  local name="$1"
  local remote_exit="$2"
  local expected_status="$3"
  local expected_stage="$4"
  local expected_final_status="$5"
  local expected_remote_status="$6"
  local expected_service_active="$7"

  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  mkdir -p "${tmp_dir}/bin"

  cat > "${tmp_dir}/bin/git" <<'MOCK_GIT'
#!/usr/bin/env bash
set -euo pipefail

args="$*"
if [[ "$args" == *"rev-parse --git-dir"* ]]; then
  echo ".git"
  exit 0
fi
if [[ "$args" == *"status --porcelain"* ]]; then
  exit 0
fi
if [[ "$args" == *"rev-parse --short HEAD"* ]]; then
  echo "abc1234"
  exit 0
fi
if [[ "$args" == *"archive --format=tar HEAD"* ]]; then
  tar -cf - --files-from /dev/null
  exit 0
fi

echo "Unexpected git invocation: $args" >&2
exit 1
MOCK_GIT
  chmod +x "${tmp_dir}/bin/git"

  cat > "${tmp_dir}/bin/ssh" <<'MOCK_SSH'
#!/usr/bin/env bash
set -euo pipefail

state_file="${MOCK_SSH_STATE_FILE:?}"
remote_exit="${MOCK_REMOTE_EXIT:-0}"

calls=0
if [ -f "$state_file" ]; then
  calls="$(cat "$state_file")"
fi
calls=$((calls + 1))
echo "$calls" > "$state_file"

if [ "$calls" -eq 1 ]; then
  cat >/dev/null || true
  exit 0
fi

if [ "$remote_exit" -eq 0 ]; then
  echo 'DEPLOY_REMOTE_STATUS_JSON={"status":"success","exitCode":0,"install":"skipped","migrations":"skipped","build":"success","serviceRestart":"success","serviceActive":"active","checks":{"local_root":"pass","local_blog":"pass","local_feed":"pass","public_root":"skipped","public_blog":"skipped","public_feed":"skipped"}}'
  exit 0
fi

echo 'DEPLOY_REMOTE_STATUS_JSON={"status":"failed","exitCode":1,"install":"skipped","migrations":"skipped","build":"success","serviceRestart":"success","serviceActive":"inactive","checks":{"local_root":"pass","local_blog":"fail","local_feed":"skipped","public_root":"skipped","public_blog":"skipped","public_feed":"skipped"}}'
exit "$remote_exit"
MOCK_SSH
  chmod +x "${tmp_dir}/bin/ssh"

  export MOCK_SSH_STATE_FILE="${tmp_dir}/ssh_state.txt"
  export MOCK_REMOTE_EXIT="$remote_exit"
  export PATH="${tmp_dir}/bin:${ORIGINAL_PATH}"

  local output status
  set +e
  output="$("$DEPLOY_SCRIPT" --allow-dirty --skip-install --skip-migrate --skip-public-checks --host mock-host --app-dir /tmp/mock-app --service mock-service --public-url https://example.test 2>&1)"
  status=$?
  set -e

  assert_eq "$status" "$expected_status" "${name}: exit status"
  assert_contains "$output" "DEPLOY_REMOTE_STATUS_JSON=" "${name}: remote summary present"
  assert_contains "$output" "DEPLOY_STATUS_JSON=" "${name}: deploy summary present"

  local deploy_json
  deploy_json="$(printf '%s\n' "$output" | grep '^DEPLOY_STATUS_JSON=' | tail -n 1 | sed 's/^DEPLOY_STATUS_JSON=//')"

  assert_eq "$(json_value "$deploy_json" "stage")" "$expected_stage" "${name}: stage"
  assert_eq "$(json_value "$deploy_json" "status")" "$expected_final_status" "${name}: final status"
  assert_eq "$(json_value "$deploy_json" "remote.status")" "$expected_remote_status" "${name}: remote status"
  assert_eq "$(json_value "$deploy_json" "remote.serviceActive")" "$expected_service_active" "${name}: service active status"

  if [ "$expected_status" -ne 0 ]; then
    assert_contains "$output" "ERROR: remote deployment failed" "${name}: actionable failure"
  fi

  PATH="$ORIGINAL_PATH"
  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case "deploy_success" "0" "0" "completed" "success" "success" "active"
run_case "deploy_remote_failure" "1" "1" "remote" "failed" "failed" "inactive"

echo "All deploy_vps script tests passed."
