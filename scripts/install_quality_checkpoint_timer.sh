#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_SRC="${ROOT_DIR}/ops/systemd/smartprintai-quality-checkpoint.service"
TIMER_SRC="${ROOT_DIR}/ops/systemd/smartprintai-quality-checkpoint.timer"

if [ "${EUID}" -ne 0 ]; then
  echo "This installer must run as root (sudo)." >&2
  exit 1
fi

install -m 0644 "$SERVICE_SRC" /etc/systemd/system/smartprintai-quality-checkpoint.service
install -m 0644 "$TIMER_SRC" /etc/systemd/system/smartprintai-quality-checkpoint.timer

systemctl daemon-reload
systemctl enable --now smartprintai-quality-checkpoint.timer

echo "Installed and started smartprintai-quality-checkpoint.timer"
systemctl status --no-pager smartprintai-quality-checkpoint.timer || true
