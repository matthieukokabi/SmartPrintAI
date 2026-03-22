# SmartPrintAI Traffic Launch Packet
Date: 2026-03-22
Owner: Growth + Product + Ops

## Purpose
Run a controlled, attribution-clean first traffic batch so homepage and create-entry funnel decisions are based on real segmented data.

## 1) Tagged URLs (Copy/Paste Ready)
All URLs follow the canonical UTM contract and route to homepage (`/`) so the existing homepage funnel + hero experiment instrumentation captures entry.

### Meta (`utm_source=meta`, `utm_medium=paid_social`)
- Creative A:
`https://smartprintai.com/?utm_source=meta&utm_medium=paid_social&utm_campaign=social_conversion_us_creators_drop1_2026_03&utm_content=video_hook_a`
- Creative B:
`https://smartprintai.com/?utm_source=meta&utm_medium=paid_social&utm_campaign=social_conversion_us_creators_drop1_2026_03&utm_content=carousel_mockup_b`

### Google (`utm_source=google`, `utm_medium=paid_search`)
- Search ad A:
`https://smartprintai.com/?utm_source=google&utm_medium=paid_search&utm_campaign=search_conversion_us_intent_high_2026_03&utm_content=text_ad_a&utm_term=ai_tshirt_design`
- Search ad B:
`https://smartprintai.com/?utm_source=google&utm_medium=paid_search&utm_campaign=search_conversion_us_intent_high_2026_03&utm_content=text_ad_b&utm_term=custom_hoodie_print`

### TikTok (`utm_source=tiktok`, `utm_medium=paid_social`)
- Creative A:
`https://smartprintai.com/?utm_source=tiktok&utm_medium=paid_social&utm_campaign=social_conversion_us_genz_hook1_2026_03&utm_content=creator_demo_a`
- Creative B:
`https://smartprintai.com/?utm_source=tiktok&utm_medium=paid_social&utm_campaign=social_conversion_us_genz_hook1_2026_03&utm_content=trend_cut_b`

### X Organic (`utm_source=x`, `utm_medium=organic_social`)
- Organic post:
`https://smartprintai.com/?utm_source=x&utm_medium=organic_social&utm_campaign=social_awareness_global_launch_2026_03&utm_content=thread_teaser_a`

### X Paid (optional) (`utm_source=x`, `utm_medium=paid_social`)
- Paid post:
`https://smartprintai.com/?utm_source=x&utm_medium=paid_social&utm_campaign=social_conversion_us_creators_test_2026_03&utm_content=paid_post_a`

## 2) Initial Traffic Plan (Controlled Batch)
Objective: collect usable early signal without contaminating active experiments through aggressive spikes.

### Batch Window
- Total window: 48 hours
- Pacing: smooth delivery, no burst launch

### Click Caps (max)
- Meta: 40 clicks
- Google: 40 clicks
- TikTok: 35 clicks
- X: 20 clicks

### Suggested pacing
- Day 1 (first 24h): Meta 20, Google 20, TikTok 20, X 10
- Day 2 (next 24h): Meta +20, Google +20, TikTok +15, X +10

### Operational constraints
- Keep per-platform caps hard.
- Do not change hero copy, product-proof section, or create UX during this batch.
- Do not rotate naming mid-flight.

## 3) Measurement Window
- Suggested launch start: 2026-03-23 15:00 UTC (11:00 ET / 08:00 PT)
- Minimum usable sample before decisions:
  - `trackedUsers >= 50`
  - `create_page_viewed >= 20`
- Observation period:
  - Early read: 24h
  - Stable read: 48h
  - Final first-pass read: 72h max

## 4) Metrics and Success Criteria
## Primary metric
- Homepage -> create CTR (`homepage_to_create_ctr`)

### Secondary metrics
- Create flow started rate from homepage view (`create_flow_started / homepage_viewed`)
- Prompt start rate from create entry (`create_prompt_started / create_page_viewed`)

### Baseline guidance
- Homepage -> create CTR:
  - Green: `>= 20%`
  - Amber: `10% to <20%`
  - Red: `<10%`
- Create flow started rate from homepage view:
  - Green: `>= 8%`
  - Amber: `4% to <8%`
  - Red: `<4%`
- Prompt start rate from create entry:
  - Green: `>= 45%`
  - Amber: `30% to <45%`
  - Red: `<30%`

### Immediate red flags
- CTR `<10%`
- Click -> create-start rate `<30%`
- Prompt start rate `<30%`
- Any strong source skew into `unknown/direct/internal` despite tagged traffic

## 5) Post-Launch Validation (Run Immediately)
Run from repo root:

```bash
npm run analytics:funnel:report
npm run analytics:create:entry-report
```

Optional control re-check:

```bash
npm run analytics:attribution:qa
```

### Validation checklist
- [ ] Tagged traffic appears in canonical `utm_source` buckets (`meta`, `google`, `tiktok`, `x`).
- [ ] `unknown/direct/internal` is not absorbing tagged launch traffic.
- [ ] `visitor_id` integrity remains intact (tracked users increase in report).
- [ ] Source segmentation is visible in homepage and create-entry reports.
- [ ] Both hero variants (`variant_a`, `variant_b`) receive traffic.
- [ ] Create-entry stages begin to populate (at least `create_page_viewed` and `create_prompt_started` growth).

## 6) Decision Checkpoints (One Variable at a Time)
## Checkpoint 1: Hero experiment decision
Only evaluate hero winner/loser when hero readiness thresholds are met:
- `minTotalHomepageViews = 200`
- `minHomepageViewsPerVariant = 75`
- `minToCreateClicksPerVariant = 10`

If thresholds not met: `continue_running`.

## Checkpoint 2: Create-entry friction decision
Only evaluate first friction optimization when create-entry thresholds are met:
- `minCreatePageViewed = 120`
- `minPromptInputFocused = 70`
- `minPromptStarted = 45`
- `minGenerationStarted = 25`

If thresholds not met: `continue_running`.

## Change control rules
- Change one variable per iteration.
- Never bundle hero + product-proof + create-entry UX changes in one pass.
- After each change, re-run the same measurement window before new edits.

