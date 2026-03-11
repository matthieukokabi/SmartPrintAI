# Make.com Automations Setup (Phase 1)

Last updated: 2026-03-11

This document covers the automations currently wired in the app:

- `order_alert` (Stripe webhook success path)
- `shipped_review_request` (Printful shipment webhook path)
- `daily_digest` (secured automation endpoint trigger)

## 1) Environment Variables

Set these in production (`/root/smartprintai/.env.local`) and local `.env.local`:

```bash
MAKE_ORDER_ALERT_WEBHOOK_URL="https://hook.eu2.make.com/..."
MAKE_SHIPPED_REVIEW_WEBHOOK_URL="https://hook.eu2.make.com/..."
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

## 4) Daily Digest Trigger Endpoint

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

## 5) Manual Trigger Check

Run from VPS:

```bash
curl -sS -X POST "https://smartprintai.com/api/automations/daily-digest" \
  -H "x-automation-token: <AUTOMATION_SHARED_SECRET>" \
  -H "content-type: application/json" \
  --data '{"windowHours":24}'
```

Expected: HTTP `200` and JSON with `ok: true` + metrics.

## 6) Pending Make.com Items (Phase 2)

- Abandoned cart automation
- Design auto-post automation (social distribution)
