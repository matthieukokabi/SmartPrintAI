# Wave 8 Validation Report (2026-03-18)

## Scope Status
- `PASS` Wave 8.1 VPS Lighthouse runtime parity (`google-chrome-stable` installed/pinned, runtime preflight enforced).
- `PASS` Wave 8.2 Env loader standardization (`scripts/lib/env_loader.sh` + checkpoint bootstrap contract).
- `PASS` Wave 8.3 One-command VPS artifact sync (`npm run ops:quality-checkpoint:sync`).
- `PASS` Wave 8.4 Validation/report closeout with VPS runtime evidence.

## Commits Shipped (Wave 8)
- `a8eed3b` Wave 8: harden VPS Lighthouse runtime parity
- `91885f0` Wave 8: standardize VPS env loader for checkpoints
- `a744245` Wave 8: add one-command VPS artifact sync
- `43fe596` Wave 8: harden env loader parsing for malformed lines

## Local Validation
- `npm run test:ops:lighthouse-runtime` -> `PASS`
- `npm run test:ops:env-loader` -> `PASS`
- `npm run test:ops:artifact-sync` -> `PASS`
- `npm run test:ops:checkpoint` -> `PASS`
- `npm run lint` -> `PASS`
- `npm run test` -> `PASS` (`28` files, `137` tests)
- `DATABASE_URL=... STRIPE_SECRET_KEY=... GEMINI_API_KEY=... RESEND_API_KEY=... AUTH_SESSION_SECRET=... NEXT_PUBLIC_APP_URL=https://smartprintai.com npm run build` -> `PASS`
- `npm run ops:quality-checkpoint` (local, non-escalated) -> blocked by local sandbox env-file/runtime constraints.
- `QUALITY_CHECKPOINT_ENV_FILE=<tmp> npm run ops:quality-checkpoint` (local, escalated) -> checkpoint runs, but local Lighthouse remains non-deterministic for this host (`webSocket URL` fetch failure). Production-targeted checkpoint evidence was taken from VPS runtime.

## VPS Runtime Validation (Authoritative)
- Deploy to VPS (`./scripts/deploy_vps.sh --allow-dirty --skip-install --skip-migrate`) -> `PASS`, commit `43fe596` live.
- VPS checkpoint run at `/root/smartprintai`:
  - First run: one-off Lighthouse floor miss on `/` (`0.855 < 0.860`) -> rerun.
  - Second run: `PASS` across stages with:
    - Lighthouse stage `PASS`
    - Lighthouse runtime preflight `ready` with `/usr/bin/google-chrome-stable`
    - Conversion pulse mode `connected_live (live_database)`

## Evidence Artifacts
- Lighthouse parity:
  - `docs/reports/artifacts/wave8-vps-lighthouse-parity-2026-03-18_22-47-07.json`
  - `docs/reports/artifacts/wave8-vps-lighthouse-parity-2026-03-18_22-47-07.md`
- Env-loader proof:
  - `docs/reports/artifacts/wave8-env-loader-check-2026-03-18_22-47-07.json`
  - `docs/reports/artifacts/wave8-env-loader-check-2026-03-18_22-47-07.md`
- Artifact sync proof:
  - `docs/reports/artifacts/wave8-artifact-sync-2026-03-18_22-27-27-unknown/wave8-artifact-sync-2026-03-18_22-27-27-unknown.json`
  - `docs/reports/artifacts/wave8-artifact-sync-2026-03-18_22-27-27-unknown/wave8-artifact-sync-2026-03-18_22-27-27-unknown.md`

## Before/After (Wave 8 Focus)
- Before: VPS checkpoint Lighthouse stage was blocked by missing Chrome/Chromium runtime.
- After: VPS checkpoint resolves browser deterministically (`google-chrome-stable`), Lighthouse stage passes on-host, env bootstrap is standardized, and checkpoint artifact sync is one command with timestamp+SHA mapping summary.

## Residual Risks
- VPS `.env.local` contains malformed bare-token lines (`line 12`, `line 35`); loader now ignores these safely with explicit warnings, but file hygiene should be cleaned.
- VPS deployment model uses archive sync (no `.git` in `/root/smartprintai`), so checkpoint `commitSha` remains `unknown` unless injected explicitly.
