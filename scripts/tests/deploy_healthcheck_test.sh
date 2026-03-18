#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ORIGINAL_PATH="$PATH"

# shellcheck source=/dev/null
source "${ROOT_DIR}/scripts/lib/deploy_healthcheck.sh"

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

run_case() {
  local name="$1"
  local sequence_csv="$2"
  local retries="$3"
  local expected_status="$4"
  local expected_calls="$5"
  local expected_sleep_calls="$6"
  local expected_output_fragment="$7"

  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  mkdir -p "${tmp_dir}/bin"

  IFS=',' read -r -a codes <<< "$sequence_csv"
  printf '%s\n' "${codes[@]}" > "${tmp_dir}/sequence.txt"
  : > "${tmp_dir}/sleep.log"

  cat > "${tmp_dir}/bin/curl" <<'MOCK_CURL'
#!/usr/bin/env bash
set -euo pipefail

sequence_file="${MOCK_CURL_SEQUENCE_FILE:?}"
state_file="${MOCK_CURL_STATE_FILE:?}"

calls=0
if [ -f "$state_file" ]; then
  calls="$(cat "$state_file")"
fi

total_lines="$(wc -l < "$sequence_file" | tr -d '[:space:]')"
if [ -z "$total_lines" ] || [ "$total_lines" -eq 0 ]; then
  code="000"
else
  line_no=$((calls + 1))
  if [ "$line_no" -gt "$total_lines" ]; then
    line_no="$total_lines"
  fi
  code="$(sed -n "${line_no}p" "$sequence_file")"
fi

echo $((calls + 1)) > "$state_file"
printf '%s' "$code"

if [ "$code" = "000" ]; then
  exit 7
fi
exit 0
MOCK_CURL
  chmod +x "${tmp_dir}/bin/curl"

  cat > "${tmp_dir}/bin/sleep" <<'MOCK_SLEEP'
#!/usr/bin/env bash
set -euo pipefail
echo "${1:-}" >> "${MOCK_SLEEP_LOG:?}"
exit 0
MOCK_SLEEP
  chmod +x "${tmp_dir}/bin/sleep"

  export MOCK_CURL_SEQUENCE_FILE="${tmp_dir}/sequence.txt"
  export MOCK_CURL_STATE_FILE="${tmp_dir}/state.txt"
  export MOCK_SLEEP_LOG="${tmp_dir}/sleep.log"
  export PATH="${tmp_dir}/bin:${ORIGINAL_PATH}"

  local output status
  set +e
  output="$(check_http_with_retry "${name}" "http://example.test/health" "200" "$retries" "1" 2>&1)"
  status=$?
  set -e

  local call_count sleep_calls
  call_count="$(cat "${tmp_dir}/state.txt")"
  sleep_calls="$(wc -l < "${tmp_dir}/sleep.log" | tr -d '[:space:]')"

  assert_eq "$status" "$expected_status" "${name}: status"
  assert_eq "$call_count" "$expected_calls" "${name}: curl call count"
  assert_eq "$sleep_calls" "$expected_sleep_calls" "${name}: sleep call count"
  assert_contains "$output" "$expected_output_fragment" "${name}: output fragment"

  PATH="$ORIGINAL_PATH"
  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case "immediate_success" "200" "3" "0" "1" "0" "immediate_success=200 (attempt 1/3)"
run_case "flaky_recovery" "000,200" "3" "0" "2" "1" "flaky_recovery=200 (attempt 2/3)"
run_case "retry_exhaustion" "503" "3" "1" "3" "2" "ERROR: retry_exhaustion expected 200, got 503 after 3 attempts"
run_case "network_exhaustion" "000" "2" "1" "2" "1" "ERROR: network_exhaustion expected 200, got 000 after 2 attempts"

echo "All deploy healthcheck retry tests passed."
