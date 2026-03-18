#!/usr/bin/env bash

# Shared environment bootstrap for VPS operations scripts.

smartprintai_load_env_file() {
  local env_file="${1:-}"
  if [ -z "$env_file" ]; then
    echo "[env-loader] missing env file path input." >&2
    return 2
  fi

  if [ ! -f "$env_file" ]; then
    echo "[env-loader] missing env file: ${env_file}" >&2
    echo "[env-loader] create the file or set SMARTPRINTAI_ENV_FILE to a valid path." >&2
    return 3
  fi

  if [ ! -r "$env_file" ]; then
    echo "[env-loader] env file is not readable: ${env_file}" >&2
    return 4
  fi

  set -a
  # shellcheck source=/dev/null
  . "$env_file"
  set +a
  export SMARTPRINTAI_ENV_FILE_LOADED="$env_file"
}

smartprintai_require_env_vars() {
  local var_name missing=()
  for var_name in "$@"; do
    if [ -z "${!var_name:-}" ]; then
      missing+=("$var_name")
    fi
  done

  if [ "${#missing[@]}" -gt 0 ]; then
    echo "[env-loader] missing required env vars: ${missing[*]}" >&2
    echo "[env-loader] set missing variables in ${SMARTPRINTAI_ENV_FILE_LOADED:-the loaded env file} and rerun." >&2
    return 5
  fi
}

smartprintai_bootstrap_env() {
  local env_file="${1:-}"
  local status=0
  shift || true

  smartprintai_load_env_file "$env_file"
  status=$?
  if [ "$status" -ne 0 ]; then
    return "$status"
  fi

  if [ "$#" -gt 0 ]; then
    smartprintai_require_env_vars "$@"
    status=$?
    if [ "$status" -ne 0 ]; then
      return "$status"
    fi
  fi
}
