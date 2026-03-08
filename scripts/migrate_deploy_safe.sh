#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/3] prisma migrate status"
npx prisma migrate status

echo "[2/3] prisma migrate deploy"
npx prisma migrate deploy

echo "[3/3] prisma generate"
npx prisma generate

echo "Migration deploy completed."
