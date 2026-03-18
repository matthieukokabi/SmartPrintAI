# SEO Quality Gates (Wave 2)

## Purpose
- Keep Wave 1 SEO/security gains stable during feature changes.
- Fail CI early when canonical/hreflang, metadata, security headers, or core internal links regress.

## Command
- `npm run test:seo:gates`
- `npm run seo:assert:rendered`
- `npm run seo:verify:rendered`
- `npm run perf:lighthouse:gate`
- `npm run perf:lighthouse:trend-gate`
- `npm run test:quality:trend`

## Included Gates
- `scripts/assert_rendered_alternates.ts`
  - Production-like rendered-head assertions (SSR output), not only metadata contracts.
  - Verifies `/create`, locale create routes, and localized key templates for:
    - canonical path correctness
    - alternates coverage (`en`, `fr`, `de`, `es`, `x-default`) from rendered HTML link tags
    - `og:url` parity with canonical path
- `src/app/metadata-regression.test.ts`
  - Canonical + hreflang parity for key templates.
  - Locale `en` canonical collapse regression checks.
  - OpenGraph + Twitter presence checks on key templates.
  - Product/blog detail metadata locale parity checks.
  - Metadata threshold contract:
    - key template descriptions must stay within `50..200` characters.
- `src/app/security-headers-regression.test.ts`
  - Baseline header presence:
    - `Content-Security-Policy`
    - `Strict-Transport-Security`
    - `X-Frame-Options`
    - `X-Content-Type-Options`
    - `Referrer-Policy`
  - Hardened CSP phase-3 contract:
    - `script-src` must stay at `'self' https:` (no `unsafe-inline`, no `unsafe-eval`)
    - `script-src-elem` must include `'unsafe-inline'` for hydration/JSON-LD compatibility
    - `script-src-attr` must remain `'none'`
  - Legacy rollback contract:
    - `CSP_MODE=legacy` keeps fallback `script-src 'self' 'unsafe-inline' 'unsafe-eval' https:`
- `src/app/internal-links-regression.test.ts`
  - Static internal links from core navigation and key marketing pages must resolve to existing app routes.
- `scripts/lighthouse_budget_gate.ts`
  - Deterministic Lighthouse gating with warm-up + multi-run median scoring.
  - Uses stable headless Chrome flags and fixed category set (`performance`, `accessibility`, `seo`).
  - Covers key conversion/content routes:
    - home (`/`)
    - create (`/create`)
    - products (`/products`)
    - product detail (discovered from `/products` rendered HTML)
    - blog (`/blog`)
    - support (`/support`)
  - Enforces:
    - minimum score thresholds (`config/lighthouse-budget.json`)
    - trend-regression floors against `docs/reports/LIGHTHOUSE_BASELINE.json`
  - Outputs timestamped JSON artifacts + report under `docs/reports/artifacts/lighthouse-<timestamp>/`.
  - Baseline refresh workflow:
    - run `LIGHTHOUSE_UPDATE_BASELINE=1 npm run perf:lighthouse:gate` after intentional performance improvements.
- `scripts/quality_trend_gate.ts`
  - Aggregates the latest Lighthouse and rendered-head (`Wave 4`) summaries.
  - Persists rolling history under:
    - `docs/reports/artifacts/wave4-trend-history/lighthouse_history.json`
    - `docs/reports/artifacts/wave4-trend-history/rendered_head_history.json`
  - Uses rolling-window statistical regression detection (mean/stddev threshold with minimum absolute drop floor) to reduce one-off noise false positives.
  - Keeps hard-fail behavior for critical rendered-head failures while trend-checking trust visibility rate drift.
  - Outputs timestamped artifacts + report under:
    - `docs/reports/artifacts/wave4-lighthouse-trend-<timestamp>-<sha>/`
    - `docs/reports/WAVE4_TREND_GATE_<timestamp>_<sha>.md`
  - Useful environment flags:
    - `QUALITY_TREND_WINDOW` (default `5`)
    - `QUALITY_TREND_MIN_BASELINE` (default `3`)
    - `QUALITY_TREND_WRITE_HISTORY=0` to run read-only (no history file writes)
- `scripts/tests/quality_trend_gate_test.sh`
  - Deterministic fixture coverage for trend gate pass/fail paths:
    - passes when baseline sample size is below threshold
    - fails when statistically significant lighthouse regression appears against seeded history

## CI Integration
- `scripts/ci_non_interactive.sh` now runs rendered-head assertions + rendered trust harness + deploy retry tests + SEO regression suites + Lighthouse budget gate + trend gate before full test run.

## Wave 4 Verification Harness
- `scripts/verify_rendered_head_harness.ts`
  - Fetches rendered HTML from both a managed local server (`next start`) and production by default.
  - Asserts canonical, locale alternates (`en`, `fr`, `de`, `es`, `x-default`), `og:url`, and trust-strip visibility expectations.
  - Saves raw HTML artifacts per route and target, plus a JSON summary, under:
    - `docs/reports/artifacts/wave4-rendered-head-<timestamp>-<sha>/`
  - Writes a timestamped markdown result report:
    - `docs/reports/WAVE4_RENDERED_HEAD_VERIFY_<timestamp>_<sha>.md`
- Useful environment flags:
  - `SEO_VERIFY_INCLUDE_LOCAL=0` to skip local checks.
  - `SEO_VERIFY_INCLUDE_PROD=0` to skip production checks.
  - `SEO_VERIFY_PROD_BASE_URL=https://smartprintai.com` to override the production base URL.
