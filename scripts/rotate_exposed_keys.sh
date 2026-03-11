#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/root/smartprintai"
ENV_FILE="$APP_DIR/.env.local"
SERVICE_NAME="smartprintai"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found"
  exit 1
fi

prompt_secret() {
  local label="$1"
  local value1=""
  local value2=""

  while true; do
    read -r -s -p "Paste NEW ${label}: " value1
    printf '\n' >&2
    [[ -n "${value1}" ]] || { echo "${label} cannot be empty."; continue; }

    read -r -s -p "Re-paste NEW ${label} to confirm: " value2
    printf '\n' >&2
    [[ "$value1" == "$value2" ]] || { echo "Values do not match. Try again."; continue; }

    printf '%s' "$value1"
    return 0
  done
}

upsert_env() {
  local key="$1"
  local val="$2"
  local tmp
  tmp="$(mktemp)"

  awk -v k="$key" -v v="$val" '
    BEGIN { done=0 }
    $0 ~ ("^" k "=") {
      if (!done) { print k "=" v; done=1 }
      next
    }
    { print }
    END {
      if (!done) print k "=" v
    }
  ' "$ENV_FILE" > "$tmp"

  mv "$tmp" "$ENV_FILE"
}

echo "Creating backup..."
cp "$ENV_FILE" "${ENV_FILE}.bak.$(date +%F-%H%M%S)"

echo "Rotate sensitive keys (input hidden; no characters will appear while typing)."
NEW_PRINTFUL_API_KEY="$(prompt_secret "PRINTFUL_API_KEY")"
NEW_RESEND_API_KEY="$(prompt_secret "RESEND_API_KEY")"

upsert_env "PRINTFUL_API_KEY" "$NEW_PRINTFUL_API_KEY"
upsert_env "RESEND_API_KEY" "$NEW_RESEND_API_KEY"

unset NEW_PRINTFUL_API_KEY NEW_RESEND_API_KEY

echo "Masked presence check:"
grep -E '^(PRINTFUL_API_KEY|RESEND_API_KEY|EMAIL_FROM)=' "$ENV_FILE" \
  | sed -E 's/=.*$/=<present>/'

echo "Restarting service..."
systemctl restart "$SERVICE_NAME"
sleep 2
echo "service=$(systemctl is-active "$SERVICE_NAME")"
curl -s -o /dev/null -w 'local_http=%{http_code}\n' http://127.0.0.1:3100/

echo "Done."
