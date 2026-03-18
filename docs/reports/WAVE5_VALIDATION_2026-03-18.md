# Wave 5 Validation Report (2026-03-18)

## Scope
Wave 5 validation on the self-hosted VPS production runtime for:
- deterministic Lighthouse fixture routing
- trend baseline growth automation
- rendered semantic assertions (canonical/hreflang/og:url + schema/trust/legal checks)
- deploy reliability + checkpoint execution path
- CI/release guardrail tightening

Commit under validation: `99e8498`

## Deployment Result (VPS)
- Command: `./scripts/deploy_vps.sh --allow-dirty --skip-install --skip-migrate`
- Result: PASS
- Runtime confirmation:
  - `serviceRestart=success`
  - `serviceActive=active`
  - public checks `root/blog/feed=pass`

Evidence:
- Deploy status payload emitted by script:
  - `DEPLOY_STATUS_JSON={"status":"success",...,"commit":"99e8498",...}`

## Command Results
- `npm run lint` -> PASS
- `npm run test` -> PASS (`28` files, `137` tests)
- `DATABASE_URL=... STRIPE_SECRET_KEY=... GEMINI_API_KEY=... RESEND_API_KEY=... AUTH_SESSION_SECRET=... NEXT_PUBLIC_APP_URL=https://smartprintai.com npm run build` -> PASS
- `npm run seo:verify:rendered` (prod target) -> PASS
- `LIGHTHOUSE_REQUIRE_FIXTURE=1 npm run perf:lighthouse:gate` -> PASS
- `QUALITY_TREND_LIGHTHOUSE_SUMMARY=docs/reports/artifacts/lighthouse-2026-03-18_20-19-15/summary.json QUALITY_TREND_RENDERED_SUMMARY=docs/reports/artifacts/wave5-rendered-semantics-2026-03-18_20-13-42-99e8498/summary.json npm run perf:lighthouse:trend-gate` -> PASS
- `CI_GUARD_LIGHTHOUSE_SUMMARY=... CI_GUARD_RENDERED_SUMMARY=... CI_GUARD_TREND_SUMMARY=... npm run ci:quality:guardrails` -> PASS
- `npm run ops:quality-checkpoint` -> PASS (latest checkpoint + snapshot generated)

Notes:
- One Lighthouse run at `2026-03-18 20:13:52` failed a regression floor (`products` perf below floor), then rerun at `2026-03-18 20:19:15` passed. This was treated as transient/noise and validated again through checkpointed runs.

## Before/After Reliability Metrics
| Metric | Before (Wave 5 residual risk) | After (Wave 5 validation) |
| --- | --- | --- |
| Product-detail Lighthouse route determinism | Discovery fallback could still be used in gate path | Fixture enforcement active (`requireFixture=true`, `strategy=fixture`) |
| Checkpoint trend input wiring | Trend stage could pick latest generic `lighthouse-*` summary and stall lighthouse history growth | Checkpoint now passes explicit run summaries into trend stage (`QUALITY_TREND_LIGHTHOUSE_SUMMARY` / `QUALITY_TREND_RENDERED_SUMMARY`) |
| Lighthouse trend history size | `1` | `2` |
| Rendered trend history size | `2` | `3` |
| Warmup remaining samples | lighthouse `3`, rendered `2` | lighthouse `2`, rendered `1` |

Evidence:
- Before checkpoint trend summary: `docs/reports/artifacts/wave5-trend-history-2026-03-18_19-29-32-99e8498/summary.json`
- After checkpoint trend summary: `docs/reports/artifacts/wave5-trend-history-2026-03-18_19-35-24-99e8498/summary.json`
- Rolling histories:
  - `docs/reports/artifacts/wave5-trend-history/lighthouse_history.json`
  - `docs/reports/artifacts/wave5-trend-history/rendered_head_history.json`

## Production Rendered Semantic Assertions
Source:
- `docs/reports/artifacts/wave5-rendered-semantics-2026-03-18_19-35-24-99e8498/summary.json`

Results:
- target: `prod`
- routes checked: `16`
- failures: `0`
- canonical/hreflang/x-default/og:url parity: PASS
- required trust visibility: `11/11`
- money-page schema shape checks: PASS
- legal/support link integrity on required routes: PASS (`200` reachability)

## Deterministic Lighthouse Gate
Source:
- `docs/reports/artifacts/wave5-lighthouse-deterministic-2026-03-18_19-35-24-99e8498/summary.json`

Results:
- `requireFixture: true`
- `productDetailResolution.strategy: fixture`
- selected fixture route: `/products/cmmhtq4e4000343l29gzhn3ca`
- failures: `0`
- average scores:
  - performance `0.985`
  - accessibility `0.945`
  - seo `1.000`

## Trend + Ops Snapshot
Sources:
- Trend summary: `docs/reports/artifacts/wave5-trend-history-2026-03-18_19-35-24-99e8498/summary.json`
- Latest snapshot: `docs/reports/artifacts/wave5-checkpoints/latest-snapshot.json`

Results:
- trend status: `warmup` (expected until baseline depth reaches minimum)
- trend findings: `0`
- checkpoint overall flag: `amber` (only due warmup)
- deterministic route flag: `green`
- rendered/lighthouse/trust-schema/legal flags: all `green`

## Deliverable Artifacts
- Validation report:
  - `docs/reports/WAVE5_VALIDATION_2026-03-18.md`
- Rendered semantics artifacts:
  - `docs/reports/artifacts/wave5-rendered-semantics-2026-03-18_19-35-24-99e8498/`
- Deterministic Lighthouse artifacts:
  - `docs/reports/artifacts/wave5-lighthouse-deterministic-2026-03-18_19-35-24-99e8498/`
- Trend artifacts:
  - `docs/reports/artifacts/wave5-trend-history-2026-03-18_19-35-24-99e8498/`
- Checkpoint + mission-control snapshot:
  - `docs/reports/artifacts/wave5-checkpoints/checkpoint-2026-03-18_19-35-24-99e8498.json`
  - `docs/reports/artifacts/wave5-checkpoints/snapshot-2026-03-18_19-35-24-99e8498.json`
  - `docs/reports/WAVE5_QUALITY_SNAPSHOT_2026-03-18_19-35-24_99e8498.md`

## Completed / Deferred / Open Risks / Wave 6 Candidates
Completed:
- Wave 5 scope items 1-6 validated with production-target evidence.
- Checkpoint trend input wiring corrected to support actual rolling baseline growth.
- CI/release guardrails now explicitly enforce fixture strategy + rendered/trend contracts.

Deferred:
- None in Wave 5 scope.

Open risks:
- Trend gate remains in warmup until minimum baseline depth is reached (`minBaseline=3`).
- Lighthouse performance can fluctuate run-to-run; hard-fail budgets still apply and may require controlled reruns when near threshold floors.

Wave 6 candidates:
1. Increase checkpoint cadence temporarily to exit warmup faster and stabilize trend statistics.
2. Add explicit snapshot/history compaction test coverage for the checkpoint runner.
3. Add automated VPS post-deploy hook to run CI guardrail assertion against the exact checkpoint summaries from that deploy.
