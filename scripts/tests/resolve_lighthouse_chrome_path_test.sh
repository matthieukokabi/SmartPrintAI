#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
RESOLVER_SCRIPT="${ROOT_DIR}/scripts/resolve_lighthouse_chrome_path.sh"

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

make_fake_browser() {
  local target="$1"
  cat > "$target" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
echo "fake-browser"
EOF
  chmod +x "$target"
}

run_case_env_path_wins() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  make_fake_browser "${tmp_dir}/chrome-env"
  local resolved
  resolved="$(LIGHTHOUSE_CHROME_PATH="${tmp_dir}/chrome-env" "$RESOLVER_SCRIPT")"
  assert_eq "$resolved" "${tmp_dir}/chrome-env" "env path should be used when executable"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_invalid_env_path_fails() {
  local output status

  set +e
  output="$(
    LIGHTHOUSE_CHROME_PATH="/tmp/does-not-exist-wave8" \
    LIGHTHOUSE_CHROME_STATIC_CANDIDATES="/tmp/nope-static" \
    LIGHTHOUSE_CHROME_COMMAND_CANDIDATES="missing-browser" \
    "$RESOLVER_SCRIPT" 2>&1
  )"
  status=$?
  set -e

  if [ "$status" -eq 0 ]; then
    echo "ASSERTION FAILED: invalid LIGHTHOUSE_CHROME_PATH should fail" >&2
    exit 1
  fi

  assert_contains "$output" "LIGHTHOUSE_CHROME_PATH is set but not executable" "invalid env path error message"
  assert_contains "$output" "Lighthouse runtime preflight failed" "remediation header should be present"
}

run_case_command_resolution() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  mkdir -p "${tmp_dir}/bin"
  make_fake_browser "${tmp_dir}/bin/google-chrome-stable"

  local resolved
  resolved="$(
    LIGHTHOUSE_CHROME_STATIC_CANDIDATES="/tmp/nope-static" \
    LIGHTHOUSE_CHROME_COMMAND_CANDIDATES="google-chrome-stable" \
    PATH="${tmp_dir}/bin:${PATH}" \
    "$RESOLVER_SCRIPT"
  )"
  assert_eq "$resolved" "${tmp_dir}/bin/google-chrome-stable" "command fallback should resolve browser binary"

  rm -rf "$tmp_dir"
  trap - RETURN
}

run_case_missing_binary_help() {
  local output status

  set +e
  output="$(
    env -u LIGHTHOUSE_CHROME_PATH \
    LIGHTHOUSE_CHROME_STATIC_CANDIDATES="/tmp/nope-static" \
    LIGHTHOUSE_CHROME_COMMAND_CANDIDATES="missing-browser" \
    "$RESOLVER_SCRIPT" 2>&1
  )"
  status=$?
  set -e

  if [ "$status" -eq 0 ]; then
    echo "ASSERTION FAILED: resolver should fail when no binary exists" >&2
    exit 1
  fi

  assert_contains "$output" "Lighthouse runtime preflight failed" "missing binary help header"
  assert_contains "$output" "apt-get install -y google-chrome-stable" "missing binary remediation command"
}

run_case_env_path_wins
run_case_invalid_env_path_fails
run_case_command_resolution
run_case_missing_binary_help

echo "All Lighthouse runtime resolver tests passed."
