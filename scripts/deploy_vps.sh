#!/usr/bin/env bash
#
# Laptop-side driver for the smartprintai VPS deploy.
#
# Trust model:
#   - Laptop is the source of truth for what code SHOULD ship: you commit
#     and push to origin/main. This script refuses to drive a deploy if
#     the working tree is dirty, so "what's deployed" always == origin/main.
#   - VPS is the source of truth for what ACTUALLY runs. Once we SSH in,
#     scripts/deploy.sh owns the dangerous parts: building to .next.staging,
#     validating artifacts, atomically swapping .next, restarting the
#     service, health-checking, and rolling back to .next.old on failure.
#
# This driver does the minimum:
#   1. Pre-flight on the laptop (clean tree, tools present).
#   2. SSH to VPS: pull origin/main, npm ci, run pending DB migrations,
#      then hand off to scripts/deploy.sh.
#   3. Stream remote output to this terminal; exit with the VPS exit code.
#
# Migrations run BEFORE scripts/deploy.sh because scripts/deploy.sh has no
# migrate step and we want the DB schema updated before the new code is
# swapped into .next. (npm ci is duplicated between this wrapper and
# scripts/deploy.sh step 2/6; the second pass is idempotent, ~20-40s
# wasted. Removing the duplication requires editing deploy.sh -- out of
# scope here.)
#
# If the VPS-side deploy fails health-check, deploy.sh auto-rolls back to
# the previous .next and this script still exits non-zero -- the operator
# sees the failure loudly. This script does not retry.
#
# Replaces the previous laptop-side build-and-restart pattern, which
# `git archive`d source onto the VPS and ran `npm run build` in-place
# over the live .next directory. That pattern caused the May 8 build-race
# incident.
#
# NOTE: env var renamed from SMARTPRINTAI_REMOTE_APP_DIR (old) to
# SMARTPRINTAI_VPS_REPO (new) as of this commit. Update your shell
# rc files if you had the old name set.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

REMOTE_HOST="${SMARTPRINTAI_VPS_HOST:-root@187.124.30.177}"
REMOTE_REPO="${SMARTPRINTAI_VPS_REPO:-/root/smartprintai}"

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

if [[ -n "$(git -C "$ROOT_DIR" status --porcelain)" ]]; then
  echo "ERROR: working tree is not clean. Commit or stash first." >&2
  echo "       (origin/main is the canonical source for the VPS; uncommitted" >&2
  echo "        local changes would not be deployed and signal drift.)" >&2
  exit 1
fi

HEAD_COMMIT="$(git -C "$ROOT_DIR" rev-parse --short HEAD)"

echo "Deploy driver:"
echo "  local HEAD  = ${HEAD_COMMIT}"
echo "  remote host = ${REMOTE_HOST}"
echo "  remote repo = ${REMOTE_REPO}"
echo ""
echo "Handing off to ${REMOTE_HOST}:${REMOTE_REPO}/scripts/deploy.sh ..."
echo ""

ssh "$REMOTE_HOST" "cd '$REMOTE_REPO' && \
  git fetch origin main && \
  git checkout main && \
  git pull --ff-only origin main && \
  npm ci && \
  npm run db:migrate:deploy-safe && \
  bash scripts/deploy.sh"
