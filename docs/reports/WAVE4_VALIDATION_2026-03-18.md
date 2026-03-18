# Wave 4 Validation Report (2026-03-18)

## Scope
Wave 4 goals validated on the self-hosted VPS production runtime for:
- `/create` trust visibility hardening
- rendered-head + trust verification harness
- deploy script reliability tests
- Lighthouse hard gates + trend-aware regression gate
- schema/trust consistency regression coverage on money pages

Commit under validation: `31747e5`

## Command Results
- `npm run lint` -> PASS
- `npm run test:deploy:vps` -> PASS (`All deploy healthcheck retry tests passed.`)
- `npm run seo:verify:rendered` -> PASS
- `npm run perf:lighthouse:gate` -> PASS
- `npm run perf:lighthouse:trend-gate` -> PASS
- `npm run test:seo:gates` -> PASS (`4` files, `10` tests)
- `npm run test` -> PASS (`27` files, `129` tests)
- `DATABASE_URL=... STRIPE_SECRET_KEY=... GEMINI_API_KEY=... RESEND_API_KEY=... AUTH_SESSION_SECRET=... NEXT_PUBLIC_APP_URL=https://smartprintai.com npm run build` -> PASS

## /create Trust Visibility (Before vs After)
| Check | Before | After |
| --- | --- | --- |
| SSR fallback trust strip in source | Pre-fix snapshot (`d4bb9be`) shows only `fallback={` and no `TrustSignalStrip` in create fallback blocks | Current source includes `TrustSignalStrip` in default + localized create fallbacks |
| Production rendered HTML marker visibility (`/create`) | Risk state tracked from Wave 3: trust strip not reliably visible in raw SSR output | `3/3` trust markers found (`Delivery SLA`, `Support Promise`, `Returns Policy`) |
| Localized create trust visibility (`/en/create`, `/fr/create`, `/de/create`, `/es/create`) | Not guaranteed previously | `3/3` locale markers found for each locale route, all PASS |

Evidence:
- Before snapshot: `docs/reports/artifacts/wave4-rendered-head-2026-03-18_17-21-11-31747e5/trust_visibility_before_snapshot.txt`
- Rendered production checks: `docs/reports/artifacts/wave4-rendered-head-2026-03-18_17-21-11-31747e5/summary.json`
- Prod spot-check headers + trust markers: `docs/reports/artifacts/wave4-rendered-head-2026-03-18_17-21-11-31747e5/prod_spot_checks.txt`

## Rendered-Head + Trust Harness (Prod)
- Target: `https://smartprintai.com`
- Routes checked: `12`
- Failures: `0`
- Canonical/hreflang/x-default/og:url parity: PASS
- Trust expectations:
  - required routes visible: `7/7`
  - absent routes (blog variants) clean: PASS

Evidence:
- Report: `docs/reports/WAVE4_RENDERED_HEAD_VERIFY_2026-03-18_17-21-11_31747e5.md`
- Artifacts: `docs/reports/artifacts/wave4-rendered-head-2026-03-18_17-21-11-31747e5/`

## Deploy Script Reliability Tests
Validated deterministic retry behavior for `scripts/deploy_vps.sh` helper (`scripts/lib/deploy_healthcheck.sh`):
- immediate success path: PASS
- flaky recovery path: PASS
- retry exhaustion failure path: PASS

Evidence:
- Test command output from `npm run test:deploy:vps`
- Fixture suite: `scripts/tests/deploy_healthcheck_test.sh`

## Schema + Trust Consistency Re-assertion
New guardrail added and executed:
- `src/app/money-pages-schema-trust-regression.test.ts`
  - verifies trust strip presence on `/create`, `/products`, `/products/[id]` and localized variants
  - verifies JSON-LD schema anchors remain in money pages (BreadcrumbList / ItemList / Product+Offer wiring)

Execution evidence:
- Included in `npm run test:seo:gates` and full `npm run test`

## Lighthouse + Trend Gate
Lighthouse hard gate summary (`runsPerRoute=2`, median):
- home: perf `0.91`, a11y `0.95`, seo `1.00`
- create: perf `1.00`, a11y `0.94`, seo `1.00`
- products: perf `1.00`, a11y `0.96`, seo `1.00`
- product detail: perf `1.00`, a11y `0.94`, seo `1.00`
- blog: perf `1.00`, a11y `0.94`, seo `1.00`
- support: perf `1.00`, a11y `0.94`, seo `1.00`
- hard-fail budget violations: `0`

Trend gate result:
- findings: `0`
- status: PASS

### Quality Trend Snapshot
- Lighthouse rolling-history size: `1`
- Rendered-head rolling-history size: `1`
- Lighthouse overall (perf/a11y/seo): `0.985 / 0.945 / 1.000`
- Required trust visibility rate: `7/7` (`100%`)
- Rendered verification failures in trend input: `0`

Evidence:
- Lighthouse report: `docs/reports/WAVE3_LIGHTHOUSE_GATE_2026-03-18_17-21-15.md`
- Lighthouse artifacts: `docs/reports/artifacts/lighthouse-2026-03-18_17-21-15/`
- Trend report: `docs/reports/WAVE4_TREND_GATE_2026-03-18_17-25-40_31747e5.md`
- Trend artifacts: `docs/reports/artifacts/wave4-lighthouse-trend-2026-03-18_17-25-40-31747e5/`
- Trend history: `docs/reports/artifacts/wave4-trend-history/`

## Completed / Deferred / Risks / Wave 5 Candidates
Completed:
- Wave 4 trust SSR visibility gap closed and re-verified in raw rendered production HTML
- Rendered-head + trust harness expanded and passing on VPS production runtime
- Deploy retry logic covered by deterministic tests
- Trend-aware quality gate added to CI with deterministic fixture tests
- Money-page schema/trust regression guardrail added to SEO gates

Deferred:
- None in Wave 4 scope

Open risks:
- Trend history window is currently small (`1` sample), so statistical sensitivity will improve as more runs accumulate.
- Lighthouse route discovery still depends on first product-detail link discovered from `/products`.

Wave 5 candidates:
1. Auto-append trend history snapshots on scheduled release checkpoints to grow regression baseline quality.
2. Add deterministic product-detail fixture route for Lighthouse to remove discovery variability.
3. Expand rendered harness to include explicit schema JSON-LD semantic assertions on production HTML.
