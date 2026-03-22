import { describe, expect, it } from 'vitest'
import {
  buildAttributionContext,
  mergeAttributionWithFallback,
  normalizeAttributionFromParams,
} from './analytics-attribution'

describe('analytics attribution normalization', () => {
  it('canonicalizes known source and medium aliases', () => {
    const context = buildAttributionContext({
      visitorId: 'visitor_1',
      pathname: '/',
      search: '?utm_source=facebook&utm_medium=Paid Social&utm_campaign=Spring Launch 2026&utm_content=Hero A',
      referrer: 'https://instagram.com/smartprintai',
      origin: 'https://smartprintai.com',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    })

    expect(context.utm_source).toBe('meta')
    expect(context.utm_medium).toBe('paid_social')
    expect(context.utm_campaign).toBe('spring_launch_2026')
    expect(context.utm_content).toBe('hero_a')
  })

  it('maps twitter aliases to x and cpc to paid_search', () => {
    const normalized = normalizeAttributionFromParams({
      utm_source: 'twitter',
      utm_medium: 'cpc',
      utm_campaign: 'search conversion us',
      referrer_domain: 'twitter.com',
      landing_path: '/create',
      device_type: 'desktop',
    })

    expect(normalized.utm_source).toBe('x')
    expect(normalized.utm_medium).toBe('paid_search')
    expect(normalized.utm_campaign).toBe('search_conversion_us')
  })

  it('falls back source from known referrer domain when utm_source is missing', () => {
    const context = buildAttributionContext({
      visitorId: 'visitor_2',
      pathname: '/',
      search: '?utm_medium=organic_social&utm_campaign=awareness_global',
      referrer: 'https://l.instagram.com/?u=https%3A%2F%2Fsmartprintai.com',
      origin: 'https://smartprintai.com',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)',
    })

    expect(context.utm_source).toBe('meta')
    expect(context.referrer_domain).toBe('l.instagram.com')
  })

  it('preserves first-touch context when incoming params are unknown', () => {
    const merged = mergeAttributionWithFallback(
      {
        utm_source: 'unknown',
        utm_medium: 'unknown',
        utm_campaign: 'unknown',
      },
      {
        utm_source: 'google',
        utm_medium: 'paid_search',
        utm_campaign: 'search_conversion_us',
        utm_content: 'ad_a',
        utm_term: 'ai_print',
        referrer: 'https://google.com/search?q=ai+print',
        referrer_domain: 'google.com',
        landing_path: '/',
        device_type: 'desktop',
      }
    )

    expect(merged.utm_source).toBe('google')
    expect(merged.utm_medium).toBe('paid_search')
    expect(merged.utm_campaign).toBe('search_conversion_us')
    expect(merged.referrer_domain).toBe('google.com')
  })
})
