#!/usr/bin/env bash

# Shared environment bootstrap for VPS operations scripts.

smartprintai_load_env_file() {
  local env_file="${1:-}"
  local line_number=0
  local raw_line trimmed_line key value
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

  while IFS= read -r raw_line || [ -n "$raw_line" ]; do
    line_number=$((line_number + 1))
    trimmed_line="${raw_line#"${raw_line%%[![:space:]]*}"}"
    trimmed_line="${trimmed_line%"${trimmed_line##*[![:space:]]}"}"

    if [ -z "$trimmed_line" ] || [[ "$trimmed_line" == \#* ]]; then
      continue
    fi

    if [[ "$trimmed_line" == export[[:space:]]* ]]; then
      trimmed_line="${trimmed_line#export }"
      trimmed_line="${trimmed_line#"${trimmed_line%%[![:space:]]*}"}"
    fi

    if [[ "$trimmed_line" != *=* ]]; then
      echo "[env-loader] warning: ignored malformed line ${line_number} in ${env_file}" >&2
      continue
    fi

    key="${trimmed_line%%=*}"
    value="${trimmed_line#*=}"
    key="${key%"${key##*[![:space:]]}"}"
    key="${key#"${key%%[![:space:]]*}"}"
    value="${value#"${value%%[![:space:]]*}"}"

    if [[ ! "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
      echo "[env-loader] warning: ignored invalid key '${key}' on line ${line_number} in ${env_file}" >&2
      continue
    fi

    if [[ "$value" == \"*\" && "$value" == *\" ]] || [[ "$value" == \'*\' && "$value" == *\' ]]; then
      value="${value:1:${#value}-2}"
    fi

    printf -v "$key" '%s' "$value"
    export "$key"
  done < "$env_file"

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
