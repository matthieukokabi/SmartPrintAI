# Google Merchant Feed Setup

Last updated: 2026-03-11

## Feed URL
- Production feed URL: `https://smartprintai.com/google/merchant-feed.xml`
- Format: RSS 2.0 with Google `g:` attributes
- Refresh behavior: updated automatically; cache interval ~1 hour

## What is included
- All active SmartPrintAI products from DB
- Fields: id, title, description, product URL, image URL, price (USD), availability, condition, brand, Google category

## Merchant Center setup steps
1. Open Google Merchant Center.
2. Go to `Products` -> `Data sources`.
3. Add a new product source.
4. Choose scheduled fetch.
5. Set file URL to `https://smartprintai.com/google/merchant-feed.xml`.
6. Set fetch schedule to daily.
7. Save and run first fetch.

## Validation checklist
- Feed fetch status is successful.
- Product count matches active products in SmartPrintAI.
- No image fetch errors.
- No price format errors.
- No policy blockers before connecting to Google Ads.

## Notes
- This feed is a technical prerequisite. It does not launch ads by itself.
- The `$100` Google Shopping test remains a manual campaign step in Google Ads.
