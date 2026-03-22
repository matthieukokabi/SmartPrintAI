import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  HOMEPAGE_EVENT_NAMES,
} from '@/lib/analytics'
import {
  aggregateHomepageFunnel,
  buildHomepageFunnelReport,
  classifyDeviceType,
  isFunnelEventName,
  isHomepageEventName,
  type HomepageFunnelEventRecord,
} from './homepage-funnel-report'

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

describe('homepage funnel report helpers', () => {
  it('classifies device type from user agent', () => {
    expect(classifyDeviceType('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('mobile')
    expect(classifyDeviceType('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('tablet')
    expect(classifyDeviceType('Googlebot/2.1 (+http://www.google.com/bot.html)')).toBe('bot')
    expect(classifyDeviceType('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)')).toBe('desktop')
    expect(classifyDeviceType(undefined)).toBe('unknown')
  })

  it('validates homepage event names', () => {
    expect(isHomepageEventName('homepage_viewed')).toBe(true)
    expect(isHomepageEventName('create_flow_started')).toBe(true)
    expect(isHomepageEventName('create_prompt_started')).toBe(false)
    expect(isFunnelEventName('create_prompt_started')).toBe(true)
    expect(isFunnelEventName('product_proof_section_viewed')).toBe(true)
    expect(isHomepageEventName('purchase')).toBe(false)
    expect(isFunnelEventName('purchase')).toBe(false)
  })

  it('aggregates funnel totals, rates, and drop-off', () => {
    const records = [
      ...Array.from({ length: 100 }, () => buildRecord('viewed')),
      ...Array.from({ length: 30 }, () => buildRecord('toCreateClicked', { params: { cta_location: 'hero_primary_create' } })),
      ...Array.from({ length: 15 }, () => buildRecord('createFlowStarted')),
    ]

    const report = aggregateHomepageFunnel(records)
    expect(report.totals.homepageViews).toBe(100)
    expect(report.totals.homepageToCreateClicks).toBe(30)
    expect(report.totals.createFlowStarts).toBe(15)
    expect(report.rates.homepageToCreateCtr).toBe(30)
    expect(report.rates.createStartRate).toBe(15)
    expect(report.rates.clickToCreateStartRate).toBe(50)
    expect(report.dropoff.biggestDropoffStep).toBe('before_cta_click')
    expect(report.source).toBe('event_log')
    expect(report.recordCount).toBe(145)
    expect(report.hasData).toBe(true)
    expect(report.heroExperiment.primaryMetric).toBe('homepage_to_create_ctr')
    expect(report.heroExperiment.secondaryMetric).toBe('create_start_rate')
    expect(report.heroExperiment.status).toBe('insufficient_data')
    expect(report.heroExperiment.decision).toBe('continue_running')
    expect(report.heroExperiment.readiness.readyForComparison).toBe(false)
    expect(report.heroExperiment.readiness.progressItems.length).toBe(5)
    expect(report.heroExperiment.readiness.blockers.some((message) => message.includes('variant_b'))).toBe(true)
  })

  it('builds report from empty real event log without simulation fallback', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'homepage-funnel-empty-'))
    const logPath = path.join(tempDir, 'events.jsonl')
    const report = await buildHomepageFunnelReport(logPath)

    expect(report.source).toBe('event_log')
    expect(report.recordCount).toBe(0)
    expect(report.hasData).toBe(false)
    expect(report.totals.homepageViews).toBe(0)
    expect(report.heroExperiment.status).toBe('insufficient_data')
    expect(report.heroExperiment.readiness.readinessMessage).toContain('immature')
  })

  it('builds report from persisted real event log data', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'homepage-funnel-real-'))
    const logPath = path.join(tempDir, 'events.jsonl')
    const rows: HomepageFunnelEventRecord[] = [
      buildRecord('viewed'),
      buildRecord('viewed'),
      buildRecord('toCreateClicked', { params: { cta_location: 'hero_primary_create' } }),
      buildRecord('createFlowStarted', { path: '/create' }),
    ]
    await writeFile(logPath, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8')

    const report = await buildHomepageFunnelReport(logPath)
    expect(report.source).toBe('event_log')
    expect(report.recordCount).toBe(4)
    expect(report.hasData).toBe(true)
    expect(report.totals.homepageViews).toBe(2)
    expect(report.totals.homepageToCreateClicks).toBe(1)
    expect(report.totals.createFlowStarts).toBe(1)
  })

  it('segments per page variant with CTR and drop-off comparison', () => {
    const records = [
      ...Array.from({ length: 10 }, () => buildRecord('viewed', { pageVariant: 'variant_a', params: { page_variant: 'variant_a' } })),
      ...Array.from({ length: 4 }, () => buildRecord('toCreateClicked', { pageVariant: 'variant_a', params: { page_variant: 'variant_a', cta_location: 'hero_primary_create' } })),
      ...Array.from({ length: 2 }, () => buildRecord('createFlowStarted', { pageVariant: 'variant_a', params: { page_variant: 'variant_a' } })),
      ...Array.from({ length: 10 }, () => buildRecord('viewed', { pageVariant: 'variant_b', params: { page_variant: 'variant_b' } })),
      ...Array.from({ length: 3 }, () => buildRecord('toCreateClicked', { pageVariant: 'variant_b', params: { page_variant: 'variant_b', cta_location: 'hero_primary_create' } })),
      ...Array.from({ length: 1 }, () => buildRecord('createFlowStarted', { pageVariant: 'variant_b', params: { page_variant: 'variant_b' } })),
    ]

    const report = aggregateHomepageFunnel(records)
    const variantA = report.pageVariantBreakdown.find((row) => row.pageVariant === 'variant_a')
    const variantB = report.pageVariantBreakdown.find((row) => row.pageVariant === 'variant_b')

    expect(variantA).toEqual(expect.objectContaining({
      homepageViews: 10,
      toCreateClicks: 4,
      createStarts: 2,
      homepageToCreateCtr: 40,
      createStartRate: 20,
      clickToCreateStartRate: 50,
      biggestDropoffStep: 'before_cta_click',
    }))

    expect(variantB).toEqual(expect.objectContaining({
      homepageViews: 10,
      toCreateClicks: 3,
      createStarts: 1,
      homepageToCreateCtr: 30,
      createStartRate: 10,
      clickToCreateStartRate: 33.33,
      biggestDropoffStep: 'before_cta_click',
    }))
  })

  it('marks winner_candidate when thresholds are met and primary/secondary metrics align', () => {
    const records = [
      ...Array.from({ length: 110 }, () => buildRecord('viewed', { pageVariant: 'variant_a', params: { page_variant: 'variant_a' } })),
      ...Array.from({ length: 40 }, () => buildRecord('toCreateClicked', { pageVariant: 'variant_a', params: { page_variant: 'variant_a', cta_location: 'hero_primary_create' } })),
      ...Array.from({ length: 22 }, () => buildRecord('createFlowStarted', { pageVariant: 'variant_a', params: { page_variant: 'variant_a' } })),
      ...Array.from({ length: 90 }, () => buildRecord('viewed', { pageVariant: 'variant_b', params: { page_variant: 'variant_b' } })),
      ...Array.from({ length: 20 }, () => buildRecord('toCreateClicked', { pageVariant: 'variant_b', params: { page_variant: 'variant_b', cta_location: 'hero_primary_create' } })),
      ...Array.from({ length: 12 }, () => buildRecord('createFlowStarted', { pageVariant: 'variant_b', params: { page_variant: 'variant_b' } })),
    ]

    const report = aggregateHomepageFunnel(records)
    expect(report.heroExperiment.thresholdChecks.all).toBe(true)
    expect(report.heroExperiment.status).toBe('winner_candidate')
    expect(report.heroExperiment.decision).toBe('ship_winner')
    expect(report.heroExperiment.winnerCandidate).toBe('variant_a')
    expect(report.heroExperiment.readiness.readyForComparison).toBe(true)
    expect(report.heroExperiment.readiness.blockers).toHaveLength(0)
    expect(report.heroExperiment.readiness.readinessMessage).toContain('ready')
  })

  it('marks ready_for_comparison when thresholds are met but primary metric gap is too small', () => {
    const records = [
      ...Array.from({ length: 110 }, () => buildRecord('viewed', { pageVariant: 'variant_a', params: { page_variant: 'variant_a' } })),
      ...Array.from({ length: 25 }, () => buildRecord('toCreateClicked', { pageVariant: 'variant_a', params: { page_variant: 'variant_a', cta_location: 'hero_primary_create' } })),
      ...Array.from({ length: 12 }, () => buildRecord('createFlowStarted', { pageVariant: 'variant_a', params: { page_variant: 'variant_a' } })),
      ...Array.from({ length: 95 }, () => buildRecord('viewed', { pageVariant: 'variant_b', params: { page_variant: 'variant_b' } })),
      ...Array.from({ length: 20 }, () => buildRecord('toCreateClicked', { pageVariant: 'variant_b', params: { page_variant: 'variant_b', cta_location: 'hero_primary_create' } })),
      ...Array.from({ length: 10 }, () => buildRecord('createFlowStarted', { pageVariant: 'variant_b', params: { page_variant: 'variant_b' } })),
    ]

    const report = aggregateHomepageFunnel(records)
    expect(report.heroExperiment.thresholdChecks.all).toBe(true)
    expect(report.heroExperiment.status).toBe('ready_for_comparison')
    expect(report.heroExperiment.decision).toBe('continue_running')
    expect(report.heroExperiment.winnerCandidate).toBeNull()
  })

  it('marks inconclusive with iterate_loser_dimension when secondary metric conflicts with primary winner', () => {
    const records = [
      ...Array.from({ length: 110 }, () => buildRecord('viewed', { pageVariant: 'variant_a', params: { page_variant: 'variant_a' } })),
      ...Array.from({ length: 35 }, () => buildRecord('toCreateClicked', { pageVariant: 'variant_a', params: { page_variant: 'variant_a', cta_location: 'hero_primary_create' } })),
      ...Array.from({ length: 8 }, () => buildRecord('createFlowStarted', { pageVariant: 'variant_a', params: { page_variant: 'variant_a' } })),
      ...Array.from({ length: 90 }, () => buildRecord('viewed', { pageVariant: 'variant_b', params: { page_variant: 'variant_b' } })),
      ...Array.from({ length: 22 }, () => buildRecord('toCreateClicked', { pageVariant: 'variant_b', params: { page_variant: 'variant_b', cta_location: 'hero_primary_create' } })),
      ...Array.from({ length: 22 }, () => buildRecord('createFlowStarted', { pageVariant: 'variant_b', params: { page_variant: 'variant_b' } })),
    ]

    const report = aggregateHomepageFunnel(records)
    expect(report.heroExperiment.thresholdChecks.all).toBe(true)
    expect(report.heroExperiment.status).toBe('inconclusive')
    expect(report.heroExperiment.decision).toBe('iterate_loser_dimension')
    expect(report.heroExperiment.winnerCandidate).toBeNull()
  })

  it('flags investigate_tracking when one variant is missing at comparison scale', () => {
    const records = [
      ...Array.from({ length: 220 }, () => buildRecord('viewed', { pageVariant: 'variant_a', params: { page_variant: 'variant_a' } })),
      ...Array.from({ length: 60 }, () => buildRecord('toCreateClicked', { pageVariant: 'variant_a', params: { page_variant: 'variant_a', cta_location: 'hero_primary_create' } })),
      ...Array.from({ length: 22 }, () => buildRecord('createFlowStarted', { pageVariant: 'variant_a', params: { page_variant: 'variant_a' } })),
    ]

    const report = aggregateHomepageFunnel(records)
    expect(report.heroExperiment.status).toBe('inconclusive')
    expect(report.heroExperiment.decision).toBe('investigate_tracking')
    expect(report.heroExperiment.reason).toContain('missing exposure')
    expect(report.heroExperiment.readiness.blockers.some((message) => message.includes('variant_b'))).toBe(true)
  })

  it('reports exact remaining counts for threshold progress guidance', () => {
    const records = [
      ...Array.from({ length: 80 }, () => buildRecord('viewed', { pageVariant: 'variant_a', params: { page_variant: 'variant_a' } })),
      ...Array.from({ length: 12 }, () => buildRecord('toCreateClicked', { pageVariant: 'variant_a', params: { page_variant: 'variant_a', cta_location: 'hero_primary_create' } })),
      ...Array.from({ length: 34 }, () => buildRecord('viewed', { pageVariant: 'variant_b', params: { page_variant: 'variant_b' } })),
      ...Array.from({ length: 4 }, () => buildRecord('toCreateClicked', { pageVariant: 'variant_b', params: { page_variant: 'variant_b', cta_location: 'hero_primary_create' } })),
    ]

    const report = aggregateHomepageFunnel(records)
    expect(report.heroExperiment.readiness.blockers).toContain('Need 86 more homepage views in experiment.')
    expect(report.heroExperiment.readiness.blockers).toContain('Need 41 more views in variant_b.')
    expect(report.heroExperiment.readiness.blockers).toContain('Need 6 more to-create clicks in variant_b.')
  })
})
