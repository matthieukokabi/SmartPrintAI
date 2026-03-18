#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REMOTE_HOST="${SMARTPRINTAI_VPS_HOST:-root@187.124.30.177}"
REMOTE_APP_DIR="${SMARTPRINTAI_REMOTE_APP_DIR:-/root/smartprintai}"
SOURCE_ROOT=""

usage() {
  cat <<'USAGE'
Usage: scripts/sync_vps_checkpoint_artifacts.sh [options]

Sync latest VPS checkpoint artifacts into local docs/reports tree and emit a Wave 8 sync summary.

Options:
  --host <ssh-host>           SSH host (default: root@187.124.30.177)
  --remote-app-dir <path>     Remote app directory (default: /root/smartprintai)
  --source-root <path>        Local source root for deterministic/testing mode (skips ssh/scp)
  -h, --help                  Show help
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)
      REMOTE_HOST="${2:-}"
      shift 2
      ;;
    --remote-app-dir)
      REMOTE_APP_DIR="${2:-}"
      shift 2
      ;;
    --source-root)
      SOURCE_ROOT="${2:-}"
      shift 2
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

if [ -n "$SOURCE_ROOT" ] && [ ! -d "$SOURCE_ROOT" ]; then
  echo "[artifact-sync] source-root does not exist: ${SOURCE_ROOT}" >&2
  exit 2
fi

if [ -z "$SOURCE_ROOT" ]; then
  if ! command -v ssh >/dev/null 2>&1; then
    echo "[artifact-sync] ssh is required for remote sync mode." >&2
    exit 3
  fi
  if ! command -v scp >/dev/null 2>&1; then
    echo "[artifact-sync] scp is required for remote sync mode." >&2
    exit 3
  fi
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

LATEST_CHECKPOINT_REL="docs/reports/artifacts/wave5-checkpoints/latest.json"
LATEST_SNAPSHOT_REL="docs/reports/artifacts/wave5-checkpoints/latest-snapshot.json"
LATEST_CHECKPOINT_LOCAL="${TMP_DIR}/latest.json"

copy_file_from_source() {
  local relative_path="$1"
  local destination="$2"
  mkdir -p "$(dirname "$destination")"

  if [ -n "$SOURCE_ROOT" ]; then
    cp "${SOURCE_ROOT}/${relative_path}" "$destination"
  else
    scp "${REMOTE_HOST}:${REMOTE_APP_DIR}/${relative_path}" "$destination"
  fi
}

copy_dir_from_source() {
  local relative_path="$1"
  local destination_parent="$2"
  mkdir -p "$destination_parent"

  if [ -n "$SOURCE_ROOT" ]; then
    cp -R "${SOURCE_ROOT}/${relative_path}" "$destination_parent/"
  else
    scp -r "${REMOTE_HOST}:${REMOTE_APP_DIR}/${relative_path}" "$destination_parent/"
  fi
}

copy_file_from_source "$LATEST_CHECKPOINT_REL" "$LATEST_CHECKPOINT_LOCAL"
copy_file_from_source "$LATEST_SNAPSHOT_REL" "${TMP_DIR}/latest-snapshot.json"

CHECKPOINT_ANALYSIS_JSON="${TMP_DIR}/checkpoint-analysis.json"
node - "$LATEST_CHECKPOINT_LOCAL" <<'NODE' > "$CHECKPOINT_ANALYSIS_JSON"
const fs = require('node:fs')
const path = require('node:path')

const checkpointPath = process.argv[2]
const checkpoint = JSON.parse(fs.readFileSync(checkpointPath, 'utf8'))

function ensureRelative(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing ${label} in latest checkpoint.`)
  }
  const normalized = value.replace(/\\/g, '/')
  if (!normalized.startsWith('docs/reports/')) {
    throw new Error(`Unexpected ${label} path '${value}'.`)
  }
  return normalized
}

const renderedSummary = ensureRelative(checkpoint?.stages?.rendered?.summary, 'rendered summary')
const lighthouseSummary = ensureRelative(checkpoint?.stages?.lighthouse?.summary, 'lighthouse summary')
const trendSummary = ensureRelative(checkpoint?.stages?.trend?.summary, 'trend summary')
const conversionSummary = ensureRelative(checkpoint?.stages?.conversion?.summary, 'conversion summary')
const alertsSummary = ensureRelative(checkpoint?.stages?.alerts?.summary, 'alerts summary')
const trendReport = ensureRelative(checkpoint?.stages?.trend?.report, 'trend report')
const conversionReport = ensureRelative(checkpoint?.stages?.conversion?.report, 'conversion report')
const alertsReport = ensureRelative(checkpoint?.stages?.alerts?.report, 'alerts report')
const alertsState = ensureRelative(checkpoint?.stages?.alerts?.state, 'alerts state')
const snapshotJson = ensureRelative(checkpoint?.snapshot?.json, 'snapshot json')
const snapshotReport = ensureRelative(checkpoint?.snapshot?.report, 'snapshot report')

const commitSha = String(checkpoint?.commitSha || 'unknown')
const generatedAt = typeof checkpoint?.generatedAt === 'string' ? checkpoint.generatedAt : null

const directories = Array.from(
  new Set([
    path.posix.dirname(renderedSummary),
    path.posix.dirname(lighthouseSummary),
    path.posix.dirname(trendSummary),
    path.posix.dirname(conversionSummary),
    path.posix.dirname(alertsSummary),
  ]),
)

const files = Array.from(
  new Set([
    trendReport,
    conversionReport,
    alertsReport,
    alertsState,
    snapshotJson,
    snapshotReport,
    'docs/reports/artifacts/wave5-checkpoints/latest.json',
    'docs/reports/artifacts/wave5-checkpoints/latest-snapshot.json',
  ]),
)

process.stdout.write(
  JSON.stringify(
    {
      commitSha,
      generatedAt,
      directories,
      files,
    },
    null,
    2,
  ),
)
NODE

COMMIT_SHA="$(node -e "const fs=require('node:fs');const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(data.commitSha||'unknown'));" "$CHECKPOINT_ANALYSIS_JSON")"
CHECKPOINT_GENERATED_AT="$(node -e "const fs=require('node:fs');const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(data.generatedAt||''));" "$CHECKPOINT_ANALYSIS_JSON")"
SYNC_TIMESTAMP="$(date -u '+%Y-%m-%d_%H-%M-%S')"
SYNC_ARTIFACT_DIR="docs/reports/artifacts/wave8-artifact-sync-${SYNC_TIMESTAMP}-${COMMIT_SHA}"
mkdir -p "$SYNC_ARTIFACT_DIR"

DIRECTORIES_LIST="${TMP_DIR}/directories.txt"
FILES_LIST="${TMP_DIR}/files.txt"
node -e "const fs=require('node:fs');const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));for (const dir of data.directories){console.log(dir)}" "$CHECKPOINT_ANALYSIS_JSON" > "$DIRECTORIES_LIST"
node -e "const fs=require('node:fs');const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));for (const file of data.files){console.log(file)}" "$CHECKPOINT_ANALYSIS_JSON" > "$FILES_LIST"

SYNCED_DIRECTORIES_FILE="${TMP_DIR}/synced-directories.txt"
SYNCED_FILES_FILE="${TMP_DIR}/synced-files.txt"
touch "$SYNCED_DIRECTORIES_FILE" "$SYNCED_FILES_FILE"

while IFS= read -r relative_dir; do
  [ -n "$relative_dir" ] || continue
  copy_dir_from_source "$relative_dir" "$(dirname "$ROOT_DIR/$relative_dir")"
  printf '%s\n' "$relative_dir" >> "$SYNCED_DIRECTORIES_FILE"
done < "$DIRECTORIES_LIST"

while IFS= read -r relative_file; do
  [ -n "$relative_file" ] || continue
  copy_file_from_source "$relative_file" "$ROOT_DIR/$relative_file"
  printf '%s\n' "$relative_file" >> "$SYNCED_FILES_FILE"
done < "$FILES_LIST"

SYNC_SUMMARY_JSON="${SYNC_ARTIFACT_DIR}/wave8-artifact-sync-${SYNC_TIMESTAMP}-${COMMIT_SHA}.json"
SYNC_SUMMARY_MD="${SYNC_ARTIFACT_DIR}/wave8-artifact-sync-${SYNC_TIMESTAMP}-${COMMIT_SHA}.md"

{
  printf '{\n'
  printf '  "generatedAt": "%s",\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  printf '  "checkpointGeneratedAt": "%s",\n' "$CHECKPOINT_GENERATED_AT"
  printf '  "checkpointCommitSha": "%s",\n' "$COMMIT_SHA"
  printf '  "sourceMode": "%s",\n' "$( [ -n "$SOURCE_ROOT" ] && printf 'local_fixture' || printf 'vps_remote' )"
  printf '  "sourceHost": "%s",\n' "$REMOTE_HOST"
  printf '  "sourceAppDir": "%s",\n' "$REMOTE_APP_DIR"
  if [ -n "$SOURCE_ROOT" ]; then
    printf '  "sourceRoot": "%s",\n' "$SOURCE_ROOT"
  else
    printf '  "sourceRoot": null,\n'
  fi
  printf '  "syncArtifactDir": "%s",\n' "$SYNC_ARTIFACT_DIR"
  printf '  "syncedDirectories": [\n'
  awk 'NF {printf "    \"%s\",\n", $0}' "$SYNCED_DIRECTORIES_FILE" | sed '$ s/,$//'
  printf '  ],\n'
  printf '  "syncedFiles": [\n'
  awk 'NF {printf "    \"%s\",\n", $0}' "$SYNCED_FILES_FILE" | sed '$ s/,$//'
  printf '  ]\n'
  printf '}\n'
} > "$SYNC_SUMMARY_JSON"

{
  echo "# Wave 8 Artifact Sync"
  echo
  echo "- Generated at: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "- Checkpoint generated at: ${CHECKPOINT_GENERATED_AT}"
  echo "- Checkpoint commit SHA: ${COMMIT_SHA}"
  echo "- Source mode: $( [ -n "$SOURCE_ROOT" ] && echo "local_fixture" || echo "vps_remote (${REMOTE_HOST}:${REMOTE_APP_DIR})" )"
  echo "- Sync summary JSON: \`${SYNC_SUMMARY_JSON}\`"
  echo
  echo "## Synced directories"
  sed 's/^/- `&`/' "$SYNCED_DIRECTORIES_FILE"
  echo
  echo "## Synced files"
  sed 's/^/- `&`/' "$SYNCED_FILES_FILE"
} > "$SYNC_SUMMARY_MD"

echo "[artifact-sync] sync complete"
echo "[artifact-sync] summary json: ${SYNC_SUMMARY_JSON}"
echo "[artifact-sync] summary md: ${SYNC_SUMMARY_MD}"
