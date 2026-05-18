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

## Pattern lesson — latent hardcoded directives upstream

`gemini.ts` had `Square format.` appended unconditionally to every
prompt for every product. This was the upstream root cause that
defeated 5 tiers of downstream defenses. When debugging a class of
failures across multiple layers, audit the upstream defaults — there
may be a one-line hardcoded directive making all your downstream
fixes uphill battles.

## Open follow-ups (low priority, parked)

- Tier 3.5 UX: disabled-button visibility on fast connections
  (functional gate works, visual feedback brief)
- Accept Next.js's auto-formatted tsconfig.json in one commit (recurring
  noise in every deploy)
- 5 pre-existing tsc errors in test files (merchant-feed × 3,
  internal-links-regression × 2)
- 2 pre-existing vitest failures surfaced 2026-05-18 during Tier 2.5
  test run (both predate Tier 2.5, confirmed via baseline re-run):
  - `src/app/api/webhooks/printful/route.test.ts` — entire suite
    fails to load: `new Resend(process.env.RESEND_API_KEY)` blows up
    at import time when key is unset in test env
  - `src/app/api/webhooks/stripe/route.test.ts` — "sends make order
    alert" case asserts a payload shape missing `internalNotes: null`;
    production already emits it, test assertion is stale
