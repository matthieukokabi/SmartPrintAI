# CSP Hardening Stage 2 (Wave 2)

Date: 2026-03-18

## What Changed
- Removed `unsafe-eval` from the default CSP (`CSP_MODE=hardened`).
- Added `script-src-attr 'none'` in hardened mode to block inline event-handler attributes.
- Moved app-owned inline bootstrap scripts to static files:
  - theme bootstrap: `/theme-init.js`
  - GA4 bootstrap: `/ga4-init.js`

## Rollback-Safe Mode
- `CSP_MODE=hardened` (default): no `unsafe-eval`, includes `script-src-attr 'none'`.
- `CSP_MODE=legacy`: restores prior script policy shape with `unsafe-eval` and without `script-src-attr 'none'`.

This allows quick rollback if browser/provider behavior regresses in production.

## Compatibility Notes
- `unsafe-inline` is still required in `script-src` for Next.js app-router hydration inline scripts.
- `style-src 'unsafe-inline'` remains enabled because the app currently uses runtime inline style attributes in multiple routes/components.
- Stripe and GA external domains remain explicitly permitted through existing `frame-src`/`connect-src`/`script-src` directives.

## Nonce/Hash Rollout Plan (Next Stage)
1. Add middleware-generated nonce per request and attach it to CSP + script/style elements.
2. Shift JSON-LD and any remaining inline script blocks to nonce-bearing `<Script>` usage.
3. Move from `script-src 'unsafe-inline'` to nonce-based `script-src`.
4. Evaluate style nonce/hash strategy for components still using inline style attributes, then tighten `style-src`.

