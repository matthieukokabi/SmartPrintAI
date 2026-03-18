# CSP Hardening Stage 3 (Wave 3)

## What Changed
- Hardened/default mode now uses:
  - `script-src 'self' https:`
  - `script-src-elem 'self' 'unsafe-inline' https:`
  - `script-src-attr 'none'`
- `style-src 'unsafe-inline'` is unchanged in this stage.
- `unsafe-eval` remains disallowed in hardened mode.

## Why This Is Safer
- Inline script execution is now explicitly scoped to script elements (`script-src-elem`) for Next.js hydration and JSON-LD compatibility.
- Inline script attributes remain blocked via `script-src-attr 'none'`.
- Broader script context (`script-src`) no longer carries `unsafe-inline`.

## Rollback-Safe Mode
- `CSP_MODE=legacy` keeps the prior fallback policy:
  - `script-src 'self' 'unsafe-inline' 'unsafe-eval' https:`
  - no `script-src-elem` override
  - no `script-src-attr 'none'`
- This mode exists only as a rapid compatibility rollback path.

## Compatibility Notes
- Next.js hydration and inline JSON-LD continue to work through `script-src-elem 'unsafe-inline'`.
- If any third-party script execution path fails in hardened mode, temporarily use `CSP_MODE=legacy` while collecting exact blocked directive evidence, then re-tighten.

## Regression Coverage
- `src/app/security-headers-regression.test.ts` now verifies:
  - Hardened phase-3 CSP composition
  - Legacy rollback composition
