import { describe, expect, it } from 'vitest'
import {
  HOMEPAGE_EVENT_NAMES,
} from '@/lib/analytics'
import {
  aggregateHomepageFunnel,
  buildSimulatedHomepageEventRecords,
  classifyDeviceType,
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
    pageVariant: 'premium_v2',
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
    expect(isHomepageEventName('purchase')).toBe(false)
  })

  it('aggregates funnel totals, rates, and drop-off', () => {
    const records = [
      ...Array.from({ length: 100 }, () => buildRecord('viewed')),
      ...Array.from({ length: 30 }, () => buildRecord('toCreateClicked', { params: { cta_location: 'hero_primary_create' } })),
      ...Array.from({ length: 15 }, () => buildRecord('createFlowStarted')),
    ]

    const report = aggregateHomepageFunnel(records, 'event_log')
    expect(report.totals.homepageViews).toBe(100)
    expect(report.totals.homepageToCreateClicks).toBe(30)
    expect(report.totals.createFlowStarts).toBe(15)
    expect(report.rates.homepageToCreateCtr).toBe(30)
    expect(report.rates.createStartRate).toBe(15)
    expect(report.rates.clickToCreateStartRate).toBe(50)
    expect(report.dropoff.biggestDropoffStep).toBe('before_cta_click')
  })

  it('returns simulated records with expected event shape', () => {
    const records = buildSimulatedHomepageEventRecords()
    expect(records.length).toBeGreaterThan(0)
    expect(records.some((record) => record.eventName === HOMEPAGE_EVENT_NAMES.viewed)).toBe(true)
    expect(records.some((record) => record.eventName === HOMEPAGE_EVENT_NAMES.toCreateClicked)).toBe(true)
    expect(records.some((record) => record.eventName === HOMEPAGE_EVENT_NAMES.createFlowStarted)).toBe(true)
  })
})
