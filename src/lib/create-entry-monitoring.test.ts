import { describe, expect, it } from 'vitest'
import { CREATE_ENTRY_EVENT_NAMES } from '@/lib/analytics'
import { aggregateCreateEntryFunnel, type CreateEntryFunnelReport } from './create-entry-funnel-report'
import { buildCreateEntrySnapshot, didCreateEntryBecomeReady } from './create-entry-monitoring'
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

function buildReadyReport(): CreateEntryFunnelReport {
    const records: HomepageFunnelEventRecord[] = [
        ...Array.from({ length: 140 }, () => buildCreateRecord('pageViewed')),
        ...Array.from({ length: 135 }, () => buildCreateRecord('entrypointResolved', { params: { entrypoint: 'homepage' } })),
        ...Array.from({ length: 95 }, () => buildCreateRecord('promptInputFocused')),
        ...Array.from({ length: 60 }, () => buildCreateRecord('promptStarted', { params: { prompt_length_bucket: '11_30' } })),
        ...Array.from({ length: 35 }, () => buildCreateRecord('generationStarted')),
    ]
    return aggregateCreateEntryFunnel(records)
}

describe('create entry monitoring snapshots', () => {
    it('builds snapshot payload from create-entry report', () => {
        const report = buildReadyReport()
        const snapshot = buildCreateEntrySnapshot(report, '2026-03-22T12:00:00.000Z')

        expect(snapshot.snapshotDate).toBe('2026-03-22')
        expect(snapshot.source).toBe('event_log')
        expect(snapshot.totals.createPageViews).toBe(140)
        expect(snapshot.rates.promptStartRateFromCreateView).toBe(report.rates.promptStartRateFromCreateView)
        expect(snapshot.biggestEarlyDropoffStep).toBe(report.dropoff.biggestEarlyDropoffStep)
        expect(snapshot.status).toBe(report.status)
        expect(snapshot.decision).toBe(report.decision)
    })

    it('detects readiness transition for operational alerting', () => {
        const report = buildReadyReport()
        const current = buildCreateEntrySnapshot(report)
        const previous = {
            ...current,
            readiness: {
                ...current.readiness,
                readyForOptimization: false,
            },
        }

        expect(didCreateEntryBecomeReady(previous, current)).toBe(true)
        expect(didCreateEntryBecomeReady(current, current)).toBe(false)
        expect(didCreateEntryBecomeReady(null, current)).toBe(current.readiness.readyForOptimization)
    })
})
