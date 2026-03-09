# SmartPrintAI Unified TODO

Last sync: 2026-03-09
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
- [ ] Confirm prompt -> generation -> mockup -> checkout flow with production-grade QA pass
- [ ] Blocker: Gemini image generation quota currently `0` on active key/project (API returns 429 quota exceeded); enable paid quota/billing and rerun QA
- [x] Confirm production order confirmation + post-order customer communication sequence (order confirmation + shipment notification templates verified in inbox)
- [x] Add/verify tracking email trigger on shipped status (`shipment_sent`/`package_shipped` webhook -> shipped status transition + shipment email, idempotent)
- [x] Add baseline customer support flow (new `/support` page + `/api/support` handling; support and contact routing + SLA auto-reply)

### P1 - Analytics and SEO Baseline (from PRD + Marketing)
- [ ] GA4 installed with purchase conversion tracking
- [x] GA4 code instrumentation deployed (sitewide gtag + purchase event on success page); pending only `NEXT_PUBLIC_GA_MEASUREMENT_ID` env value in production
- [ ] Google Search Console setup + sitemap submission (`/sitemap.xml` + `/robots.txt` routes now live; pending Search Console property + submission)
- [x] SEO optimization pass for product pages (titles, metadata, canonical tags, Product/ItemList schema, crawl controls)
- [ ] Publish first 2 SEO blog posts (intent-focused)

### P2 - Marketing Execution (Month 1)
- [ ] Publish 5 TikToks per week
- [ ] Create Pinterest account and start daily product/mockup pins
- [ ] Build reusable weekly content batch workflow (90 min/week)

### P2 - Marketing Execution (Month 2)
- [ ] Launch first $100 Google Shopping test
- [ ] Set up email list capture offer (first-order discount popup)
- [ ] Outreach to 5 nano-influencers for product exchange
- [ ] Set up Make.com automations (order alert, shipped review request, abandoned cart, daily digest, design auto-post)

### P3 - Scale Triggers (After first consistent revenue)
- [ ] Upgrade image generation quality tier (fal.ai phase) when threshold is reached
- [ ] Increase Google Shopping budget to next step based on ROAS
- [ ] Run first boosted TikTok test campaign

## Execution Rule
- [ ] Execute one item at a time from top to bottom.
- [ ] After each item: run checks, record result, then move to next item.
