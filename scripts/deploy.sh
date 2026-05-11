#!/usr/bin/env bash
# Atomic deploy script for smartprintai.
# Goals: zero-window where .next is half-written; auto-rollback
# on health-check failure; clean log line for ops audit.
set -euo pipefail

REPO=/root/smartprintai
SERVICE=smartprintai.service
HEALTH_URL="http://127.0.0.1:3100/"
LOG=/var/log/smartprintai-deploy.log

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "$LOG"; }

cd "$REPO"

log "=== deploy starting ==="
log "current HEAD: $(git rev-parse --short HEAD)"

log "step 1/6: git fetch + ff-only pull"
git fetch --quiet origin main
git checkout main
git pull --ff-only

NEW_HEAD=$(git rev-parse --short HEAD)
log "target HEAD: $NEW_HEAD"

log "step 2/6: npm ci"
npm ci --silent

log "step 3/6: build to .next.staging"
rm -rf .next.staging
NEXT_DIST_DIR=.next.staging npm run build

log "step 4/6: validate build integrity"
# Required artifacts the May 8 deploy was missing. Add more
# critical chunks here as we discover them.
REQUIRED=(
  ".next.staging/BUILD_ID"
  ".next.staging/server/pages/_error.js"
  ".next.staging/server/app/page.js"
)
MISSING=0
for f in "${REQUIRED[@]}"; do
  if [ ! -f "$f" ]; then
    log "  MISSING: $f"
    MISSING=$((MISSING + 1))
  fi
done
if [ "$MISSING" -gt 0 ]; then
  log "FATAL: build integrity check failed ($MISSING missing)."
  log "  staged build kept at .next.staging for inspection."
  log "  current production .next unchanged."
  exit 1
fi
log "  all required artifacts present"

log "step 5/6: atomic swap"
# Same-filesystem rename is atomic on Linux. The window
# where .next does not exist is sub-millisecond.
if [ -d .next.old ]; then
  rm -rf .next.old
fi
if [ -d .next ]; then
  mv .next .next.old
fi
mv .next.staging .next

log "step 6/6: restart + health check"
systemctl restart "$SERVICE"

sleep 4
if ! systemctl is-active --quiet "$SERVICE"; then
  log "FATAL: service did not come back active. Rolling back."
  mv .next .next.failed
  mv .next.old .next
  systemctl restart "$SERVICE"
  sleep 4
  log "rollback complete; service: $(systemctl is-active "$SERVICE")"
  exit 2
fi

# Probe localhost; bypass nginx so we know it's the app
# responding, not stale nginx cache.
for attempt in 1 2 3 4 5; do
  if curl -sf -o /dev/null --max-time 5 "$HEALTH_URL"; then
    log "  health-check pass on attempt $attempt"
    break
  fi
  if [ "$attempt" -eq 5 ]; then
    log "FATAL: health-check failed 5x. Rolling back."
    mv .next .next.failed
    mv .next.old .next
    systemctl restart "$SERVICE"
    sleep 4
    log "rollback complete; service: $(systemctl is-active "$SERVICE")"
    exit 3
  fi
  sleep 2
done

log "=== deploy success: $NEW_HEAD ==="
log ""
# Keep .next.old around until the next deploy for emergency
# rollback; don't auto-delete (cheap disk, costly hindsight).

exit 0
