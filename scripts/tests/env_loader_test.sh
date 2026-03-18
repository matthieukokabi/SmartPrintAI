#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_LOADER="${ROOT_DIR}/scripts/lib/env_loader.sh"

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
  if ! printf '%s' "$haystack" | grep -F -- "$needle" >/dev/null 2>&1; then
    echo "ASSERTION FAILED: ${message}. missing='${needle}'" >&2
    echo "---- output ----" >&2
    printf '%s\n' "$haystack" >&2
    echo "----------------" >&2
    exit 1
  fi
}

run_case_successful_bootstrap() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  cat > "${tmp_dir}/.env.local" <<'EOF'
DATABASE_URL=postgresql://env-loader:test@localhost:5432/smartprintai
NEXT_PUBLIC_APP_URL=https://smartprintai.com
EOF

  local output
  output="$(bash -c "set -euo pipefail; source '$ENV_LOADER'; smartprintai_bootstrap_env '${tmp_dir}/.env.local' DATABASE_URL NEXT_PUBLIC_APP_URL; printf '%s|%s|%s' \"\$DATABASE_URL\" \"\$NEXT_PUBLIC_APP_URL\" \"\$SMARTPRINTAI_ENV_FILE_LOADED\"")"
  assert_eq "$output" "postgresql://env-loader:test@localhost:5432/smartprintai|https://smartprintai.com|${tmp_dir}/.env.local" "bootstrap should load and export required variables"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_missing_env_file() {
  local output status
  set +e
  output="$(bash -c "set -euo pipefail; source '$ENV_LOADER'; smartprintai_bootstrap_env '/tmp/does-not-exist-wave8.env' DATABASE_URL" 2>&1)"
  status=$?
  set -e

  if [ "$status" -eq 0 ]; then
    echo "ASSERTION FAILED: missing env file should fail" >&2
    exit 1
  fi

  assert_contains "$output" "[env-loader] missing env file: /tmp/does-not-exist-wave8.env" "missing file message"
}

run_case_missing_required_var_message() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  cat > "${tmp_dir}/.env.local" <<'EOF'
NEXT_PUBLIC_APP_URL=https://smartprintai.com
EOF

  local output status
  set +e
  output="$(bash -c "set -euo pipefail; source '$ENV_LOADER'; smartprintai_bootstrap_env '${tmp_dir}/.env.local' DATABASE_URL NEXT_PUBLIC_APP_URL" 2>&1)"
  status=$?
  set -e

  if [ "$status" -eq 0 ]; then
    echo "ASSERTION FAILED: missing required env var should fail" >&2
    exit 1
  fi

  assert_contains "$output" "[env-loader] missing required env vars: DATABASE_URL" "missing var error should name DATABASE_URL"
  assert_contains "$output" "[env-loader] set missing variables in ${tmp_dir}/.env.local and rerun." "missing var remediation message"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_malformed_lines_are_ignored_with_warning() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  cat > "${tmp_dir}/.env.local" <<'EOF'
DATABASE_URL=postgresql://env-loader:test@localhost:5432/smartprintai
MALFORMED_TOKEN_ONLY
EOF

  local output
  output="$(bash -c "set -euo pipefail; source '$ENV_LOADER'; smartprintai_bootstrap_env '${tmp_dir}/.env.local' DATABASE_URL; printf 'DATABASE_URL=%s' \"\$DATABASE_URL\"" 2>&1)"
  assert_contains "$output" "warning: ignored malformed line 2" "malformed line warning should be emitted"
  assert_contains "$output" "DATABASE_URL=postgresql://env-loader:test@localhost:5432/smartprintai" "required variable should still load"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_successful_bootstrap
run_case_missing_env_file
run_case_missing_required_var_message
run_case_malformed_lines_are_ignored_with_warning

echo "All env loader contract tests passed."
