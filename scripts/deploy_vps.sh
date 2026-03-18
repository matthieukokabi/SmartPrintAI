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

usage() {
  cat <<'EOF'
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
EOF
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
  exit 0
fi

echo "[1/3] Syncing tracked files from git HEAD to VPS..."
git -C "$ROOT_DIR" archive --format=tar HEAD | ssh "$REMOTE_HOST" "mkdir -p '$REMOTE_APP_DIR' && cd '$REMOTE_APP_DIR' && tar xf -"

echo "[2/3] Building + restarting service on VPS..."
REMOTE_CMD="set -euo pipefail
export PATH=/root/.nvm/versions/node/v22.22.0/bin:\$PATH
cd '$REMOTE_APP_DIR'

if [ ! -f .env.local ]; then
  echo 'ERROR: .env.local not found in remote app directory.' >&2
  exit 1
fi
"

if [[ "$RUN_INSTALL" -eq 1 ]]; then
  REMOTE_CMD="${REMOTE_CMD}
npm ci
"
fi

if [[ "$RUN_MIGRATIONS" -eq 1 ]]; then
  REMOTE_CMD="${REMOTE_CMD}
npm run db:migrate:deploy-safe
"
fi

REMOTE_CMD="${REMOTE_CMD}
npm run build
systemctl restart '$SERVICE_NAME'
systemctl is-active '$SERVICE_NAME'

CHECK_RETRIES=\${DEPLOY_CHECK_RETRIES:-20}
CHECK_DELAY_SECONDS=\${DEPLOY_CHECK_DELAY_SECONDS:-1}

if [ ! -f ./scripts/lib/deploy_healthcheck.sh ]; then
  echo 'ERROR: ./scripts/lib/deploy_healthcheck.sh not found on remote host.' >&2
  exit 1
fi

# shellcheck disable=SC1091
source ./scripts/lib/deploy_healthcheck.sh

echo '-- local checks --'
check_http_with_retry local_root http://127.0.0.1:3100/ 200 \"\$CHECK_RETRIES\" \"\$CHECK_DELAY_SECONDS\"
check_http_with_retry local_blog http://127.0.0.1:3100/blog 200 \"\$CHECK_RETRIES\" \"\$CHECK_DELAY_SECONDS\"
check_http_with_retry local_feed http://127.0.0.1:3100/google/merchant-feed.xml 200 \"\$CHECK_RETRIES\" \"\$CHECK_DELAY_SECONDS\"
"

if [[ "$RUN_PUBLIC_CHECKS" -eq 1 ]]; then
  REMOTE_CMD="${REMOTE_CMD}
echo '-- public checks --'
check_http_with_retry public_root '$PUBLIC_URL/' 200 \"\$CHECK_RETRIES\" \"\$CHECK_DELAY_SECONDS\"
check_http_with_retry public_blog '$PUBLIC_URL/blog' 200 \"\$CHECK_RETRIES\" \"\$CHECK_DELAY_SECONDS\"
check_http_with_retry public_feed '$PUBLIC_URL/google/merchant-feed.xml' 200 \"\$CHECK_RETRIES\" \"\$CHECK_DELAY_SECONDS\"
"
fi

ssh "$REMOTE_HOST" "$REMOTE_CMD"

echo "[3/3] Done. Deployment commit ${HEAD_COMMIT} is live if all checks are 200."
