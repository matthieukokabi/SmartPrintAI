# Homepage Funnel Analytics (Wave Conversion Instrumentation)
Date: 2026-03-22

## Scope
This instrumentation measures homepage conversion behavior and progression into `/create` without invasive tracking.

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

6. `create_flow_started`
- Fires: when `/create` client loads.
- Properties: `entrypoint` (`homepage` | `other` | `unknown`), `referrer_path`, `locale`.

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

4. Create flow start:
- [`src/components/create/CreatePageClient.tsx`](/Users/magikmad/Documents/New%20project/SmartPrintAI/src/components/create/CreatePageClient.tsx)

## Guardrails
- Section impressions are deduped with per-view `Set`.
- Scroll milestones are emitted once each per view.
- CTA tracking is centralized via delegated listener to avoid repetitive inline handlers.
- Event names are stable constants in `HOMEPAGE_EVENT_NAMES`.
