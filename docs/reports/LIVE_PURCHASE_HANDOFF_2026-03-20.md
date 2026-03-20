# Live Purchase Handoff - 2026-03-20

## Context
- Project: SmartPrintAI
- Environment: Production (`https://smartprintai.com`)
- Post-fix state: Wave 9.1 GREEN; latest deployed commit `8924b89`
- Purpose: prepare owner-only real payment completion for final live purchase signoff.

## Automated Preflight Executed By Codex
Command:

```bash
npm run prod:live-preflight
```

Result:
- `/` -> `200`
- `/create` -> `200`
- `/products` -> `200`
- `/blog` -> `200`
- `/api/products` -> `200`
- `/google/merchant-feed.xml` -> `200`
- `/api/orders?session_id=live_preflight_nonexistent_123` -> `404` (expected)
- `/api/checkout` -> `200`

Selected product for checkout preflight:
- `productId`: `cmmhtq4e4000343l29gzhn3ca`
- `size`: `Circle`
- `color`: `Default`

## Owner Action Required (Manual Payment)
Complete one real live checkout using the generated Stripe URL:

`https://checkout.stripe.com/c/pay/cs_live_a1tmfHgxFj4YwaukuuUiYBfzs0PbmD7XV6vU5dctuPoqGHCa81WF6lc7po#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSdkdWxOYHwnPyd1blppbHNgWjA0UTJCRFxGSGt%2Fa3JuTlxJNWl%2FcVB0b0ZDbUB0QlZ2bFJEbzdQTUtBX2lTcTNOZDZwNElsdEFiR0ZCQDxcYW9WTWRAMG9JQn1QbDxRVFZxfUZtUk4wd3BENTVgYURsU2FCQScpJ2N3amhWYHdzYHcnP3F3cGApJ2dkZm5id2pwa2FGamlqdyc%2FJyZjY2NjY2MnKSdpZHxqcHFRfHVgJz8ndmxrYmlgWmxxYGgnKSdga2RnaWBVaWRmYG1qaWFgd3YnP3F3cGB4JSUl`

Session ID:
- `cs_live_a1tmfHgxFj4YwaukuuUiYBfzs0PbmD7XV6vU5dctuPoqGHCa81WF6lc7po`

## Signoff Data Needed Back From Owner
- Buyer email used during checkout.
- Success page URL or `session_id` confirmation.
- Optional screenshot of Stripe success page.

Once those are provided, Codex can close the remaining P0 TODO item and run post-payment verification (`/api/orders?session_id=...`).
