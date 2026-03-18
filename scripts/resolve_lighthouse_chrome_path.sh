#!/usr/bin/env bash
set -euo pipefail

print_missing_binary_help() {
  cat >&2 <<'EOF'
Lighthouse runtime preflight failed: no Chrome/Chromium executable was found.
Remediation (Ubuntu VPS):
  1) Install Google Chrome stable:
     sudo install -d -m 0755 /etc/apt/keyrings
     curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /etc/apt/keyrings/google-chrome.gpg
     echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/google-chrome.gpg] https://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list >/dev/null
     sudo apt-get update
     sudo apt-get install -y google-chrome-stable
  2) Pin the package:
     sudo apt-mark hold google-chrome-stable
  3) Re-run checkpoint, or set LIGHTHOUSE_CHROME_PATH to an installed browser binary.
EOF
}

resolve_from_env() {
  local env_path
  env_path="${LIGHTHOUSE_CHROME_PATH:-}"
  env_path="${env_path#"${env_path%%[![:space:]]*}"}"
  env_path="${env_path%"${env_path##*[![:space:]]}"}"
  if [ -z "$env_path" ]; then
    return 1
  fi

  if [ -x "$env_path" ]; then
    printf '%s\n' "$env_path"
    return 0
  fi

  echo "LIGHTHOUSE_CHROME_PATH is set but not executable: $env_path" >&2
  return 2
}

resolve_from_paths() {
  local candidate candidate_list
  if [ -n "${LIGHTHOUSE_CHROME_STATIC_CANDIDATES:-}" ]; then
    candidate_list="${LIGHTHOUSE_CHROME_STATIC_CANDIDATES}"
  else
    candidate_list=$'/usr/bin/google-chrome-stable\n/usr/bin/google-chrome\n/opt/google/chrome/chrome\n/snap/bin/chromium\n/usr/bin/chromium\n/usr/bin/chromium-browser\n/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  fi

  while IFS= read -r candidate; do
    [ -n "$candidate" ] || continue
    if [ -x "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done <<< "$candidate_list"

  return 1
}

resolve_from_commands() {
  local command_name resolved command_list
  if [ -n "${LIGHTHOUSE_CHROME_COMMAND_CANDIDATES:-}" ]; then
    command_list="${LIGHTHOUSE_CHROME_COMMAND_CANDIDATES}"
  else
    command_list=$'google-chrome-stable\ngoogle-chrome\nchromium\nchromium-browser\nchrome'
  fi

  while IFS= read -r command_name; do
    [ -n "$command_name" ] || continue
    resolved="$(command -v "$command_name" 2>/dev/null || true)"
    if [ -n "$resolved" ] && [ -x "$resolved" ]; then
      printf '%s\n' "$resolved"
      return 0
    fi
  done <<< "$command_list"

  return 1
}

main() {
  local path_output
  if path_output="$(resolve_from_env)"; then
    printf '%s\n' "$path_output"
    return 0
  fi
  case $? in
    2)
      print_missing_binary_help
      return 2
      ;;
  esac

  if path_output="$(resolve_from_paths)"; then
    printf '%s\n' "$path_output"
    return 0
  fi

  if path_output="$(resolve_from_commands)"; then
    printf '%s\n' "$path_output"
    return 0
  fi

  print_missing_binary_help
  return 3
}

main "$@"
