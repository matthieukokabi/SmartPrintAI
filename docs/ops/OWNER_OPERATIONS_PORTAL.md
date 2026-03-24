# Owner Operations Portal

## Current state

Before this step, SmartPrintAI did not have a dedicated owner backoffice route.

- `/account/orders` is customer account order history.
- `/orders/[id]` is customer tracking by order id.
- Support requests were emailed but not stored for owner list views.

## Owner portal route

- Route: `/admin`
- Order detail route: `/admin/orders/[id]`

## Access control

Access is session-gated and owner-email allowlisted.

1. Sign in via magic link at `/signin`.
2. The signed-in email must be present in `OWNER_PORTAL_EMAILS`.
3. If `OWNER_PORTAL_EMAILS` is empty, `SUPPORT_EMAIL` is used as a fallback allowlist entry.

Set this in production:

```env
OWNER_PORTAL_EMAILS="owner@smartprintai.com,ops@smartprintai.com"
```

Unauthorized users are denied (`404`), and unauthenticated users are redirected to `/signin`.

## What owner can see

### `/admin`

- Summary cards:
  - recent order count
  - orders needing attention
  - processing count
  - support intake count
- Recent orders table:
  - order id
  - created date
  - customer email
  - total
  - status
  - fulfillment id
  - item count
- Attention list:
  - manual review
  - fulfillment failed
  - processing orders missing fulfillment id
- Support intake list (latest submissions)

### `/admin/orders/[id]`

- Payment and fulfillment identifiers
- Customer email and totals
- Line items with:
  - product name/provider id
  - design id and prompt
  - design image link
  - size/color/quantity/price
- Shipping address payload and financial breakdown

## Support intake persistence

Successful support submissions are appended to:

- `data/support/requests.jsonl`

Override path with:

```env
SUPPORT_INTAKE_LOG_PATH="/absolute/path/requests.jsonl"
```

## Limitations

- Support intake log is file-based and append-only.
- Historical support submissions sent before this feature are not backfilled.
- Portal is read-focused and does not include mutating order actions yet.
