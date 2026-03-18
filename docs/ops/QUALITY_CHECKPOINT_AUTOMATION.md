# Quality Checkpoint Automation (Wave 5)

## Purpose
Run a scheduled VPS checkpoint that captures:
- rendered-head verification summary
- deterministic Lighthouse gate summary
- trend gate evaluation with warmup status

## Commands
- One-off checkpoint:
  - `npm run ops:quality-checkpoint`
- Install daily systemd timer on VPS:
  - `sudo bash scripts/install_quality_checkpoint_timer.sh`

## Artifacts Produced
Per run (timestamp + commit SHA):
- `docs/reports/artifacts/wave5-rendered-semantics-<timestamp>-<sha>/summary.json`
- `docs/reports/artifacts/wave5-lighthouse-deterministic-<timestamp>-<sha>/summary.json`
- `docs/reports/artifacts/wave5-trend-history-<timestamp>-<sha>/summary.json`
- `docs/reports/WAVE5_TREND_GATE_<timestamp>_<sha>.md`
- `docs/reports/artifacts/wave5-checkpoints/checkpoint-<timestamp>-<sha>.json`
- `docs/reports/artifacts/wave5-checkpoints/latest.json`

## Trend Warmup and Retention
- Trend warmup status is explicit in trend summary JSON/report (`status: warmup`).
- Statistical failures are only enforced when baseline depth is sufficient.
- Critical failures (for example rendered verification failures) still fail immediately.
- History retention is entry-based:
  - `QUALITY_TREND_HISTORY_RETENTION` (default `60`)
- Artifact/checkpoint retention is day-based:
  - `QUALITY_CHECKPOINT_RETENTION_DAYS` (default `14`)

## systemd Units
- Service: `ops/systemd/smartprintai-quality-checkpoint.service`
- Timer: `ops/systemd/smartprintai-quality-checkpoint.timer`
  - Schedule: daily `03:17` UTC-equivalent server time with up to 10-minute jitter.
  - `Persistent=true` ensures missed runs execute after reboot.
