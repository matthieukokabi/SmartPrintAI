# Wave 6 Validation Report (2026-03-18)

## Scope
- Warmup completion automation + ETA auto-activation
- Conversion insight pack (weekly source/page/form-step dropoff + anomalies)
- Ops alert tuning (warning dedupe/cooldown, critical immediate)
- Release confidence card snapshot (rendered semantics, deterministic lighthouse gate, trend, deploy health, conversion pulse)

## Validation Commands
- `npm run test:quality:snapshot` -> PASS
- `npm run test:ops:alerts` -> PASS
- `npm run test:conversion:insights` -> PASS
- `npm run lint` -> PASS
- `npm run test` -> PASS (`28` files, `137` tests)
- `DATABASE_URL=postgresql://user:pass@localhost:5432/db STRIPE_SECRET_KEY=sk_test_dummy GEMINI_API_KEY=dummy RESEND_API_KEY=dummy AUTH_SESSION_SECRET=0123456789abcdef NEXT_PUBLIC_APP_URL=https://smartprintai.com npm run build` -> PASS
- `npm run ops:quality-checkpoint` -> PASS (required elevated runtime due local sandbox IPC limitation)

## Checkpoint Outcome
Source: `docs/reports/artifacts/wave5-checkpoints/latest.json`

- `rendered`: status `0` (PASS)
- `lighthouse`: status `0` (PASS)
- `trend`: status `0` (PASS, phase `warmup`)
- `conversion`: status `0` (PASS)
- `alerts`: status `0` (PASS)

## Release Confidence Card Snapshot
Source: `docs/reports/artifacts/wave5-checkpoints/latest-snapshot.json`

- `overallFlag`: `amber`
- Gate flags:
  - `rendered`: `green`
  - `lighthouse`: `green`
  - `trend`: `amber` (warmup)
  - `deterministicRoute`: `green`
  - `trustSchema`: `green`
  - `legalLinks`: `green`
  - `conversionPulse`: `amber`
  - `deployHealth`: `amber`
- Release card:
  - `renderedSemantics.flag`: `green`
  - `lighthouseDeterministicGate.flag`: `green` (`strategy: fixture`)
  - `trendStatus.flag`: `amber` (`status: warmup`)
  - `deployHealth.flag`: `amber` (`status: watch`)
  - `conversionPulse.flag`: `amber` (`status: unavailable`)

## Wave 6 Artifacts
- Conversion insights:
  - `docs/reports/artifacts/wave6-conversion-insights-2026-03-18_20-32-47-342743a/summary.json`
  - `docs/reports/WAVE6_CONVERSION_INSIGHTS_2026-03-18_20-32-47_342743a.md`
- Alert tuning:
  - `docs/reports/artifacts/wave6-alerts-2026-03-18_20-32-47-342743a/summary.json`
  - `docs/reports/WAVE6_ALERTS_2026-03-18_20-32-47_342743a.md`
  - `docs/reports/artifacts/wave6-alert-state/state.json`
- Rendered semantics:
  - `docs/reports/artifacts/wave5-rendered-semantics-2026-03-18_20-32-47-342743a/summary.json`
  - `docs/reports/WAVE5_RENDERED_SEMANTICS_VERIFY_2026-03-18_21-32-48_342743a.md`
- Deterministic lighthouse:
  - `docs/reports/artifacts/wave5-lighthouse-deterministic-2026-03-18_20-32-47-342743a/summary.json`
  - `docs/reports/WAVE3_LIGHTHOUSE_GATE_2026-03-18_21-32-51.md`
- Trend gate:
  - `docs/reports/artifacts/wave5-trend-history-2026-03-18_20-32-47-342743a/summary.json`
  - `docs/reports/WAVE5_TREND_GATE_2026-03-18_20-32-47_342743a.md`
- Release confidence snapshot:
  - `docs/reports/artifacts/wave5-checkpoints/snapshot-2026-03-18_20-32-47-342743a.json`
  - `docs/reports/WAVE5_QUALITY_SNAPSHOT_2026-03-18_20-32-47_342743a.md`

## Notes
- Trend remains in warmup with `remainingRuns: 1` and ETA `2026-03-19T20:37:25.175Z`.
- Conversion pulse is `unavailable` in this checkpoint run, with warning `database_unavailable`; conversion script fallback and alert dedupe behavior are functioning as designed.
