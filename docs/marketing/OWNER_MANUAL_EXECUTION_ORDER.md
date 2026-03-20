# Owner Manual Execution Order (Today/Tomorrow)

Last updated: 2026-03-20  
Scope: Remaining owner-only actions Codex cannot run (payment/accounts/ad-platform UI).

## Goal
Close remaining high-priority manual tasks in the correct order with proof artifacts so Codex can verify and close TODOs immediately.

## Today (Execution Day)

### 1) Run one real live purchase on production (P0)
Reference: [../PROD_LIVE_PURCHASE_CHECKLIST.md](../PROD_LIVE_PURCHASE_CHECKLIST.md)

Manual owner actions:
- Complete one real paid checkout on `https://smartprintai.com`.
- Save:
  - success URL with `session_id=...`
  - buyer email used
  - Stripe payment screenshot (paid/settled state once visible)

Pass condition:
- Real payment completed and proof captured.

### 2) Launch first `$100` Google Shopping test
Reference: [GOOGLE_MERCHANT_FEED_SETUP.md](./GOOGLE_MERCHANT_FEED_SETUP.md)

Manual owner actions in Google Ads:
- Create Shopping campaign linked to Merchant Center products.
- Set initial test budget totalling about `$100` for week 1.
- Keep geo/language targeting aligned with primary launch market.

Proof to capture:
- Campaign overview screenshot (name, budget, status = enabled)
- Product group visibility screenshot

Pass condition:
- Campaign active and serving eligibility confirmed.

## Tomorrow (Stabilization Day)

### 3) Launch first Performance Max campaign
Reference: [GOOGLE_ADS_WEEKLY_OPTIMIZATION_CHECKLIST.md](./GOOGLE_ADS_WEEKLY_OPTIMIZATION_CHECKLIST.md)

Manual owner actions:
- Create one PMax campaign with conversion objective and ROAS target.
- Use Merchant Center feed as product source.

Proof to capture:
- Campaign settings screenshot
- Asset group + audience/geo summary screenshot

Pass condition:
- PMax enabled with valid product source.

### 4) Launch branded Search campaign
Reference: [GOOGLE_ADS_WEEKLY_OPTIMIZATION_CHECKLIST.md](./GOOGLE_ADS_WEEKLY_OPTIMIZATION_CHECKLIST.md)

Manual owner actions:
- Create branded Search campaign to protect brand queries.
- Add core negatives and exact/phrase brand terms.

Proof to capture:
- Keyword list screenshot
- Campaign status screenshot

Pass condition:
- Branded campaign enabled with active keywords.

### 5) Social account rollout + first cadence
References:
- [SOCIAL_CONTENT_CALENDAR_TEMPLATE.md](./SOCIAL_CONTENT_CALENDAR_TEMPLATE.md)
- [WEEKLY_CONTENT_BATCH_WORKFLOW.md](./WEEKLY_CONTENT_BATCH_WORKFLOW.md)
- [NANO_INFLUENCER_OUTREACH_KIT.md](./NANO_INFLUENCER_OUTREACH_KIT.md)

Manual owner actions:
- Create/activate: TikTok, Instagram Business, Facebook Page, Pinterest, YouTube Shorts.
- Publish first week minimum starter:
  - TikTok: 5
  - Instagram Reels: 5
  - Pinterest pins: 7
  - YouTube Shorts: 3
- Start outreach to first 5 nano-influencers using templates/tracker.

Proof to capture:
- One screenshot per platform account live
- Post list screenshots (or links) for first batch
- Tracker file with first outreach rows filled

Pass condition:
- Accounts live + first content batch posted + outreach started.

## Hand-off Back to Codex

After each section, send:
- screenshots/links
- session id (for live purchase)
- any blocker notes (platform rejection, billing hold, policy warning)

Codex will then run verification scripts where possible and close matching TODO items.
