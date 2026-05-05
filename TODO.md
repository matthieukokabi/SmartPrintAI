# SmartPrintAI — open follow-ups (P0 mockup fix surfaced these)

## 1. Aspirational tests in the test suite
Fifteen pre-existing tests fail on main referencing handlers that
don't exist (Missing signature, manual_review, sendMakeOrderAlert,
Gelato order create, ready-to-buy fallback design,
home-brand-v2-regression, money-pages-schema-trust-regression,
schema.test.ts, merchant-feed.xml, webhooks/printful/route.test.ts).
Decide per-test: build the feature, or delete the test. Mixing
aspirational and real tests makes regressions invisible.

## 2. Printful inbound webhook signature rejection
Printful order_updated webhooks are still 400ing with "invalid
signature". See claude_code_diagnose_printful_webhook_signature.md
in 00_admin/handoffs (asset folder, off-host).

## 3. Per-variant (not per-product) print areas
Product.printArea today stores one blob per product. When we ship
multi-variant products with different print areas per placement
(hoodie front+back, all-over apparel), expand to a placement-keyed
map. Not P0; track only.

## 4. Pet Hoodie (Printful product 921)
Marked active=false on $(date -u +%Y-%m-%d) because Printful returns
zero printfiles for product 921. File a support ticket with
Printful asking why; reactivate when resolved.
