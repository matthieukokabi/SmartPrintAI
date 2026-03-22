# Homepage Funnel Analytics (Wave Conversion Instrumentation)
Date: 2026-03-22

## Scope
This instrumentation measures homepage conversion behavior and progression into `/create` without invasive tracking.

It also tracks the first interaction stages inside `/create` so early post-click abandonment can be measured and improved.

## Hero Experiment Assignment
Homepage hero copy is assigned in middleware for deterministic A/B testing:

1. Middleware (`/middleware.ts`) runs on `/, /en, /fr, /de, /es`.
2. It reads/creates a stable visitor cookie (`spai_visitor_id`).
3. It deterministically assigns a hero variant from that ID (`variant_a` or `variant_b`) and persists it in `spai_home_hero_variant`.
4. The assigned variant is passed to SSR via request header `x-spai-home-hero-variant` so the rendered hero does not flicker on hydration.

## Hero Experiment Decision Guardrails
Primary metric:
- `homepage_to_create_ctr` by variant (`variant_a` vs `variant_b`)

Secondary metric:
- `create_start_rate` by variant

Threshold defaults enforced in report logic:
- `minTotalHomepageViews = 200` (experiment-eligible views only: `variant_a + variant_b`)
- `minHomepageViewsPerVariant = 75`
- `minToCreateClicksPerVariant = 10`
- `minPrimaryMetricLiftPctPoints = 5`
- `maxSecondaryMetricConflictPctPoints = 2`

Experiment status values:
- `insufficient_data`: thresholds not yet met.
- `ready_for_comparison`: thresholds met, but no clear primary-metric winner yet.
- `winner_candidate`: clear primary-metric winner with no conflicting secondary signal.
- `inconclusive`: mixed/conflicting data or tracking integrity concerns.

Decision recommendations:
- `continue_running`
- `investigate_tracking`
- `ship_winner`
- `iterate_loser_dimension`

Interpretation rule:
- Do not run a new hero copy iteration until the report is at least `ready_for_comparison` (thresholds met).
- Only promote a variant to control when status is `winner_candidate` with decision `ship_winner`.

## Experiment Operations
Commands:
- `npm run analytics:funnel:report`: full funnel + experiment decision report.
- `npm run analytics:create:entry-report`: create-entry stage funnel report (post-click interaction/readiness).
- `npm run analytics:create:entry-readiness`: concise create-entry readiness + blockers output.
- `npm run analytics:create:entry-snapshot`: append create-entry readiness snapshot row for monitoring history.
- `npm run analytics:hero:readiness`: concise readiness-focused output showing what is still missing.
- `npm run analytics:hero:snapshot`: append a dated snapshot row for historical tracking.

Snapshot storage:
- Default file: `data/analytics/homepage-hero-experiment-snapshots.jsonl`
- Optional override: `HOMEPAGE_HERO_EXPERIMENT_SNAPSHOT_PATH`
- Snapshot files are local/internal and ignored by git.

Snapshot row fields:
- `snapshotAt`, `snapshotDate`, `source`
- total homepage views/clicks/create-starts
- per-variant views/clicks/create-starts/rates
- experiment `status`, `decision`, `winnerCandidate`
- readiness state (`readyForComparison`, `readinessMessage`, `blockers`)

Readiness progress interpretation:
- The report/readiness command prints exact remaining counts for each threshold, including variant-specific deficits (for example: additional views or to-create clicks still needed in `variant_b`).
- Use this output for daily monitoring while traffic accumulates.

## Collection Pipeline
1. Client event helpers (`trackHomepage*`) emit GA4 events when `gtag` is available.
2. Homepage funnel events are always forwarded to `/api/analytics/events` (same-origin), even when GA is unavailable.
3. Server appends validated JSONL records to `data/analytics/homepage-events.jsonl`.
4. Aggregation utilities build funnel metrics from stored records.
5. `npm run analytics:funnel:report` prints a readable report and writes:
- `docs/reports/artifacts/homepage-funnel/latest.json`

## Event Taxonomy
All events are emitted through [`src/lib/analytics.ts`](/Users/magikmad/Documents/New%20project/SmartPrintAI/src/lib/analytics.ts).

1. `homepage_viewed`
- Fires: once on homepage client mount.
- Properties: `locale`, `page_variant`.

2. `homepage_cta_clicked`
- Fires: on homepage CTA interactions (delegated click listener).
- Properties: `cta_location`, `cta_label`, `destination`, `page_variant`.

3. `homepage_to_create_clicked`
- Fires: when a tracked homepage CTA points to `/create` (or localized create route).
- Properties: `cta_location`, `cta_label`, `destination`, `page_variant`.

4. `homepage_section_viewed`
- Fires: once per section per page view using `IntersectionObserver`.
- Properties: `section_name`, `page_variant`.

5. `homepage_scroll_depth_reached`
- Fires: once per milestone per page view (`25`, `50`, `75`, `90`).
- Properties: `scroll_depth_percent`, `page_variant`.

6. `product_proof_section_viewed`
- Fires: once when the dedicated homepage product-proof section becomes visible.
- Properties: `page_variant`.

7. `product_proof_cta_clicked`
- Fires: when CTA(s) inside the homepage product-proof section are clicked.
- Properties: `cta_location`, `cta_label`, `destination`, `page_variant`.

8. `create_flow_started`
- Fires: when `/create` client loads.
- Properties: `entrypoint` (`homepage` | `other` | `unknown`), `referrer_path`, `locale`, `page_variant`.

9. `create_page_viewed`
- Fires: when `/create` entry UI loads.
- Properties: `entrypoint`, `referrer_path`, `locale`, `page_variant`.

10. `create_entrypoint_resolved`
- Fires: once when `/create` resolves source classification.
- Properties: `entrypoint`, `referrer_path`, `locale`, `page_variant`.

11. `create_prompt_input_focused`
- Fires: first time prompt textarea is focused per create-page view.
- Properties: `entrypoint`, `locale`, `page_variant`.

12. `create_prompt_started`
- Fires: first time prompt content becomes non-empty per create-page view.
- Properties: `entrypoint`, `locale`, `page_variant`, `prompt_length_bucket`.

13. `create_generation_started`
- Fires: first prompt submission/generation start per create-page view.
- Properties: `entrypoint`, `locale`, `page_variant`, `prompt_length_bucket`, `template_type`, `has_reference_image`.

14. `create_template_selected`
- Fires: first style/template change per create-page view.
- Properties: `entrypoint`, `locale`, `page_variant`, `template_type`.

15. `create_product_selected`
- Fires: first product selection after generation per create-page view.
- Properties: `entrypoint`, `locale`, `page_variant`, `product_type`, `product_id`.

16. `create_flow_abandoned_early`
- Fires: when user leaves `/create` without starting generation.
- Properties: `entrypoint`, `referrer_path`, `locale`, `page_variant`, `last_completed_step`, `prompt_length_bucket`.

## Product-Proof Exposure Analysis
Goal:
- Compare users who saw the homepage product-proof section vs users who did not.

Linkage model:
- All homepage/create-start funnel events now include `visitor_id` from cookie `spai_visitor_id` when available.
- Exposure analysis groups only users with at least one `homepage_viewed` event and a valid `visitor_id`.

Exposure groups:
- `product_proof_exposed`: visitor has `product_proof_section_viewed`.
- `product_proof_not_exposed`: visitor has homepage view but no product-proof section view.

Metrics per group:
- `totalUsers`
- `ctaClicks`
- `createStarts`
- `homepageToCreateCtr` (users with >=1 homepage->create click / total users)
- `createStartRate` (users with >=1 create_flow_started from homepage / total users)
- `clickToCreateStartRate` (users with click and create-start / users with click)

Delta output:
- Exposed minus not-exposed for:
- homepage->create CTR
- create-start rate
- click->create-start rate

Interpretation status:
- `positive_signal`: exposed users outperform on CTR and create-start rate (with sufficient cohorts).
- `weak_signal`: little or mixed difference.
- `potential_issue`: exposed users underperform materially.
- `insufficient_data`: one or both cohorts below minimum size.

## Create Entry Decision Guardrails
Primary metric:
- `prompt_start_rate_from_create_view`

Secondary metric:
- `generation_start_rate_from_prompt_start`

Threshold defaults enforced in create-entry report logic:
- `minCreatePageViewed = 120`
- `minPromptInputFocused = 70`
- `minPromptStarted = 45`
- `minGenerationStarted = 25`
- `minActionableDropoffRatePct = 10`

Create-entry status values:
- `insufficient_data`: thresholds are not met yet.
- `ready_for_comparison`: thresholds are met, but no early friction stage is strong enough to optimize.
- `friction_candidate`: thresholds are met and one early stage has actionable drop-off.
- `inconclusive`: tracking integrity checks failed (do not optimize until fixed).

Create-entry decision values:
- `continue_running`
- `investigate_tracking`
- `optimize_first_friction_point`
- `no_action_yet`

First friction logic:
- `firstFrictionPoint`: biggest early drop-off stage by count/rate.
- `firstActionableFrictionPoint`: only set when thresholds are met and drop-off is actionable.

Readiness progress:
- Report includes threshold progress (`current`, `required`, `remaining`) and blockers.
- Typical messages include:
- `Need X more create_page_viewed events.`
- `Need Y more create_prompt_started events.`
- `Data too immature to optimize create-entry friction.`
- `Ready to optimize before_generation_start.`

Iteration rule:
- Next `/create` UX iteration is allowed only when:
- `status = friction_candidate`
- `decision = optimize_first_friction_point`
- `firstActionableFrictionPoint != none`
- If status is `insufficient_data`, `ready_for_comparison`, or `inconclusive`, keep running and do not change `/create` UX.

## Where Events Fire
1. Homepage tracker:
- [`src/components/home/HomeFunnelAnalytics.tsx`](/Users/magikmad/Documents/New%20project/SmartPrintAI/src/components/home/HomeFunnelAnalytics.tsx)
- Handles page view, CTA clicks, section impressions, and scroll milestones.

2. Homepage markup:
- [`src/components/home/HomeLanding.tsx`](/Users/magikmad/Documents/New%20project/SmartPrintAI/src/components/home/HomeLanding.tsx)
- Provides `data-home-section` and `data-home-cta` attributes.

3. Navbar/footer CTA hooks:
- [`src/components/layout/Navbar.tsx`](/Users/magikmad/Documents/New%20project/SmartPrintAI/src/components/layout/Navbar.tsx)
- [`src/components/layout/Footer.tsx`](/Users/magikmad/Documents/New%20project/SmartPrintAI/src/components/layout/Footer.tsx)

4. Create flow start + entry instrumentation:
- [`src/components/create/CreatePageClient.tsx`](/Users/magikmad/Documents/New%20project/SmartPrintAI/src/components/create/CreatePageClient.tsx)
- [`src/components/create/PromptInput.tsx`](/Users/magikmad/Documents/New%20project/SmartPrintAI/src/components/create/PromptInput.tsx)

5. Event sink API route:
- [`src/app/api/analytics/events/route.ts`](/Users/magikmad/Documents/New%20project/SmartPrintAI/src/app/api/analytics/events/route.ts)

6. Aggregation/reporting utilities:
- [`src/lib/homepage-funnel-report.ts`](/Users/magikmad/Documents/New%20project/SmartPrintAI/src/lib/homepage-funnel-report.ts)
- [`src/lib/create-entry-funnel-report.ts`](/Users/magikmad/Documents/New%20project/SmartPrintAI/src/lib/create-entry-funnel-report.ts)
- [`scripts/report_homepage_funnel.ts`](/Users/magikmad/Documents/New%20project/SmartPrintAI/scripts/report_homepage_funnel.ts)
- [`scripts/report_create_entry_funnel.ts`](/Users/magikmad/Documents/New%20project/SmartPrintAI/scripts/report_create_entry_funnel.ts)

## Create Entry Report Readout
`npm run analytics:create:entry-report` outputs:
- create page views
- prompt interaction and prompt-start rates
- generation-start rate
- template/product selection rates
- early abandonment rate
- biggest early drop-off stage (`before_prompt_focus`, `before_prompt_start`, `before_generation_start`)

Artifact output:
- `docs/reports/artifacts/create-entry-funnel/latest.json`

Create-entry snapshot storage:
- Default file: `data/analytics/create-entry-funnel-snapshots.jsonl`
- Optional override: `CREATE_ENTRY_FUNNEL_SNAPSHOT_PATH`
- Snapshot files are local/internal and ignored by git.

Interpretation:
- Treat `biggestEarlyDropoffStep` as the first friction point to optimize.
- Do one focused `/create` entry iteration at a time (copy/clarity first), then re-measure.

## Guardrails
- Section impressions are deduped with per-view `Set`.
- Scroll milestones are emitted once each per view.
- CTA tracking is centralized via delegated listener to avoid repetitive inline handlers.
- Event names are stable constants in `HOMEPAGE_EVENT_NAMES`.
- Event intake is rate-limited on `/api/analytics/events`.
- Invalid event names/payloads are rejected server-side.

## Notes
- Funnel reports are generated from the real event log only (`source = event_log`).
- If no events are recorded yet, the report returns zeroed metrics with `hasData = false` and `recordCount = 0`.
- Report output includes per-variant breakdown (`variant_a` vs `variant_b`) for CTR, create-start rate, click->create-start rate, and drop-off step comparison.
