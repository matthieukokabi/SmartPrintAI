# Owner Operations Portal

## Current state

- Customer auth remains magic-link based (`/signin`, `/account/orders`, `/orders/[id]`).
- Owner auth is now dedicated password-based access under `/admin/login`.
- Admin access no longer depends on magic-link callback behavior.

## Owner portal routes

- Canonical landing route: `/admin`
- Canonical order detail route: `/admin/orders/[id]`
- Security route: `/admin/security`
- Owner login route: `/admin/login`
- Compatibility aliases:
  - `/admin/orders` -> redirects to `/admin`
  - `/admin/order/[id]` -> redirects to `/admin/orders/[id]`

## Access control

Access is session-gated and owner-email allowlisted with a dedicated owner cookie (`spai_owner_session`).

1. Open `/admin` (or `/admin/orders/<id>`).
2. If logged out, you are redirected to `/admin/login?next=<admin-path>`.
3. Sign in with owner email + password.
4. After auth, you are redirected back to the requested admin path.
5. Sign out via `/api/admin/auth/logout`.

Owner allowlist:

1. Signed-in owner email must be present in `OWNER_PORTAL_EMAILS`.
2. If `OWNER_PORTAL_EMAILS` is empty, `SUPPORT_EMAIL` is used as a fallback allowlist entry.

Set this in production:

```env
OWNER_PORTAL_EMAILS="owner@smartprintai.com,ops@smartprintai.com"
```

Unauthorized users are denied (`404`), and unauthenticated users are redirected to `/admin/login?next=<admin-path>`.

## Initial owner password setup

Set one bootstrap option in env:

- `OWNER_PORTAL_INITIAL_PASSWORD` (plaintext bootstrap secret), or
- `OWNER_PORTAL_INITIAL_PASSWORD_HASH` (preferred hashed bootstrap value generated with app hashing format).

On first successful owner login for an allowlisted email:

1. The app creates an `OwnerCredential` DB record with a hashed password.
2. `mustRotatePassword=true` is set.
3. Owner is redirected to `/admin/security?required=1` to rotate immediately.

After rotation:

- Password is stored hashed in DB (`OwnerCredential.passwordHash`).
- `mustRotatePassword` is cleared.
- Bootstrap env secret is no longer required for daily sign-ins.

Recovery model:

- If owner credential is lost, set/update bootstrap env secret and re-authenticate to rebuild/reset credential, then rotate in `/admin/security`.

## What owner can see

### `/admin`

- Summary cards:
  - recent order count
  - orders needing attention
  - processing count
  - support intake count
- Recent orders table:
  - order id
  - short id label (`#XXXXXXXX`) and full id
  - created date
  - customer email
  - total
  - payment status
  - status
  - fulfillment id
  - item count
- Order discovery controls:
  - search by order id, short id, email, Stripe session id, or fulfillment id
  - status filter
  - default recent window of up to 250 orders
- Attention list:
  - manual review
  - fulfillment failed
  - processing orders missing fulfillment id
- Support intake list (latest submissions)
- Security warning banner if password rotation is required

Manual validation shortcut for known live order:

- Search by short id: `TVKIVXXW`
- Search by full id: `cmn3p5lxs000c8fl2tvkivxxw`
- Search by email: `miker327@proton.me`

### `/admin/orders/[id]`

- Payment and fulfillment identifiers
- Customer email and totals
- Line items with:
  - product name/provider id
  - design id and prompt
  - design image link
  - size/color/quantity/price
- Shipping address payload and financial breakdown

### `/admin/security`

- Change owner password using current + new password
- Minimum length enforced by `OWNER_PORTAL_MIN_PASSWORD_LENGTH` (default `12`)
- Required-rotation guidance when account is bootstrapped

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
