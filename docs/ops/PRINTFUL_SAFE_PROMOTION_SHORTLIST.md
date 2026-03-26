# Printful Safe Promotion Shortlist (Internal Only)

Last reviewed: 2026-03-26  
Scope: SmartPrintAI active Printful-backed catalog (`/api/products`)  
Purpose: Keep first paid traffic and first-wave social pushes focused on low-risk products.

## Promotion Tier: Safe To Promote First

Use these products first for:
- initial paid traffic tests
- homepage/creative emphasis
- social proof and first conversion loops

| Product Name | Product ID | Printful ID | Why Safe First |
| --- | --- | --- | --- |
| All-Over Print Backpack | `cmmhtq7jt000b43l219lzhg6n` | `279` | Single-size/single-color profile, simple variant surface, low support ambiguity |
| All-Over Print Drawstring Bag | `cmmhtq6kl000943l2cgapj5e3` | `262` | Simple one-variant structure, stable everyday accessory |
| Rubber Case for AirPods® | `cmmhtq6b4000843l27hn0qxqw` | `605` | Compact variant set, clear use case, complete color previews |
| All-Over Print Bandana | `cmmhtq7uo000c43l2hrqdt4ef` | `630` | Low configuration complexity, straightforward customization expectation |
| All-Over Print Basic Pillow | `cmmhtq8cy000d43l21rnb6iph` | `83` | Small variant matrix, familiar home category, low checkout confusion |
| Luggage Tag | `cmmhtq38g000043l273fc9glv` | `938` | Single-size/single-color behavior, clear product intent |

## Do Not Promote Yet

These should stay out of first-wave promotion (ads/social priority) until explicitly re-reviewed.

### Explicitly blocked from promotion priority

| Product Name | Product ID | Printful ID | Reason |
| --- | --- | --- | --- |
| Acrylic Ornaments | `cmmhtq4e4000343l29gzhn3ca` | `793` | US-only shipping rule; not suitable for broader destination pushes |
| Unisex Performance Crew Neck T-Shirt \| A4 N3142 | `cmmhtq42c000243l2wzpfy5v8` | `679` | US-only shipping rule; destination mismatch risk outside US |
| All-Over Print Boxy Football Jersey | `cmmhtq9ma000h43l2gkyhn57s` | `1367` | Missing color preview mapping; avoid first-wave trust/support risk |

### Keep out of first-wave promotions (operational complexity / mockup lane constraints)

- All adidas products (`printfulId` `531`, `638`, `655`, `770`)
- All-Over Print Biker Shorts (`printfulId` `507`)
- Higher-variant first-wave products:
  - Pet Hoodie (`printfulId` `921`)
  - All-Over Print American Football Jersey (`printfulId` `918`)
  - Area Rug (`printfulId` `924`)

## Operational Rule

For first paid traffic iterations:
1. Prioritize only the six products in **Safe To Promote First**.
2. Exclude all products listed under **Do Not Promote Yet** from ad-focused creative and launch campaigns.
3. Re-review the shortlist only after:
   - one additional successful fresh order cycle,
   - stable support signal,
   - destination/product precheck telemetry remains green.

## Notes

- This file is internal-only operations guidance.
- It does not change storefront visibility by itself.
