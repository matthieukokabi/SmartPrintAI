# SmartPrintAI — Agent context

Persistent memory for future agent sessions. NOT a session log. Keep
entries high-signal; defer running task lists to TODO.md.

## Stack + key paths

- Next.js App Router (TypeScript) + Tailwind. Prisma → Postgres.
- Fulfillment: Printful + Gooten. Payments: Stripe. Email: Resend.
- Infra: Postgres + Redis + MinIO + Nginx + smartprintai.service (systemd).
- Key directories:
  - `src/app/api/*` — route handlers (Stripe webhook, generate, create)
  - `prisma/schema.prisma` — single source of truth for data shape
  - `scripts/deploy.sh` — atomic on-VPS deploy; called by `deploy_vps.sh`
  - `docs/` — operational runbooks
- Authoritative pointers:
  - Roadmap + history → `TODO.md`
  - Deploy procedure → `docs/DEPLOY_RUNBOOK.md`
  - Schema migration notes → `docs/MIGRATIONS.md`

## Data + service guardrails

- ❌ NEVER delete: real users, orders, `env.local.bak.*` files, Stripe
  customer records. If unsure, ask.
- Stripe webhook idempotency is REQUIRED; `event.id` dedup is in place.
- `REQUIRES_REVIEW` orders are operator-gated — never auto-fulfill.
- The atomic deploy (`scripts/deploy.sh` + `prisma migrate deploy`)
  ensures code + schema land together. Don't introduce out-of-band
  migration steps.

## Defense layers against AI-design / product-print-area mismatch (May 16 sprint)

The Anthony Shivbaran luggage-tag incident (Apr 25 + May 7 reprint,
both shipped with a horizontal wordmark squished onto a vertical tag)
drove a 4-layer architectural fix shipped across six commits on May 16:

| Layer | Commit | What |
|---|---|---|
| 1. AI generation | `45c7062` (+ `0c058ed` May 17) | `/api/generate` accepts `productId`, prepends orientation hint to Gemini prompt based on `Product.printArea` aspect ratio. Drops the hardcoded `Square format.` directive that was the upstream root cause. May 17 intensity-ladder refinement (Tier 3.5): 5 buckets instead of 3 — "EXTREMELY VERTICAL/HORIZONTAL" for AR < 0.5 or ≥ 2.0, with concrete metaphor references ("like a long bookmark", "like a long bumper sticker"). Flag image AR: 1.12 baseline → 1.90 smoke → **2.66 in production (Cowork browser, 2026-05-17, exceeds 2.5 target)**. |
| 2. Customer visual gate | `7338d65` | `/create` calls Printful mockup-generator API with per-product `printArea`, gates "Add to cart" on mockup readiness, removes silent imageUrl fallback. |
| 3. Backend aspect guard | `9159e07` | Stripe webhook routes orders to `REQUIRES_REVIEW` when source aspect ratio diverges from print area by >2.0x. |
| 4. Honest review email | `ce5e9e1` | REQUIRES_REVIEW orders get "we're reviewing your order" email instead of misleading "confirmed". Make.com alert carries `internalNotes` so operator sees the reason. |

Supporting infrastructure shipped same session:
- `c6bf30c` — shipping confirmation email on `package_shipped` (no
  customer was receiving one before)
- `9548a96` — wire `prisma migrate deploy` into `scripts/deploy.sh`
  (schema migrations now apply atomically with code)

## EU public-launch readiness (May 18-19 sprint)

The site can now take cold EU traffic without GDPR/ePrivacy exposure.
Shipped across four commits, with the consent-side fix iterated three
times before reaching a runtime-correct state:

| Commit | Role |
|---|---|
| `1d6822c` | Cookie consent banner (4 locales, hand-rolled, no library) + GA4 Consent Mode v2 default-denied in `ga4-init.js` + all-or-nothing consent gate at `/api/analytics/events` + `/privacy` and `/terms` content per locale with anchored sections + `LegalPageLayout` chrome + locale-aware `Footer` + `error.tsx` / `not-found.tsx` / `global-error.tsx`. |
| `e68c5a0` | Returning-visitor consent re-grant in `useEffect` (without this, `ga4-init.js`'s default-denied survives every reload for previously-accepted users) + defensive `expires=<RFC1123>` cookie attribute alongside `max-age=`. |
| `efada8c` | First attempt at the timing-race fix via `dataLayer.push([...])` — passed every gate, **silently failed at runtime**. See Pattern lesson below. |
| `2a5d1aa` | Actual working fix: gtag-style arguments-object shim in `fireGtagConsentUpdate`. |

All four locales (en/fr/de/es) are legally covered: privacy + terms +
footer + cookie banner + error pages. The published privacy policy
names 9 data processors with their role and region: Stripe Payments
Europe Ltd, Printful Latvia SIA, Gelato AS, Gooten Inc., Resend.com
Inc., Google LLC (Gemini API + GA4 listed separately), Make.com
(Celonis SE), and Hostinger International Ltd. Controller contact:
`privacy@smartprintai.com` and `legal@smartprintai.com` (ImprovMX
aliases forwarding to operator's inbox).

The consent gate is all-or-nothing: pre-consent traffic does not
write a funnel event, does not set the `spai_visitor_id` cookie, and
does not set the attribution cookie. After Accept, GA4 Consent Mode v2
flips `analytics_storage` to granted (verified via Puppeteer on
`2a5d1aa`: `window.google_tag_data.ics.entries.analytics_storage`
reports `update: true` for returning consenting visitors).

## Pattern lesson — latent hardcoded directives upstream

`gemini.ts` had `Square format.` appended unconditionally to every
prompt for every product. This was the upstream root cause that
defeated 5 tiers of downstream defenses. When debugging a class of
failures across multiple layers, audit the upstream defaults — there
may be a one-line hardcoded directive making all your downstream
fixes uphill battles.

## Pattern lesson — gtag dataLayer requires arguments-object pushes

Discovered during the EU launch consent fix iteration (May 19, 2026).
`efada8c` shipped a `dataLayer.push(['consent', 'update', { ... }])`
to grant analytics consent. It passed lint, tsc, build, all 320 tests,
and deployed cleanly. The dataLayer push fired at runtime (the entry
was visible at `dataLayer[0]`). But gtag.js silently ignored it:
`window.google_tag_data.ics.entries.analytics_storage` stayed
`{ implicit: true, default: false, quiet: false }` — no `update: true`
flag — and GA4 measurement cookies never refreshed. Returning
consenting visitors were untracked for the entire session window.

Root cause: gtag.js distinguishes between dataLayer entries created
via the standard `function gtag(){dataLayer.push(arguments)}` pattern
(arguments-object) and entries created via a direct
`dataLayer.push([...])` (real Array). Only the arguments-object form
is recognized as a gtag command at queue-replay time. The real Array
fires but is silently dropped from consent processing.

Fix in `2a5d1aa` was to set up a local shim that mirrors the standard
pattern:

```ts
const w = window as unknown as { dataLayer?: unknown[] }
w.dataLayer = w.dataLayer || []
const gtagShim = function () { w.dataLayer!.push(arguments) }
gtagShim('consent', 'update', { analytics_storage: 'granted' })
```

After this commit landed, ICS reports `update: true` and
`_ga_W28W6X43B9` measurement cookie's timestamp ticks forward — GA4
tracking is active.

**Lessons:**

1. Any direct write to `window.dataLayer` outside of `gtag(...)` MUST
   use the arguments-object pattern. Never push a literal Array.

2. This gotcha is not prominently documented in Google's Consent
   Mode v2 docs. It requires empirical inspection of
   `window.google_tag_data.ics.entries` to confirm — checking
   `dataLayer` contents alone is insufficient because both forms
   appear in the queue.

3. The class of bugs that pass every static gate (lint, tsc, build,
   test) and require Puppeteer-level inspection of internal gtag
   state is real. For any consent / analytics work, add a Phase 4.5
   "runtime self-check" step between Phase 4 (test) and Phase 5
   (commit), or accept that bugs will only surface at Phase 6
   (manual smoke). The `efada8c` cycle wasted one full deploy on
   this gap.

## Open follow-ups (low priority, parked)

- Tier 3.5 UX: disabled-button visibility on fast connections
  (functional gate works, visual feedback brief)
