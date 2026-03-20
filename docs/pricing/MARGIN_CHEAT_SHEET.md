# Margin Cheat Sheet

Generated at: 2026-03-20T00:56:20.582Z

Source: api:https://smartprintai.com/api/products

Stripe fee model used: 2.90% + 0.30 per order (estimate only).

Assumptions:

- Customer shipping charged: 5.99 (env: `MARGIN_CUSTOMER_SHIPPING_CHARGE`)
- AI generation cost per AI-customizable order: 0.04 (env: `MARGIN_AI_GENERATION_COST`)
- Printful provider shipping cost: 5.99 (env: `MARGIN_PRINTFUL_SHIPPING_COST`)
- Gooten provider shipping cost: 5.99 (env: `MARGIN_GOOTEN_SHIPPING_COST`)
- Gelato provider shipping cost: 5.99 (env: `MARGIN_GELATO_SHIPPING_COST`)
- Unknown provider shipping cost: 5.99 (env: `MARGIN_UNKNOWN_SHIPPING_COST`)

Active products analyzed: 45

## Provider Summary

| Provider | Products | Avg Base | Avg Sell | Avg Cust Shipping | Avg Provider Shipping | Avg AI Cost | Avg Stripe Fee | Avg Total Cost | Avg Net Earnings | Avg Net Earnings % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| gooten | 26 | 24.11 | 53.05 | 5.99 | 5.99 | 0.02 | 2.01 | 32.14 | 26.90 | 44.44% |
| printful | 19 | 19.82 | 43.61 | 5.99 | 5.99 | 0.03 | 1.74 | 27.58 | 22.02 | 42.47% |

## Top Net Earnings Products

| Product | Provider | Sell | Total Revenue | Total Cost | Net Earnings | Net Earnings % |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| All-Over Print Zip-Up Hoodies | gooten | 113.08 | 119.07 | 61.14 | 57.93 | 48.65% |
| Klean Kanteen TKWide Insulated Water Bottles With Loop Cap | gooten | 113.08 | 119.07 | 61.14 | 57.93 | 48.65% |
| adidas Quarter Zip Pullover | printful | 105.49 | 111.48 | 57.47 | 54.01 | 48.45% |
| All-Over Print Pullover Hoodies | gooten | 105.38 | 111.37 | 57.42 | 53.95 | 48.44% |
| Klean Kanteen Eco Insulated Water Bottles With Loop Cap | gooten | 100.98 | 106.97 | 55.29 | 51.68 | 48.31% |
| Klean Kanteen Eco Tumblers with Cafe Cap | gooten | 91.08 | 97.07 | 50.51 | 46.56 | 47.97% |
| adidas Space-Dyed Polo Shirt | printful | 89.10 | 95.09 | 49.55 | 45.54 | 47.89% |
| Hoodies (Zip-up) | gooten | 78.98 | 84.97 | 44.69 | 40.28 | 47.40% |
| adidas Premium Polo Shirt | printful | 71.50 | 77.49 | 41.04 | 36.45 | 47.04% |
| All-Over Print Sweatshirts | gooten | 69.08 | 75.07 | 39.87 | 35.20 | 46.89% |

## Lowest Net Earnings Products

| Product | Provider | Sell | Total Revenue | Total Cost | Net Earnings | Net Earnings % |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Acrylic Ornaments | printful | 14.50 | 20.49 | 13.42 | 7.07 | 34.50% |
| All-Over Print Bandana | printful | 17.49 | 23.48 | 14.96 | 8.52 | 36.29% |
| Rubber Case for AirPods® | printful | 17.49 | 23.48 | 14.96 | 8.52 | 36.29% |
| All-Over Print Basic Pillow Case | printful | 23.10 | 29.09 | 17.67 | 11.42 | 39.26% |
| All-Over Print Beanie | printful | 23.10 | 29.09 | 17.67 | 11.42 | 39.26% |
| Luggage Tag | printful | 23.10 | 29.09 | 17.67 | 11.42 | 39.26% |
| All-Over Print Basic Pillow | printful | 26.29 | 32.28 | 19.22 | 13.06 | 40.46% |
| All-Over Print Drawstring Bag | printful | 26.29 | 32.28 | 19.22 | 13.06 | 40.46% |
| Beanies | gooten | 27.28 | 33.27 | 19.69 | 13.58 | 40.82% |
| Trucker Caps | gooten | 29.48 | 35.47 | 20.76 | 14.71 | 41.47% |

Formula:

- `totalRevenue = sellPrice + customerShippingCharge`
- `totalCost = basePrice + providerShippingCost + aiGenerationCost + stripeFeeEstimate`
- `netEarnings = totalRevenue - totalCost`

CSV output path: `docs/pricing/MARGIN_CHEAT_SHEET.csv`

