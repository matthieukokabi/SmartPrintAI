#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${UPTIME_BASE_URL:-http://127.0.0.1:3100}"
TIMEOUT_SEC="${UPTIME_TIMEOUT_SEC:-10}"

check_endpoint() {
  local path="$1"
  local expected_status="$2"

  local status
  status=$(curl -sS --max-time "$TIMEOUT_SEC" -o /dev/null -w "%{http_code}" "${BASE_URL}${path}")

  if [[ "$status" != "$expected_status" ]]; then
    echo "[uptime] FAIL ${path}: expected ${expected_status}, got ${status}" >&2
    return 1
  fi

  echo "[uptime] OK ${path}: ${status}"
}

echo "[uptime] Checking SmartPrintAI at ${BASE_URL}"
check_endpoint "/" "200"
check_endpoint "/api/products" "200"

echo "[uptime] All checks passed"
