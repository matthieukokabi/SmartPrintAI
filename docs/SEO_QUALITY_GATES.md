# SEO Quality Gates (Wave 2)

## Purpose
- Keep Wave 1 SEO/security gains stable during feature changes.
- Fail CI early when canonical/hreflang, metadata, security headers, or core internal links regress.

## Command
- `npm run test:seo:gates`
- `npm run seo:assert:rendered`

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
  - Hardened CSP contract:
    - must include `script-src-attr 'none'`
    - must not include `unsafe-eval`
- `src/app/internal-links-regression.test.ts`
  - Static internal links from core navigation and key marketing pages must resolve to existing app routes.

## CI Integration
- `scripts/ci_non_interactive.sh` now runs rendered-head assertions + SEO regression suites between build and full test run.
