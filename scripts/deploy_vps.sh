#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

REMOTE_HOST="${SMARTPRINTAI_VPS_HOST:-root@187.124.30.177}"
REMOTE_APP_DIR="${SMARTPRINTAI_REMOTE_APP_DIR:-/root/smartprintai}"
SERVICE_NAME="${SMARTPRINTAI_SERVICE_NAME:-smartprintai}"
PUBLIC_URL="${SMARTPRINTAI_PUBLIC_URL:-https://smartprintai.com}"

RUN_INSTALL=1
RUN_MIGRATIONS=1
RUN_PUBLIC_CHECKS=1
ALLOW_DIRTY=0
DRY_RUN=0

HEAD_COMMIT="unknown"
DEPLOY_STAGE="init"
DEPLOY_STATUS="failed"
REMOTE_STATUS_JSON="null"

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

emit_deploy_status() {
  local exit_code="$?"
  local final_status="${DEPLOY_STATUS}"
  local stage_escaped commit_escaped host_escaped app_dir_escaped service_escaped

  if [ "$exit_code" -ne 0 ]; then
    final_status="failed"
  fi

  stage_escaped="$(json_escape "${DEPLOY_STAGE}")"
  commit_escaped="$(json_escape "${HEAD_COMMIT}")"
  host_escaped="$(json_escape "${REMOTE_HOST}")"
  app_dir_escaped="$(json_escape "${REMOTE_APP_DIR}")"
  service_escaped="$(json_escape "${SERVICE_NAME}")"

  printf 'DEPLOY_STATUS_JSON={"status":"%s","exitCode":%s,"stage":"%s","commit":"%s","host":"%s","appDir":"%s","service":"%s","runInstall":%s,"runMigrations":%s,"runPublicChecks":%s,"remote":%s}\n' \
    "$final_status" \
    "$exit_code" \
    "$stage_escaped" \
    "$commit_escaped" \
    "$host_escaped" \
    "$app_dir_escaped" \
    "$service_escaped" \
    "$RUN_INSTALL" \
    "$RUN_MIGRATIONS" \
    "$RUN_PUBLIC_CHECKS" \
    "$REMOTE_STATUS_JSON"
}

trap emit_deploy_status EXIT

usage() {
  cat <<'USAGE'
Usage: ./scripts/deploy_vps.sh [options]

Deploy current git HEAD to VPS app directory, then run build + restart + health checks.

Options:
  --host <ssh-host>          SSH target (default: root@187.124.30.177)
  --app-dir <path>           Remote app directory (default: /root/smartprintai)
  --service <name>           Systemd service name (default: smartprintai)
  --public-url <url>         Public base URL (default: https://smartprintai.com)
  --skip-install             Skip npm ci on VPS
  --skip-migrate             Skip npm run db:migrate:deploy-safe
  --skip-public-checks       Skip public URL curl checks
  --allow-dirty              Allow running with local uncommitted changes
  --dry-run                  Print planned actions only
  -h, --help                 Show help
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)
      REMOTE_HOST="${2:-}"
      shift 2
      ;;
    --app-dir)
      REMOTE_APP_DIR="${2:-}"
      shift 2
      ;;
    --service)
      SERVICE_NAME="${2:-}"
      shift 2
      ;;
    --public-url)
      PUBLIC_URL="${2:-}"
      shift 2
      ;;
    --skip-install)
      RUN_INSTALL=0
      shift
      ;;
    --skip-migrate)
      RUN_MIGRATIONS=0
      shift
      ;;
    --skip-public-checks)
      RUN_PUBLIC_CHECKS=0
      shift
      ;;
    --allow-dirty)
      ALLOW_DIRTY=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      DEPLOY_STATUS="success"
      DEPLOY_STAGE="help"
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if ! command -v git >/dev/null 2>&1; then
  echo "ERROR: git is required." >&2
  exit 1
fi

if ! command -v ssh >/dev/null 2>&1; then
  echo "ERROR: ssh is required." >&2
  exit 1
fi

if ! git -C "$ROOT_DIR" rev-parse --git-dir >/dev/null 2>&1; then
  echo "ERROR: $ROOT_DIR is not a git repository." >&2
  exit 1
fi

if [[ "$ALLOW_DIRTY" -ne 1 ]] && [[ -n "$(git -C "$ROOT_DIR" status --porcelain)" ]]; then
  echo "ERROR: Working tree is not clean. Commit or stash changes first, or pass --allow-dirty." >&2
  exit 1
fi

HEAD_COMMIT="$(git -C "$ROOT_DIR" rev-parse --short HEAD)"
PUBLIC_URL="${PUBLIC_URL%/}"

echo "Deploy config:"
echo "  root_dir=${ROOT_DIR}"
echo "  commit=${HEAD_COMMIT}"
echo "  host=${REMOTE_HOST}"
echo "  app_dir=${REMOTE_APP_DIR}"
echo "  service=${SERVICE_NAME}"
echo "  public_url=${PUBLIC_URL}"
echo "  run_install=${RUN_INSTALL}"
echo "  run_migrations=${RUN_MIGRATIONS}"
echo "  run_public_checks=${RUN_PUBLIC_CHECKS}"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Dry-run mode: no remote commands executed."
  DEPLOY_STATUS="success"
  DEPLOY_STAGE="dry-run"
  exit 0
fi

DEPLOY_STAGE="sync"
echo "[1/3] Syncing tracked files from git HEAD to VPS..."
git -C "$ROOT_DIR" archive --format=tar HEAD | ssh "$REMOTE_HOST" "mkdir -p '$REMOTE_APP_DIR' && cd '$REMOTE_APP_DIR' && tar xf -"

DEPLOY_STAGE="remote"
echo "[2/3] Building + restarting service on VPS..."
REMOTE_CMD="set -euo pipefail
export PATH=/root/.nvm/versions/node/v22.22.0/bin:\$PATH
cd '$REMOTE_APP_DIR'

INSTALL_STATUS='skipped'
MIGRATION_STATUS='skipped'
BUILD_STATUS='pending'
SERVICE_RESTART_STATUS='pending'
SERVICE_ACTIVE_STATUS='pending'
LOCAL_ROOT_STATUS='skipped'
LOCAL_BLOG_STATUS='skipped'
LOCAL_FEED_STATUS='skipped'
PUBLIC_ROOT_STATUS='skipped'
PUBLIC_BLOG_STATUS='skipped'
PUBLIC_FEED_STATUS='skipped'

emit_remote_status() {
  local exit_code=\"\$?\"
  local status='failed'
  if [ \"\$exit_code\" -eq 0 ]; then
    status='success'
  fi

  printf 'DEPLOY_REMOTE_STATUS_JSON={\"status\":\"%s\",\"exitCode\":%s,\"install\":\"%s\",\"migrations\":\"%s\",\"build\":\"%s\",\"serviceRestart\":\"%s\",\"serviceActive\":\"%s\",\"checks\":{\"local_root\":\"%s\",\"local_blog\":\"%s\",\"local_feed\":\"%s\",\"public_root\":\"%s\",\"public_blog\":\"%s\",\"public_feed\":\"%s\"}}\n' \\
    \"\$status\" \\
    \"\$exit_code\" \\
    \"\$INSTALL_STATUS\" \\
    \"\$MIGRATION_STATUS\" \\
    \"\$BUILD_STATUS\" \\
    \"\$SERVICE_RESTART_STATUS\" \\
    \"\$SERVICE_ACTIVE_STATUS\" \\
    \"\$LOCAL_ROOT_STATUS\" \\
    \"\$LOCAL_BLOG_STATUS\" \\
    \"\$LOCAL_FEED_STATUS\" \\
    \"\$PUBLIC_ROOT_STATUS\" \\
    \"\$PUBLIC_BLOG_STATUS\" \\
    \"\$PUBLIC_FEED_STATUS\"
}

trap emit_remote_status EXIT

if [ ! -f .env.local ]; then
  echo 'ERROR: .env.local not found in remote app directory.' >&2
  exit 1
fi
"

if [[ "$RUN_INSTALL" -eq 1 ]]; then
  REMOTE_CMD="${REMOTE_CMD}
if npm ci; then
  INSTALL_STATUS='success'
else
  INSTALL_STATUS='failed'
  exit 1
fi
"
fi

if [[ "$RUN_MIGRATIONS" -eq 1 ]]; then
  REMOTE_CMD="${REMOTE_CMD}
if npm run db:migrate:deploy-safe; then
  MIGRATION_STATUS='success'
else
  MIGRATION_STATUS='failed'
  exit 1
fi
"
fi

REMOTE_CMD="${REMOTE_CMD}
if npm run build; then
  BUILD_STATUS='success'
else
  BUILD_STATUS='failed'
  exit 1
fi

if systemctl restart '$SERVICE_NAME'; then
  SERVICE_RESTART_STATUS='success'
else
  SERVICE_RESTART_STATUS='failed'
  exit 1
fi

if systemctl is-active '$SERVICE_NAME' >/dev/null 2>&1; then
  SERVICE_ACTIVE_STATUS='active'
else
  SERVICE_ACTIVE_STATUS='inactive'
  echo 'ERROR: service is not active after restart.' >&2
  exit 1
fi

CHECK_RETRIES=\${DEPLOY_CHECK_RETRIES:-20}
CHECK_DELAY_SECONDS=\${DEPLOY_CHECK_DELAY_SECONDS:-1}

if [ ! -f ./scripts/lib/deploy_healthcheck.sh ]; then
  echo 'ERROR: ./scripts/lib/deploy_healthcheck.sh not found on remote host.' >&2
  exit 1
fi

# shellcheck disable=SC1091
source ./scripts/lib/deploy_healthcheck.sh

echo '-- local checks --'
if check_http_with_retry local_root http://127.0.0.1:3100/ 200 \"\$CHECK_RETRIES\" \"\$CHECK_DELAY_SECONDS\"; then
  LOCAL_ROOT_STATUS='pass'
else
  LOCAL_ROOT_STATUS='fail'
  exit 1
fi

if check_http_with_retry local_blog http://127.0.0.1:3100/blog 200 \"\$CHECK_RETRIES\" \"\$CHECK_DELAY_SECONDS\"; then
  LOCAL_BLOG_STATUS='pass'
else
  LOCAL_BLOG_STATUS='fail'
  exit 1
fi

if check_http_with_retry local_feed http://127.0.0.1:3100/google/merchant-feed.xml 200 \"\$CHECK_RETRIES\" \"\$CHECK_DELAY_SECONDS\"; then
  LOCAL_FEED_STATUS='pass'
else
  LOCAL_FEED_STATUS='fail'
  exit 1
fi
"

if [[ "$RUN_PUBLIC_CHECKS" -eq 1 ]]; then
  REMOTE_CMD="${REMOTE_CMD}
echo '-- public checks --'
if check_http_with_retry public_root '$PUBLIC_URL/' 200 \"\$CHECK_RETRIES\" \"\$CHECK_DELAY_SECONDS\"; then
  PUBLIC_ROOT_STATUS='pass'
else
  PUBLIC_ROOT_STATUS='fail'
  exit 1
fi

if check_http_with_retry public_blog '$PUBLIC_URL/blog' 200 \"\$CHECK_RETRIES\" \"\$CHECK_DELAY_SECONDS\"; then
  PUBLIC_BLOG_STATUS='pass'
else
  PUBLIC_BLOG_STATUS='fail'
  exit 1
fi

if check_http_with_retry public_feed '$PUBLIC_URL/google/merchant-feed.xml' 200 \"\$CHECK_RETRIES\" \"\$CHECK_DELAY_SECONDS\"; then
  PUBLIC_FEED_STATUS='pass'
else
  PUBLIC_FEED_STATUS='fail'
  exit 1
fi
"
fi

remote_log_file="$(mktemp)"
set +e
ssh "$REMOTE_HOST" "$REMOTE_CMD" | tee "$remote_log_file"
remote_exit=$?
set -e

remote_status_line="$(grep '^DEPLOY_REMOTE_STATUS_JSON=' "$remote_log_file" | tail -n 1 || true)"
if [ -n "$remote_status_line" ]; then
  REMOTE_STATUS_JSON="${remote_status_line#DEPLOY_REMOTE_STATUS_JSON=}"
fi
rm -f "$remote_log_file"

if [ "$remote_exit" -ne 0 ]; then
  echo "ERROR: remote deployment failed (exit ${remote_exit}). Check DEPLOY_REMOTE_STATUS_JSON for details." >&2
  exit "$remote_exit"
fi

DEPLOY_STAGE="completed"
DEPLOY_STATUS="success"

echo "[3/3] Done. Deployment commit ${HEAD_COMMIT} is live if all checks are 200."
