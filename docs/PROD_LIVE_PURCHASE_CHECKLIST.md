# Production Live Purchase Checklist

Use this checklist to complete the launch-blocking TODO:

- Run one real live purchase on production.
- Confirm payment settlement and order creation end-to-end.

## 1) Codex preflight (automated)

Run:

```bash
npm run prod:live-preflight
```

What it validates:

- `GET /`, `/create`, `/products`, `/blog`, `/api/products`, `/google/merchant-feed.xml`
- `GET /api/orders?session_id=<nonexistent>` returns `404`
- `POST /api/checkout` with a valid payload returns a live Stripe checkout URL

## 2) Owner-only action (Matthieu)

Complete one real purchase on `https://smartprintai.com` using a real card.

Required capture after payment:

- Success-page URL containing `session_id=...`
- Buyer email used at checkout

## 3) Codex verification (post-purchase)

Codex verifies:

- `GET /api/orders?session_id=<captured_session_id>` returns the order
- Order status progression in DB (`paid` -> `processing` and later `shipped`)
- Stripe settlement visible for the session
- Printful order id present for the order

## 4) TODO closure rule

Only mark the live-purchase TODO item done after all checks in sections 2 and 3 pass.
