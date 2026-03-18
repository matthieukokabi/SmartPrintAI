# Wave 7 Validation Report (2026-03-18)

## Scope
Wave 7 focus: conversion pulse reliability and ops confidence card stabilization.

## Validation Commands
- `npm run test:ops:alerts` ✅
- `npm run test:ops:checkpoint` ✅
- `npm run test:quality:snapshot` ✅
- `npm run test:conversion:insights` ✅
- `npm run lint` ✅
- `npm run test` ✅ (28 files, 137 tests)
- `DATABASE_URL=postgresql://user:pass@localhost:5432/db STRIPE_SECRET_KEY=sk_test_dummy GEMINI_API_KEY=dummy RESEND_API_KEY=dummy AUTH_SESSION_SECRET=0123456789abcdef NEXT_PUBLIC_APP_URL=https://smartprintai.com npm run build` ✅
- `npm run ops:quality-checkpoint` ✅

## Production Runtime Evidence (VPS)
- Deploy executed on VPS: `./scripts/deploy_vps.sh --allow-dirty --skip-install --skip-migrate` ✅
  - Commit deployed: `44d215e`
  - `DEPLOY_STATUS_JSON.status=success`
- Conversion pulse runtime check executed on VPS with production env source:
  - Command: `env -u npm_config_prefix node --import tsx scripts/build_conversion_insights.ts` (with `/root/smartprintai/.env.local` loaded)
  - Result: `mode=connected_live`, `reasonCode=live_database`, `freshnessAgeSeconds=0`

## Before/After Snapshot Comparison
- Before artifact: `docs/reports/artifacts/wave7-quality-ops-card-v2-2026-03-18_21-27-26-before.json`
  - `overallFlag=amber`
  - `conversionFlag=amber`
  - `conversion.mode=degraded_no_db`
  - `conversion.status=unavailable`
  - `conversion.amberReasonCode=missing_database_url_no_cache`
- After artifact: `docs/reports/artifacts/wave7-quality-ops-card-v2-2026-03-18_21-27-26.json`
  - `overallFlag=green`
  - `conversionFlag=green`
  - `conversion.mode=connected_live`
  - `conversion.status=ok`
  - `conversion.amberReasonCode=null`

## Artifact Inventory
- `docs/reports/artifacts/wave7-db-connectivity-2026-03-18_21-27-26.json`
- `docs/reports/artifacts/wave7-conversion-pulse-2026-03-18_21-27-26.json`
- `docs/reports/artifacts/wave7-quality-ops-card-v2-2026-03-18_21-27-26-before.json`
- `docs/reports/artifacts/wave7-quality-ops-card-v2-2026-03-18_21-27-26.json`
- `docs/reports/artifacts/wave7-checkpoint-runs-2026-03-18_21-27-26.md`

## Notes
- VPS full checkpoint currently requires a Chrome/Chromium binary for Lighthouse stage on-host. Conversion pulse runtime evidence and mission-card v2 evidence are captured and validated.
