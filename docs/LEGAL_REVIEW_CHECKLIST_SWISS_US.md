# Legal Review Checklist (Swiss + US Foundation)

Generated: 2026-03-18  
Scope: Wave 3 foundation only. No legal claim copy changes are included in this step.

## Use This Checklist
- Goal: provide counsel-ready inventory and verification points before any legal text updates.
- Status markers:
  - `PENDING`: not yet legally reviewed
  - `IN REVIEW`: sent to legal counsel / compliance reviewer
  - `APPROVED`: reviewed and approved for current launch scope
- Evidence expectation: each approved item should link to dated screenshot or commit/hash proving final copy.

## Jurisdiction Checklist
### Swiss (CH) review items
- [ ] Confirm transparency elements required under Swiss FADP are present in privacy policy (data categories, processing purpose, contact channel, data retention approach).
- [ ] Confirm any cross-border data transfer disclosure is accurate for US-hosted providers (Stripe/Resend/Print providers).
- [ ] Confirm pricing transparency expectations for CH visitors (currency display, shipping disclosure timing, tax/VAT treatment messaging).
- [ ] Confirm custom-product return/refund limitation language is explicit and not contradictory across product pages, trust strips, and terms.
- [ ] Confirm company identity/imprint requirements for Swiss-targeted ecommerce traffic are satisfied (legal entity + contact details placement).

### US review items
- [ ] Confirm FTC truth-in-advertising alignment for delivery/support promises and marketing claims.
- [ ] Confirm shipping-time representations align with fulfillment reality (especially checkout estimate vs support/trust copy).
- [ ] Confirm privacy notice covers applicable state-law rights where required (for example CPRA/CCPA triggers, if thresholds are met).
- [ ] Confirm marketing email flow compliance (clear sender identity, opt-out handling, CAN-SPAM basics).
- [ ] Confirm return/refund and final-sale policy language is consistent across product, terms, and support surfaces.

## Page + Component Review Map
| Surface | Route / Trigger | Files | Legal Copy / Behavior To Verify | Jurisdiction Focus | Status |
|---|---|---|---|---|---|
| Terms of Service | `/terms` | `src/app/terms/page.tsx` | Order/fulfillment terms, AI-generated content responsibility, support escalation references | CH + US | PENDING |
| Privacy Policy | `/privacy` | `src/app/privacy/page.tsx` | Data categories, processing purposes, support contact for rights/privacy requests | CH + US | PENDING |
| Support center copy | `/support`, `/[locale]/support` | `src/components/support/SupportPageClient.tsx`, `src/lib/i18n.ts`, `src/app/support/layout.tsx`, `src/app/[locale]/support/page.tsx` | SLA and shipping-response promises, support channel wording, FAQ operational claims | CH + US | PENDING |
| Trust strip claims | `/create`, `/products`, `/products/[id]` (+ localized variants) | `src/components/shared/TrustSignalStrip.tsx`, `src/lib/trust.ts` | Delivery SLA, support response promise, return/final-sale wording and terms links | CH + US | PENDING |
| Product detail offer schema | Product detail pages | `src/app/products/[id]/page.tsx`, `src/app/[locale]/products/[id]/page.tsx`, `src/lib/schema.ts` | Shipping details + return policy schema fields must mirror actual legal policy intent | CH + US | PENDING |
| Product list + blog schema links | `/blog`, `/products` (+ localized variants) | `src/app/[locale]/products/page.tsx`, `src/app/[locale]/blog/page.tsx`, `src/app/[locale]/blog/[slug]/page.tsx` | Schema URLs should stay canonical-safe; avoid geo/locale mismatch in compliance references | CH + US | PENDING |
| Checkout shipping estimate | Checkout session creation | `src/app/api/checkout/route.ts` | `delivery_estimate` and shipping rate wording must match promised SLA language | US (primary) + CH visitor impact | PENDING |
| Order confirmation emails | Post-checkout + shipment | `src/lib/resend.ts` (`sendOrderConfirmation`, `sendShipmentNotification`) | Transactional messaging should not contradict terms/refund/delivery policies | CH + US | PENDING |
| Support auto-reply email | Support form submission | `src/lib/resend.ts` (`sendSupportAutoReply`) | Response-time promise in email must match support page/trust strip commitments | CH + US | PENDING |
| Marketing coupon email | Lead capture popup | `src/app/api/marketing/lead/route.ts`, `src/lib/resend.ts` (`sendFirstOrderCouponEmail`) | Promotional compliance basics, sender identity, opt-out process verification | US (CAN-SPAM) + CH marketing transparency | PENDING |
| Footer legal discoverability | Global footer | `src/components/layout/Footer.tsx` | Visibility and accessibility of Privacy/Terms/Support links | CH + US | PENDING |
| About page trust links | `/about` | `src/app/about/page.tsx` | Consistency of policy references and support/legal link targets | CH + US | PENDING |

## Gaps Noted (Foundation)
- Localized `/terms` and `/privacy` routes are not present yet; legal must confirm whether English-only policy pages are acceptable for current locale rollout.
- No code-level legal-acceptance capture (checkbox/audit trail) is currently enforced in checkout/auth flows.
- No explicit “last reviewed by legal” metadata block is present in legal pages.

## Next Step After Legal Review
- Apply counsel-approved copy updates in one isolated legal-content commit, then re-run `lint`, `test`, `build`, and SEO/security gates before deployment.
