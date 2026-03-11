# Etsy Integration Path (Assessment)

Last updated: 2026-03-11

## Goal
Launch SmartPrintAI products on Etsy without breaking product pricing, order routing, or fulfillment reliability.

## Recommended source of truth
- Product catalog source of truth: SmartPrintAI DB (synced from Printful).
- Variant availability source of truth: Printful variant data.
- Base cost source of truth: Printful sync payload.
- Sell price source of truth: SmartPrintAI pricing rules (markup layer).
- Fulfillment source of truth: Printful order lifecycle and webhooks.
- Customer communication source of truth: SmartPrintAI + Resend emails.

## Integration model
Use Etsy as a demand channel, not as the fulfillment source.

Flow:
1. SmartPrintAI publishes Etsy listings from synced catalog items.
2. Buyer places order on Etsy.
3. SmartPrintAI ingests Etsy order via webhook/polling.
4. SmartPrintAI creates linked local order record.
5. SmartPrintAI submits fulfillment to Printful.
6. Printful status updates sync back to SmartPrintAI.
7. SmartPrintAI pushes shipment/tracking updates back to Etsy and sends customer email.

## Data mapping (minimum)
### Product/listing mapping
- `product.id` -> internal canonical product id
- `etsy_listing_id` -> external listing id
- `printful_variant_id` -> fulfillment variant id
- `price` -> Etsy listing price generated from SmartPrintAI sell price
- `quantity` -> derived availability state (in stock/out of stock)
- `image_urls` -> print-ready mockups or approved listing images

### Order mapping
- `etsy_order_id` -> external order key
- `order.id` -> internal order key
- `etsy_line_item_id` -> external line item key
- `printful_order_id` -> fulfillment order key
- `tracking_number` and `tracking_url` -> mirrored to Etsy + SmartPrintAI email

## API and systems required
- Etsy app credentials and OAuth for shop access.
- Etsy listings API for create/update/archive.
- Etsy receipt/order API for ingest.
- Etsy webhook (or fallback polling) for order and cancellation events.
- Internal queue job for reliable order handoff to Printful.
- Idempotency keys on all Etsy inbound events.

## Rollout phases
### Phase 0 (manual prerequisites)
- Create Etsy seller account and policy pages.
- Verify tax, payouts, shipping profile defaults.
- Confirm brand assets and listing image policy.

### Phase 1 (read-only, safe)
- Export top 20 Etsy-ready listing pack (title, tags, description, hero images, mockups, pricing).
- Manual publish first 5 listings in Etsy UI.
- Validate conversion and customer questions before API automation.

### Phase 2 (publish automation)
- Build `/api/integrations/etsy/publish` for listing creation/update.
- Add listing status dashboard in admin (draft, published, failed, archived).
- Add retry queue with dead-letter reporting.

### Phase 3 (order sync automation)
- Build Etsy webhook endpoint with signature verification.
- Ingest receipts and map to internal order schema.
- Auto-create Printful fulfillment orders with idempotency.
- Send tracking updates to Etsy when Printful shipment is received.

### Phase 4 (operations hardening)
- Add nightly reconciliation job (Etsy vs SmartPrintAI vs Printful).
- Add alerts for failed sync, mismatched stock, and fulfillment delay.
- Add margin dashboard by channel (direct site vs Etsy).

## Risk controls
- Do not allow Etsy to be the system of record for pricing logic.
- Do not auto-publish new SKUs before image QA and policy checks.
- Block duplicate order creation with strict idempotency checks.
- Keep Etsy channel isolated behind feature flags.

## Success metrics
- Time to publish a new listing: under 5 minutes after sync.
- Order sync failure rate: under 1%.
- Tracking update latency to Etsy: under 10 minutes after Printful webhook.
- Channel margin visibility: available per order and per listing.

## Recommended next implementation step
Build a first CLI export for top 20 Etsy-ready listing assets from current catalog.
This is low risk and directly unblocks manual listing validation before API automation.
