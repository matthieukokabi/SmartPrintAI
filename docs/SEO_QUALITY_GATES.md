# SEO Quality Gates (Wave 2)

## Purpose
- Keep Wave 1 SEO/security gains stable during feature changes.
- Fail CI early when canonical/hreflang, metadata, security headers, or core internal links regress.

## Command
- `npm run test:seo:gates`
- `npm run seo:assert:rendered`
- `npm run seo:verify:rendered`

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

## CI Integration
- `scripts/ci_non_interactive.sh` now runs rendered-head assertions + SEO regression suites between build and full test run.

## Wave 3 Verification Harness
- `scripts/verify_rendered_head_harness.ts`
  - Fetches rendered HTML from both a managed local server (`next start`) and production by default.
  - Asserts canonical, locale alternates (`en`, `fr`, `de`, `es`, `x-default`), and `og:url` consistency.
  - Saves raw HTML artifacts per route and target, plus a JSON summary, under:
    - `docs/reports/artifacts/wave3-rendered-head-<timestamp>/`
  - Writes a timestamped markdown result report:
    - `docs/reports/WAVE3_RENDERED_HEAD_VERIFY_<timestamp>.md`
- Useful environment flags:
  - `SEO_VERIFY_INCLUDE_LOCAL=0` to skip local checks.
  - `SEO_VERIFY_INCLUDE_PROD=0` to skip production checks.
  - `SEO_VERIFY_PROD_BASE_URL=https://smartprintai.com` to override the production base URL.
