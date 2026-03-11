# Weekly Content Batch Workflow (90 minutes)

This workflow generates a reusable weekly content pack for TikTok, Pinterest, and SEO topics.

## Objective
- Build one weekly batch in 90 minutes.
- Cover:
  - 5 TikTok posts
  - 7 Pinterest pins
  - 2 SEO blog topics

## Command
Run from project root:

```bash
npm run marketing:weekly-batch
```

Optional flags:

```bash
# Lock plan to a given week start date (YYYY-MM-DD)
npm run marketing:weekly-batch -- --week-start=2026-03-16

# Save output to a file
npm run marketing:weekly-batch -- --write=docs/marketing/batches/2026-W12.md
```

## 90-minute schedule
1. 15 min: Select TikTok hooks and assign publication days.
2. 20 min: Generate all mockups and short clips in one batch.
3. 20 min: Prepare Pinterest pin set from winning prompts.
4. 20 min: Draft two blog outlines with internal links.
5. 15 min: QA links, CTA clarity, and publish calendar.

## Publishing quality gate
- Each social asset links to `https://smartprintai.com/create` (or localized equivalent).
- Product visuals match real products and valid colorways.
- Captions include one clear CTA and one audience keyword.
- Prompts avoid copyrighted characters and protected trademarks.

## Recommended tracking columns
Keep one tracking sheet with these fields:
- `week`
- `channel`
- `theme`
- `prompt`
- `publish_datetime`
- `cta`
- `url`
- `views_24h`
- `click_rate`
- `add_to_cart`
- `winner` (yes/no)

## Next iteration rule
At the end of each week:
- Keep top 20% winning concepts.
- Rewrite the bottom 30% with new hooks.
- Re-run `npm run marketing:weekly-batch` and ship next batch.
