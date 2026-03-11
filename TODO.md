# SmartPrintAI Unified TODO

Last sync: 2026-03-10
Sources: PRD.md, MARKETING.md, CLAUDE.md, production work completed on VPS.

## Done (Completed)
- [x] VPS foundation up (Postgres, Redis, MinIO)
- [x] Reverse proxy + HTTPS live (Nginx + Let's Encrypt)
- [x] Domain DNS pointed and production reachable at https://smartprintai.com
- [x] Production app service running via systemd (smartprintai)
- [x] Printful catalog sync flow implemented and active products cleaned
- [x] Product listing route fixed and live
- [x] API validation hardening across routes
- [x] Stripe webhook idempotency and webhook authenticity verification
- [x] Structured API logging + request IDs
- [x] Rate limiting in place on auth/generation-sensitive paths
- [x] Test stack in place (unit + API + e2e smoke) and CI check script
- [x] Deployment/runbook baseline documented
- [x] Auth magic-link flow implemented
- [x] Account order-history page implemented
- [x] Email delivery setup completed (Resend sending + ImprovMX forwarding)
- [x] Auth redirect bug fixed (/api/auth/verify no longer redirects to localhost)

## Pending (Priority Order)

### P0 - Launch Blocking
- [x] Complete 5 real end-to-end test orders (PRD Week 3-4)
- [x] Test order #1 validated in test mode (checkout -> signed webhook -> order status `processing` with `printfulOrderId`)
- [x] Test order #2 validated in test mode (checkout -> signed webhook -> order status `processing` with `printfulOrderId`)
- [x] Test order #3 validated in test mode (checkout -> signed webhook -> order status `processing` with `printfulOrderId`)
- [x] Test order #4 validated in test mode (checkout -> signed webhook -> order status `processing` with `printfulOrderId`)
- [x] Test order #5 validated in test mode (checkout -> signed webhook -> order status `processing` with `printfulOrderId`)
- [x] Validate full order lifecycle in production (paid -> created -> fulfilled -> shipped)
- [x] Configure `PRINTFUL_WEBHOOK_SECRET` in production and verify signed shipment webhooks
- [x] Enable Stripe live mode and verify live webhook flow
- [ ] Rotate all exposed/leaked keys before launch (Resend, Printful, others if exposed)
- [ ] Final production secret audit (.env.local)
- [ ] Run one real live purchase on production and confirm payment settlement end-to-end (deferred by request until core implementation is complete)
- [x] Masked secret audit run on 2026-03-09 (Stripe currently in test mode; `PRINTFUL_WEBHOOK_SECRET` subsequently configured and verified)
- [x] Stripe live keys applied on VPS and verified (`checkout_http=200`, signed webhook `200`)

### P1 - Product and Revenue Readiness
- [x] Confirm prompt -> generation -> mockup -> checkout flow with production-grade QA pass (2026-03-11: VPS sanity chain `generate=200`, `mockup=200`, `checkout=200`)
- [x] Gemini paid quota/billing enabled and validated by live generation request (`/api/generate` returning 200 on 2026-03-11)
- [ ] Manual cross-device browser QA: verify generated design image URLs open publicly (desktop + mobile) after storage proxy/policy fix
- [ ] Manual production QA: verify `/products`, product detail, and `/create` product picker display real product thumbnails (not placeholder icons)
- [x] Product detail color/size selectors are now interactive and passed into `/create` query params (2026-03-10)
- [x] `/create` now applies selected product/color/size and regenerates mockup when color changes (2026-03-10)
- [x] `/api/mockup` now supports non-`front` Printful placements via product file-type fallback (MG-4 recovery) (2026-03-11)
- [x] Printful sync mapper now stores per-color preview image URLs when provided by Printful variants (2026-03-10)
- [x] Production product sync run to backfill color preview image metadata (2026-03-10)
- [x] Color parity audit completed against live Printful variants (`products_checked=19`, `mismatch_count=0`) on 2026-03-10
- [x] Product color-availability audit completed against live Printful catalog (2026-03-11): no missing non-default colors in app; 7 products are genuinely single-color (`White`) in Printful, and 5 home/accessory products use `Default` with no explicit variant color field from Printful
- [x] Manual visual QA on live site completed via automated browser run (desktop+mobile, 7 multi-color products, `failureCount=0`) on 2026-03-11
- [x] Confirm production order confirmation + post-order customer communication sequence (order confirmation + shipment notification templates verified in inbox)
- [x] Add/verify tracking email trigger on shipped status (`shipment_sent`/`package_shipped` webhook -> shipped status transition + shipment email, idempotent)
- [x] Add baseline customer support flow (new `/support` page + `/api/support` handling; support and contact routing + SLA auto-reply)

### P1 - Analytics and SEO Baseline (from PRD + Marketing)
- [x] GA4 installed with purchase conversion tracking (`NEXT_PUBLIC_GA_MEASUREMENT_ID` set on production VPS on 2026-03-09)
- [x] GA4 code instrumentation deployed (sitewide gtag + purchase event on success page); pending only `NEXT_PUBLIC_GA_MEASUREMENT_ID` env value in production
- [x] Google Search Console setup + sitemap submission (domain property verified via DNS TXT and `https://smartprintai.com/sitemap.xml` accepted on 2026-03-09)
- [x] SEO optimization pass for product pages (titles, metadata, canonical tags, Product/ItemList schema, crawl controls)
- [x] Publish first 2 SEO blog posts (intent-focused) with live routes `/blog` and `/blog/[slug]`
- [ ] Add final favicon/app icon pack and verify social preview image consistency (OG/Twitter/favicon/browser tab icons)

### P2 - Marketing Execution (Month 1)
- [ ] Publish 5 TikToks per week
- [ ] Create Pinterest account and start daily product/mockup pins
- [ ] Build reusable weekly content batch workflow (90 min/week)

### P2 - Marketing Execution (Month 2)
- [ ] Launch first $100 Google Shopping test
- [ ] Set up email list capture offer (first-order discount popup)
- [ ] Outreach to 5 nano-influencers for product exchange
- [ ] Set up Make.com automations (order alert, shipped review request, abandoned cart, daily digest, design auto-post)
- [ ] Assess Etsy integration path (catalog publishing + order sync + inventory/price source of truth)
- [ ] Prepare Etsy-ready listing pack (titles, tags, thumbnails, mockups) for top 20 designs

### P3 - Scale Triggers (After first consistent revenue)
- [ ] Upgrade image generation quality tier (fal.ai phase) when threshold is reached
- [ ] Increase Google Shopping budget to next step based on ROAS
- [ ] Run first boosted TikTok test campaign

## Execution Rule
- [ ] Execute one item at a time from top to bottom.
- [ ] After each item: run checks, record result, then move to next item.
