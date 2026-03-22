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
    it('returns insufficient_data state with explicit blockers when thresholds are not met', () => {
        const records: HomepageFunnelEventRecord[] = [
            ...Array.from({ length: 20 }, () => buildCreateRecord('pageViewed')),
            ...Array.from({ length: 10 }, () => buildCreateRecord('promptInputFocused')),
            ...Array.from({ length: 7 }, () => buildCreateRecord('promptStarted', { params: { prompt_length_bucket: '11_30' } })),
            ...Array.from({ length: 4 }, () => buildCreateRecord('generationStarted')),
        ]

        const report = aggregateCreateEntryFunnel(records)
        expect(report.source).toBe('event_log')
        expect(report.hasData).toBe(true)
        expect(report.status).toBe('insufficient_data')
        expect(report.decision).toBe('continue_running')
        expect(report.thresholdChecks.all).toBe(false)
        expect(report.readiness.readyForOptimization).toBe(false)
        expect(report.readiness.blockers).toContain('Need 100 more create_page_viewed events.')
        expect(report.readiness.blockers).toContain('Need 60 more create_prompt_input_focused events.')
        expect(report.readiness.blockers).toContain('Need 38 more create_prompt_started events.')
        expect(report.readiness.blockers).toContain('Need 21 more create_generation_started events.')
    })

    it('returns friction_candidate when thresholds are met and drop-off is actionable', () => {
        const records: HomepageFunnelEventRecord[] = [
            ...Array.from({ length: 150 }, () => buildCreateRecord('pageViewed', { pageVariant: 'variant_a', params: { page_variant: 'variant_a' } })),
            ...Array.from({ length: 145 }, () => buildCreateRecord('entrypointResolved', { params: { entrypoint: 'homepage' } })),
            ...Array.from({ length: 110 }, () => buildCreateRecord('promptInputFocused')),
            ...Array.from({ length: 70 }, () => buildCreateRecord('promptStarted', { params: { prompt_length_bucket: '11_30' } })),
            ...Array.from({ length: 45 }, () => buildCreateRecord('generationStarted')),
            ...Array.from({ length: 20 }, () => buildCreateRecord('productSelected')),
        ]

        const report = aggregateCreateEntryFunnel(records)
        expect(report.thresholdChecks.all).toBe(true)
        expect(report.status).toBe('friction_candidate')
        expect(report.decision).toBe('optimize_first_friction_point')
        expect(report.firstFrictionPoint).toBe('before_prompt_start')
        expect(report.firstActionableFrictionPoint).toBe('before_prompt_start')
        expect(report.readiness.readyForOptimization).toBe(true)
        expect(report.rates.promptStartRateFromCreateView).toBe(46.67)
        expect(report.rates.generationStartRateFromPromptStart).toBe(64.29)
    })

    it('returns ready_for_comparison with no_action_yet when drop-off is too small', () => {
        const records: HomepageFunnelEventRecord[] = [
            ...Array.from({ length: 130 }, () => buildCreateRecord('pageViewed')),
            ...Array.from({ length: 128 }, () => buildCreateRecord('entrypointResolved', { params: { entrypoint: 'homepage' } })),
            ...Array.from({ length: 122 }, () => buildCreateRecord('promptInputFocused')),
            ...Array.from({ length: 119 }, () => buildCreateRecord('promptStarted', { params: { prompt_length_bucket: '3_10' } })),
            ...Array.from({ length: 114 }, () => buildCreateRecord('generationStarted')),
        ]

        const report = aggregateCreateEntryFunnel(records)
        expect(report.thresholdChecks.all).toBe(true)
        expect(report.status).toBe('ready_for_comparison')
        expect(report.decision).toBe('no_action_yet')
        expect(report.firstActionableFrictionPoint).toBe('none')
        expect(report.readiness.readinessMessage).toContain('no clear first friction candidate')
    })

    it('returns inconclusive and investigate_tracking when event sequence integrity is broken', () => {
        const records: HomepageFunnelEventRecord[] = [
            ...Array.from({ length: 130 }, () => buildCreateRecord('pageViewed')),
            ...Array.from({ length: 75 }, () => buildCreateRecord('promptInputFocused')),
            ...Array.from({ length: 48 }, () => buildCreateRecord('promptStarted', { params: { prompt_length_bucket: '11_30' } })),
            ...Array.from({ length: 30 }, () => buildCreateRecord('generationStarted')),
            // Intentionally no entrypointResolved events to trigger integrity guard.
        ]

        const report = aggregateCreateEntryFunnel(records)
        expect(report.thresholdChecks.all).toBe(true)
        expect(report.status).toBe('inconclusive')
        expect(report.decision).toBe('investigate_tracking')
        expect(report.reason).toContain('tracking gaps')
        expect(report.firstActionableFrictionPoint).toBe('none')
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
