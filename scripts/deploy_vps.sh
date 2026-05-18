#!/usr/bin/env bash
#
# Laptop-side driver for the smartprintai VPS deploy.
#
# Trust model:
#   - Laptop is the source of truth for what code SHOULD ship: you commit
#     and push to origin/main. This script refuses to drive a deploy if
#     the working tree is dirty, so "what's deployed" always == origin/main.
#   - VPS is the source of truth for what ACTUALLY runs. Once we SSH in,
#     scripts/deploy.sh owns everything: git pull, npm ci, db migrations,
#     building to .next.staging, validating artifacts, atomically swapping
#     .next, restarting the service, health-checking, and rolling back to
#     .next.old on failure.
#
# This driver does the minimum:
#   1. Pre-flight on the laptop (clean tree, tools present).
#   2. SSH to VPS and invoke scripts/deploy.sh.
#   3. Stream remote output to this terminal; exit with the VPS exit code.
#
# Prior versions of this script duplicated `git fetch`/`git checkout main`/
# `git pull --ff-only`/`npm ci`/`db:migrate:deploy-safe` before invoking
# scripts/deploy.sh. All five are now owned by scripts/deploy.sh itself
# (migrate landed via Tier 0.5, commit 9548a96; the rest were always there
# in deploy.sh's steps 1-3). Running them twice was idempotent but wasted
# ~30-60s per deploy. Single source of truth is in scripts/deploy.sh.
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
# NOTE: env var SMARTPRINTAI_VPS_REPO (renamed from the old
# SMARTPRINTAI_REMOTE_APP_DIR). Update your shell rc files if you had the
# old name set.
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

ssh "$REMOTE_HOST" "bash '$REMOTE_REPO/scripts/deploy.sh'"
