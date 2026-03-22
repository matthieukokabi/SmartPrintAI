import { describe, expect, it } from 'vitest'
import { CREATE_ENTRY_EVENT_NAMES } from '@/lib/analytics'
import { aggregateCreateEntryFunnel } from './create-entry-funnel-report'
import type { HomepageFunnelEventRecord } from './homepage-funnel-report'

function buildCreateRecord(
    eventName: keyof typeof CREATE_ENTRY_EVENT_NAMES,
    overrides: Partial<HomepageFunnelEventRecord> = {}
): HomepageFunnelEventRecord {
    return {
        eventName: CREATE_ENTRY_EVENT_NAMES[eventName],
        params: {},
        path: '/create',
        pageVariant: 'variant_a',
        locale: 'en',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
        deviceType: 'desktop',
        createdAt: new Date('2026-03-22T00:00:00.000Z').toISOString(),
        ...overrides,
    }
}

describe('create entry funnel report', () => {
    it('returns zeroed metrics with no create-entry events', () => {
        const report = aggregateCreateEntryFunnel([])

        expect(report.source).toBe('event_log')
        expect(report.hasData).toBe(false)
        expect(report.totals.createPageViews).toBe(0)
        expect(report.dropoff.biggestEarlyDropoffStep).toBe('none')
    })

    it('aggregates create-entry stages and identifies largest early drop-off', () => {
        const records: HomepageFunnelEventRecord[] = [
            ...Array.from({ length: 20 }, () => buildCreateRecord('pageViewed', { pageVariant: 'variant_a', params: { page_variant: 'variant_a' } })),
            ...Array.from({ length: 20 }, () => buildCreateRecord('entrypointResolved', { params: { entrypoint: 'homepage' } })),
            ...Array.from({ length: 12 }, () => buildCreateRecord('promptInputFocused')),
            ...Array.from({ length: 10 }, () => buildCreateRecord('promptStarted', { params: { prompt_length_bucket: '11_30' } })),
            ...Array.from({ length: 6 }, () => buildCreateRecord('generationStarted')),
            ...Array.from({ length: 4 }, () => buildCreateRecord('productSelected', { params: { product_type: 'apparel' } })),
            ...Array.from({ length: 3 }, () => buildCreateRecord('templateSelected', { params: { template_type: 'photorealistic' } })),
            ...Array.from({ length: 5 }, () => buildCreateRecord('flowAbandonedEarly', { params: { last_completed_step: 'prompt_started' } })),
        ]

        const report = aggregateCreateEntryFunnel(records)
        expect(report.hasData).toBe(true)
        expect(report.totals.createPageViews).toBe(20)
        expect(report.totals.promptInputFocused).toBe(12)
        expect(report.totals.promptStarted).toBe(10)
        expect(report.totals.generationStarted).toBe(6)
        expect(report.totals.productSelected).toBe(4)
        expect(report.rates.promptInteractionRate).toBe(60)
        expect(report.rates.generationStartRate).toBe(30)
        expect(report.dropoff.biggestEarlyDropoffStep).toBe('before_prompt_focus')
        expect(report.firstFrictionPoint).toBe('before_prompt_focus')
    })

    it('breaks down entrypoint, variant, and prompt length buckets', () => {
        const records: HomepageFunnelEventRecord[] = [
            ...Array.from({ length: 4 }, () => buildCreateRecord('pageViewed', { pageVariant: 'variant_a', params: { page_variant: 'variant_a' } })),
            ...Array.from({ length: 2 }, () => buildCreateRecord('pageViewed', { pageVariant: 'variant_b', params: { page_variant: 'variant_b' } })),
            ...Array.from({ length: 5 }, () => buildCreateRecord('entrypointResolved', { params: { entrypoint: 'homepage' } })),
            buildCreateRecord('entrypointResolved', { params: { entrypoint: 'other' } }),
            ...Array.from({ length: 3 }, () => buildCreateRecord('promptStarted', { params: { prompt_length_bucket: '3_10' } })),
            buildCreateRecord('promptStarted', { params: { prompt_length_bucket: '81_plus' } }),
        ]

        const report = aggregateCreateEntryFunnel(records)
        expect(report.entrypointBreakdown[0]).toEqual(expect.objectContaining({ value: 'homepage', count: 5 }))
        expect(report.homepageVariantBreakdown.find((row) => row.value === 'variant_b')).toEqual(
            expect.objectContaining({ count: 2 })
        )
        expect(report.promptLengthBreakdown.find((row) => row.value === '3_10')).toEqual(
            expect.objectContaining({ count: 3 })
        )
        expect(report.promptLengthBreakdown.find((row) => row.value === '81_plus')).toEqual(
            expect.objectContaining({ count: 1 })
        )
    })
})
