import { describe, expect, it, vi } from 'vitest'
import {
  HOMEPAGE_EVENT_NAMES,
  trackCreateFlowStarted,
  trackEvent,
  trackHomepageCtaClicked,
  trackHomepageScrollDepthReached,
  trackHomepageSectionViewed,
  trackHomepageToCreateClicked,
  trackHomepageViewed,
  trackPurchase,
} from './analytics'
import type { Order } from '@/types'

describe('trackEvent', () => {
  it('returns false when gtag is unavailable', () => {
    const originalWindow = (globalThis as unknown as { window?: unknown }).window
    ;(globalThis as unknown as { window?: unknown }).window = {} as Window

    expect(trackEvent('homepage_viewed', { page_variant: 'premium_v2' })).toBe(false)

    ;(globalThis as unknown as { window?: unknown }).window = originalWindow
  })

  it('sends event with undefined params removed', () => {
    const gtag = vi.fn()
    const originalWindow = (globalThis as unknown as { window?: unknown }).window
    ;(globalThis as unknown as { window?: unknown }).window = { gtag } as unknown as Window

    const ok = trackEvent('homepage_viewed', {
      page_variant: 'premium_v2',
      locale: undefined,
    })

    expect(ok).toBe(true)
    expect(gtag).toHaveBeenCalledWith('event', 'homepage_viewed', { page_variant: 'premium_v2' })
    ;(globalThis as unknown as { window?: unknown }).window = originalWindow
  })
})

describe('homepage analytics helpers', () => {
  it('uses stable homepage event names', () => {
    expect(HOMEPAGE_EVENT_NAMES.viewed).toBe('homepage_viewed')
    expect(HOMEPAGE_EVENT_NAMES.ctaClicked).toBe('homepage_cta_clicked')
    expect(HOMEPAGE_EVENT_NAMES.sectionViewed).toBe('homepage_section_viewed')
    expect(HOMEPAGE_EVENT_NAMES.scrollDepthReached).toBe('homepage_scroll_depth_reached')
    expect(HOMEPAGE_EVENT_NAMES.toCreateClicked).toBe('homepage_to_create_clicked')
    expect(HOMEPAGE_EVENT_NAMES.createFlowStarted).toBe('create_flow_started')
  })

  it('dispatches helper events through gtag', () => {
    const gtag = vi.fn()
    const originalWindow = (globalThis as unknown as { window?: unknown }).window
    ;(globalThis as unknown as { window?: unknown }).window = { gtag } as unknown as Window

    trackHomepageViewed({ page_variant: 'premium_v2', locale: 'en' })
    trackHomepageCtaClicked({ cta_location: 'hero_primary_create', destination: '/create' })
    trackHomepageSectionViewed({ section_name: 'hero', page_variant: 'premium_v2' })
    trackHomepageScrollDepthReached({ scroll_depth_percent: 50, page_variant: 'premium_v2' })
    trackHomepageToCreateClicked({ cta_location: 'hero_primary_create', destination: '/create' })
    trackCreateFlowStarted({ entrypoint: 'homepage', referrer_path: '/', locale: 'en' })

    expect(gtag).toHaveBeenCalledWith('event', 'homepage_viewed', expect.objectContaining({ page_variant: 'premium_v2' }))
    expect(gtag).toHaveBeenCalledWith('event', 'homepage_cta_clicked', expect.objectContaining({ cta_location: 'hero_primary_create' }))
    expect(gtag).toHaveBeenCalledWith('event', 'homepage_section_viewed', expect.objectContaining({ section_name: 'hero' }))
    expect(gtag).toHaveBeenCalledWith('event', 'homepage_scroll_depth_reached', expect.objectContaining({ scroll_depth_percent: 50 }))
    expect(gtag).toHaveBeenCalledWith('event', 'homepage_to_create_clicked', expect.objectContaining({ destination: '/create' }))
    expect(gtag).toHaveBeenCalledWith('event', 'create_flow_started', expect.objectContaining({ entrypoint: 'homepage' }))

    ;(globalThis as unknown as { window?: unknown }).window = originalWindow
  })
})

describe('trackPurchase', () => {
  it('returns false when gtag is unavailable', () => {
    const originalWindow = (globalThis as unknown as { window?: unknown }).window
    ;(globalThis as unknown as { window?: unknown }).window = {} as Window

    const ok = trackPurchase({
      id: 'ord_1',
      email: 'x@example.com',
      status: 'paid',
      subtotal: 10,
      shippingCost: 5.99,
      total: 15.99,
      createdAt: new Date().toISOString(),
      items: [],
    } as Order)

    expect(ok).toBe(false)
    ;(globalThis as unknown as { window?: unknown }).window = originalWindow
  })

  it('sends purchase event when gtag exists', () => {
    const gtag = vi.fn()
    const originalWindow = (globalThis as unknown as { window?: unknown }).window
    ;(globalThis as unknown as { window?: unknown }).window = { gtag } as unknown as Window

    const order: Order = {
      id: 'ord_2',
      email: 'buyer@example.com',
      status: 'paid',
      subtotal: 20,
      shippingCost: 5.99,
      total: 25.99,
      createdAt: new Date().toISOString(),
      items: [
        {
          id: 'item_1',
          productId: 'prod_1',
          designId: 'des_1',
          size: 'L',
          color: 'Black',
          quantity: 2,
          price: 10,
        },
      ],
    }

    const ok = trackPurchase(order)
    expect(ok).toBe(true)
    expect(gtag).toHaveBeenCalledTimes(1)
    expect(gtag).toHaveBeenCalledWith(
      'event',
      'purchase',
      expect.objectContaining({
        currency: 'USD',
        transaction_id: 'ord_2',
        value: 25.99,
        shipping: 5.99,
      })
    )

    ;(globalThis as unknown as { window?: unknown }).window = originalWindow
  })
})
