# Google Ads Weekly Optimization Checklist

Last updated: 2026-03-20
Owner: Growth/Ops
Cadence: Weekly (once per week, same day/time)

## Scope
- Google Shopping test campaign
- Performance Max campaign
- Branded Search campaign

## Inputs to collect first
- Last 7 days spend, clicks, impressions, conversions, conversion value
- Cost per conversion, ROAS, CTR, CPC
- Top search terms and negative keyword candidates
- Product-group level spend/conversion (Shopping + PMax)
- Disapproved/limited products in Merchant Center

## Weekly checklist

1. Budget pacing
- Confirm spend is aligned with weekly cap and target test budget.
- If spend is too low (<70% of weekly target), loosen restrictive targeting/bids.
- If spend is too high (>120% of weekly target), tighten bids or low-quality segments.

2. Search terms hygiene
- Export search terms from the last 7 days.
- Add irrelevant terms as negative keywords.
- Keep a small allowlist for high-intent terms around custom merch, AI design, and brand queries.

3. Product-group quality control
- Identify product groups with spend but zero conversions in the last 14 days.
- Reduce bids or exclude weak groups.
- Reallocate budget toward top-converting product groups.

4. Creative + feed sanity
- Confirm no critical Merchant Center disapprovals.
- Verify landing pages and prices still match feed values.
- Check that image quality and product titles are still clean for best-performing groups.

5. Brand protection
- Ensure branded Search campaign remains active.
- Keep top-of-page visibility for branded terms.
- Add competitor/irrelevant negatives when needed.

6. ROAS and bid adjustments
- If ROAS is below target for 2+ consecutive weeks, reduce bids 10-20% on weak segments.
- If ROAS is above target and volume is stable, increase bids 5-10% on winning segments.
- Apply only one major bid strategy change per week to keep attribution interpretable.

7. Conversion tracking integrity
- Validate purchase conversion tags fire on checkout success.
- Confirm conversion values are non-zero and in expected USD ranges.
- Investigate any sudden conversion drop before changing campaign structure.

## Weekly output template

Create a short weekly log with:
- Week range
- Spend / Conversions / ROAS
- Top 3 wins
- Top 3 issues
- Changes made this week
- Expected impact next week

Example:
- Week: 2026-03-16 to 2026-03-22
- Spend: $100
- Conversions: 4
- ROAS: 2.4
- Wins: Branded Search CTR improvement, best product group ROAS increase, fewer disapprovals
- Issues: Two product groups with high spend and no conversions, rising CPC on broad terms
- Changes: Added 14 negatives, cut bids 15% on weak groups, raised bids 7% on top group
- Expected impact: Lower wasted spend, improved blended ROAS

## Guardrails
- Do not edit everything at once. Limit to highest-impact changes.
- Keep a weekly changelog so performance shifts can be attributed.
- Escalate immediately if:
  - conversion tracking breaks,
  - major Merchant Center disapproval wave appears,
  - spend spikes unexpectedly beyond budget cap.
