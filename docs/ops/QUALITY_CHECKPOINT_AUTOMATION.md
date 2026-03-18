# Quality Checkpoint Automation (Wave 5)

## Purpose
Run a scheduled VPS checkpoint that captures:
- rendered-head verification summary
- deterministic Lighthouse gate summary
- trend gate evaluation with warmup status
- weekly conversion insight pack (source/page/form-step dropoff + anomaly hints)
- tuned ops alerts with warning dedupe/cooldown and immediate critical emission
- mission-control release confidence snapshot (RAG flags + trend deltas + deploy health + conversion pulse)
  - conversion pulse card v2 fields: `db_connectivity_status`, `conversion_pulse_mode`, `data_freshness_age`, `amber_reason_code`

## Commands
- One-off checkpoint:
  - `npm run ops:quality-checkpoint`
- Lighthouse runtime preflight only:
  - `bash scripts/resolve_lighthouse_chrome_path.sh`
- Env bootstrap contract test:
  - `npm run test:ops:env-loader`
- Install daily systemd timer on VPS:
  - `sudo bash scripts/install_quality_checkpoint_timer.sh`

## Artifacts Produced
Per run (timestamp + commit SHA):
- `docs/reports/artifacts/wave5-rendered-semantics-<timestamp>-<sha>/summary.json`
- `docs/reports/artifacts/wave5-lighthouse-deterministic-<timestamp>-<sha>/summary.json`
- `docs/reports/artifacts/wave5-trend-history-<timestamp>-<sha>/summary.json`
- `docs/reports/WAVE5_TREND_GATE_<timestamp>_<sha>.md`
- `docs/reports/artifacts/wave6-conversion-insights-<timestamp>-<sha>/summary.json`
- `docs/reports/WAVE6_CONVERSION_INSIGHTS_<timestamp>_<sha>.md`
- `docs/reports/artifacts/wave6-alerts-<timestamp>-<sha>/summary.json`
- `docs/reports/WAVE6_ALERTS_<timestamp>_<sha>.md`
- `docs/reports/artifacts/wave6-alert-state/state.json`
- `docs/reports/artifacts/wave5-checkpoints/checkpoint-<timestamp>-<sha>.json`
- `docs/reports/artifacts/wave5-checkpoints/latest.json`
- `docs/reports/artifacts/wave5-checkpoints/snapshot-<timestamp>-<sha>.json`
- `docs/reports/artifacts/wave5-checkpoints/latest-snapshot.json`
- `docs/reports/WAVE5_QUALITY_SNAPSHOT_<timestamp>_<sha>.md`

## Trend Warmup and Retention
- Trend warmup status is explicit in trend summary JSON/report (`status: warmup`).
- Statistical failures are only enforced when baseline depth is sufficient.
- Critical failures (for example rendered verification failures) still fail immediately.
- Checkpoint trend evaluation is pinned to the same run's rendered/lighthouse summaries (explicit summary-path handoff), so rolling history reflects checkpoint cadence rather than unrelated latest artifacts.
- History retention is entry-based:
  - `QUALITY_TREND_HISTORY_RETENTION` (default `60`)
- Artifact/checkpoint retention is day-based:
  - `QUALITY_CHECKPOINT_RETENTION_DAYS` (default `14`)
- Rendered harness target toggles (useful for local validation):
  - `QUALITY_CHECKPOINT_INCLUDE_LOCAL` (default `0`)
  - `QUALITY_CHECKPOINT_INCLUDE_PROD` (default `1`)
- Deterministic Lighthouse fixture enforcement toggle:
  - `QUALITY_CHECKPOINT_REQUIRE_FIXTURE` (default `1`, set `0` only for diagnostics)
- Shared env bootstrap controls:
  - `QUALITY_CHECKPOINT_ENV_FILE` (default `.env.local`)
  - `SMARTPRINTAI_ENV_FILE` (fallback path alias used by shared env loader)
  - Checkpoint bootstrap requires `DATABASE_URL`; missing env file/vars fails fast with remediation output.
- Lighthouse runtime preflight overrides:
  - `QUALITY_CHECKPOINT_LIGHTHOUSE_RESOLVER` (default `scripts/resolve_lighthouse_chrome_path.sh`)
  - `LIGHTHOUSE_CHROME_PATH` (optional explicit browser executable)
  - On Ubuntu VPS, install and hold `google-chrome-stable` to keep checkpoint runtime parity stable.
- DB-dependent conversion stage resilience:
  - `QUALITY_CHECKPOINT_DB_MAX_RETRIES` (default `3`, includes initial attempt)
  - `QUALITY_CHECKPOINT_DB_RETRY_BACKOFF_SECONDS` (default `5`, linear backoff base in seconds)
- Conversion insight window and input toggles:
  - `CONVERSION_INSIGHTS_WINDOW_DAYS` (default `7`, clamp `1..31`)
  - `CONVERSION_INSIGHTS_INPUT_FILE` (optional fixture-mode input for deterministic/local validation)
  - `CONVERSION_INSIGHTS_DEGRADED_POLICY` (default `warn`, set `fail` to hard-fail when no DB/cache fallback is usable)
- Alert tuning toggles:
  - `QUALITY_ALERT_COOLDOWN_HOURS` (default `24`, applies only to non-critical alerts)
  - `QUALITY_ALERT_AMBER_THRESHOLD_HOURS` (default `6`, alert threshold window for prolonged conversion-pulse amber state)
  - `QUALITY_ALERT_NOW` (optional ISO timestamp for deterministic test runs)
  - Critical alerts bypass cooldown and are emitted every run (`conversion_pulse_hard_outage`, trend fail, and critical conversion anomalies).
  - Prolonged amber conversion-pulse alerts (`conversion_pulse_amber_prolonged`) are warning-level and respect cooldown dedupe.
- Non-critical stage strictness:
  - `QUALITY_CHECKPOINT_STRICT_NON_CRITICAL` (default `0`, set `1` to fail checkpoint on conversion/alerts stage failure)

## Exit Codes
- `0`: success (or success with non-critical warnings when strict mode is disabled)
- `11`: rendered stage critical failure
- `12`: Lighthouse stage critical failure
- `13`: trend stage critical failure
- `41`: conversion stage failure in strict non-critical mode
- `42`: alerts stage failure in strict non-critical mode

## systemd Units
- Service: `ops/systemd/smartprintai-quality-checkpoint.service`
- Timer: `ops/systemd/smartprintai-quality-checkpoint.timer`
  - Schedule: daily `03:17` UTC-equivalent server time with up to 10-minute jitter.
  - `Persistent=true` ensures missed runs execute after reboot.
