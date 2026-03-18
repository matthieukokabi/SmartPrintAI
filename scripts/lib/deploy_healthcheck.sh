#!/usr/bin/env bash

check_http_with_retry() {
  local label="$1"
  local url="$2"
  local expected="${3:-200}"
  local retries="${4:-20}"
  local delay_seconds="${5:-1}"
  local code="000"
  local attempt

  for attempt in $(seq 1 "$retries"); do
    code=$(curl -sS -o /dev/null -w '%{http_code}' "$url" || true)
    echo "${label}=${code} (attempt ${attempt}/${retries})"
    if [ "$code" = "$expected" ]; then
      return 0
    fi
    if [ "$attempt" -lt "$retries" ]; then
      sleep "$delay_seconds"
    fi
  done

  echo "ERROR: ${label} expected ${expected}, got ${code} after ${retries} attempts" >&2
  return 1
}
