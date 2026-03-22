import { describe, expect, it } from 'vitest'
import { aggregateHomepageFunnel, type HomepageFunnelEventRecord } from '@/lib/homepage-funnel-report'
import { HOMEPAGE_EVENT_NAMES } from '@/lib/analytics'
import { buildHeroExperimentSnapshot, didHeroExperimentBecomeReady } from '@/lib/hero-experiment-monitoring'

function buildRecord(
    eventName: keyof typeof HOMEPAGE_EVENT_NAMES,
    overrides: Partial<HomepageFunnelEventRecord> = {}
): HomepageFunnelEventRecord {
    return {
        eventName: HOMEPAGE_EVENT_NAMES[eventName],
        params: {},
        path: '/',
        pageVariant: 'variant_a',
        locale: 'en',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
        deviceType: 'desktop',
        createdAt: new Date('2026-03-22T00:00:00.000Z').toISOString(),
        ...overrides,
    }
}

describe('hero experiment monitoring helpers', () => {
    it('builds snapshot payload from funnel report', () => {
        const report = aggregateHomepageFunnel([
            ...Array.from({ length: 4 }, () => buildRecord('viewed', { pageVariant: 'variant_a', params: { page_variant: 'variant_a' } })),
            ...Array.from({ length: 2 }, () => buildRecord('toCreateClicked', { pageVariant: 'variant_a', params: { page_variant: 'variant_a', cta_location: 'hero_primary_create' } })),
            ...Array.from({ length: 1 }, () => buildRecord('createFlowStarted', { pageVariant: 'variant_a', params: { page_variant: 'variant_a' } })),
            ...Array.from({ length: 5 }, () => buildRecord('viewed', { pageVariant: 'variant_b', params: { page_variant: 'variant_b' } })),
            ...Array.from({ length: 1 }, () => buildRecord('toCreateClicked', { pageVariant: 'variant_b', params: { page_variant: 'variant_b', cta_location: 'hero_primary_create' } })),
        ])

        const snapshot = buildHeroExperimentSnapshot(report, '2026-03-22T12:00:00.000Z')
        expect(snapshot.snapshotDate).toBe('2026-03-22')
        expect(snapshot.source).toBe('event_log')
        expect(snapshot.totalHomepageViews).toBe(9)
        expect(snapshot.totalHomepageToCreateClicks).toBe(3)
        expect(snapshot.totalCreateFlowStarts).toBe(1)
        expect(snapshot.variants).toHaveLength(2)
        expect(snapshot.status).toBe(report.heroExperiment.status)
        expect(snapshot.decision).toBe(report.heroExperiment.decision)
    })

    it('detects readiness transition only when moving to ready state', () => {
        const previous = {
            readiness: { readyForComparison: false },
        } as ReturnType<typeof buildHeroExperimentSnapshot>
        const current = {
            readiness: { readyForComparison: true },
        } as ReturnType<typeof buildHeroExperimentSnapshot>
        const stillNotReady = {
            readiness: { readyForComparison: false },
        } as ReturnType<typeof buildHeroExperimentSnapshot>

        expect(didHeroExperimentBecomeReady(previous, current)).toBe(true)
        expect(didHeroExperimentBecomeReady(previous, stillNotReady)).toBe(false)
        expect(didHeroExperimentBecomeReady(undefined, current)).toBe(true)
    })
})
