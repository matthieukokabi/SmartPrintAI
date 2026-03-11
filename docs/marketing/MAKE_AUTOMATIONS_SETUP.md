# Make.com Automations Setup (Phase 1)

Last updated: 2026-03-11

This document covers the automations currently wired in the app:

- `order_alert` (Stripe webhook success path)
- `shipped_review_request` (Printful shipment webhook path)
- `abandoned_cart_candidate` (Stripe checkout creation path)
- `daily_digest` (secured automation endpoint trigger)

## 1) Environment Variables

Set these in production (`/root/smartprintai/.env.local`) and local `.env.local`:

```bash
MAKE_ORDER_ALERT_WEBHOOK_URL="https://hook.eu2.make.com/..."
MAKE_SHIPPED_REVIEW_WEBHOOK_URL="https://hook.eu2.make.com/..."
MAKE_ABANDONED_CART_WEBHOOK_URL="https://hook.eu2.make.com/..."
MAKE_DAILY_DIGEST_WEBHOOK_URL="https://hook.eu2.make.com/..."
MAKE_WEBHOOK_TIMEOUT_MS="8000"
AUTOMATION_SHARED_SECRET="replace-with-a-long-random-secret"
```

Then restart app service:

```bash
sudo systemctl restart smartprintai
```

## 2) Make Scenario: Order Alert

Trigger: Custom webhook URL copied into `MAKE_ORDER_ALERT_WEBHOOK_URL`.

Expected payload envelope:

```json
{
  "source": "smartprintai",
  "eventType": "order_alert",
  "occurredAt": "2026-03-11T10:00:00.000Z",
  "payload": {
    "requestId": "req_...",
    "orderId": "ord_...",
    "stripeSessionId": "cs_...",
    "email": "buyer@example.com",
    "total": 42.5,
    "itemsCount": 2,
    "status": "processing",
    "printfulOrderId": "123456789"
  }
}
```

Recommended actions:

- Send internal Slack/Email alert
- Append row to order operations sheet/DB

## 3) Make Scenario: Shipped Review Request

Trigger: Custom webhook URL copied into `MAKE_SHIPPED_REVIEW_WEBHOOK_URL`.

Expected payload envelope:

```json
{
  "source": "smartprintai",
  "eventType": "shipped_review_request",
  "occurredAt": "2026-03-11T10:00:00.000Z",
  "payload": {
    "requestId": "req_...",
    "orderId": "ord_...",
    "printfulOrderId": "123456789",
    "email": "buyer@example.com",
    "trackingUrl": "https://carrier.example/track/...",
    "trackingNumber": "ZX-123",
    "carrier": "DHL"
  }
}
```

Recommended actions:

- Wait delay (for example: 5-10 days after shipment)
- Send review request email or CRM workflow

## 4) Make Scenario: Abandoned Cart Candidate

Trigger: Custom webhook URL copied into `MAKE_ABANDONED_CART_WEBHOOK_URL`.

When this fires:

- User started Stripe checkout
- Session URL is generated
- Purchase may still complete later (this is a candidate signal, not a confirmed abandonment)

Expected payload envelope:

```json
{
  "source": "smartprintai",
  "eventType": "abandoned_cart_candidate",
  "occurredAt": "2026-03-11T10:00:00.000Z",
  "payload": {
    "requestId": "req_...",
    "stripeSessionId": "cs_...",
    "checkoutUrl": "https://checkout.stripe.com/...",
    "email": "buyer@example.com",
    "sessionId": "sess_...",
    "itemCount": 2,
    "cartTotal": 59.98,
    "items": [
      {
        "productId": "prod_...",
        "designId": "des_...",
        "size": "L",
        "color": "Black",
        "quantity": 1
      }
    ]
  }
}
```

Recommended actions:

- Delay 2-6 hours
- Check if corresponding paid order exists (using your Make data store or downstream CRM state)
- Send reminder only if still unpaid

## 5) Daily Digest Trigger Endpoint

Endpoint:

```text
POST /api/automations/daily-digest
```

Auth:

- Header `x-automation-token: <AUTOMATION_SHARED_SECRET>`
- Or `Authorization: Bearer <AUTOMATION_SHARED_SECRET>`

Optional body:

```json
{
  "windowHours": 24
}
```

`windowHours` must be an integer between `1` and `168`.

The route computes:

- `ordersCreated`
- `ordersPaid`
- `ordersProcessing`
- `ordersShipped`
- `ordersFulfillmentFailed`
- `designsCreated`

Then sends a `daily_digest` envelope to `MAKE_DAILY_DIGEST_WEBHOOK_URL`.

## 6) Manual Trigger Check

Run from VPS:

```bash
curl -sS -X POST "https://smartprintai.com/api/automations/daily-digest" \
  -H "x-automation-token: <AUTOMATION_SHARED_SECRET>" \
  -H "content-type: application/json" \
  --data '{"windowHours":24}'
```

Expected: HTTP `200` and JSON with `ok: true` + metrics.

## 7) Pending Make.com Items (Phase 2)

- Design auto-post automation (social distribution)
