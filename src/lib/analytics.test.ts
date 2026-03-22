import { describe, expect, it, vi } from 'vitest'
import { ANALYTICS_ATTRIBUTION_COOKIE } from '@/lib/analytics-attribution'
import { HOMEPAGE_VISITOR_ID_COOKIE } from '@/lib/homepage-experiment'
import {
  CREATE_ENTRY_EVENT_NAMES,
  HOMEPAGE_EVENT_NAMES,
  PRODUCT_PROOF_EVENT_NAMES,
  trackCreateEntrypointResolved,
  trackCreateFlowAbandonedEarly,
  trackCreateFlowStarted,
  trackCreateGenerationStarted,
  trackCreatePageViewed,
  trackCreateProductSelected,
  trackCreatePromptInputFocused,
  trackCreatePromptStarted,
  trackCreateTemplateSelected,
  trackEvent,
  trackHomepageCtaClicked,
  trackHomepageScrollDepthReached,
  trackHomepageSectionViewed,
  trackHomepageToCreateClicked,
  trackHomepageViewed,
  trackProductProofCtaClicked,
  trackProductProofSectionViewed,
  trackPurchase,
} from './analytics'
import type { Order } from '@/types'

function createMockDocument(referrer: string) {
  const jar = new Map<string, string>()
  return {
    referrer,
    get cookie() {
      return Array.from(jar.entries())
        .map(([key, value]) => `${key}=${value}`)
        .join('; ')
    },
    set cookie(value: string) {
      const [pair] = value.split(';')
      const eqIndex = pair.indexOf('=')
      if (eqIndex === -1) {
        return
      }
      const key = pair.slice(0, eqIndex).trim()
      const encodedValue = pair.slice(eqIndex + 1).trim()
      if (!key) {
        return
      }
      if (value.includes('Max-Age=0')) {
        jar.delete(key)
        return
      }
      jar.set(key, encodedValue)
    },
  } as unknown as Document
}

describe('trackEvent', () => {
  it('returns false when gtag is unavailable', () => {
    const originalWindow = (globalThis as unknown as { window?: unknown }).window
    const sendBeacon = vi.fn(() => true)
    ;(globalThis as unknown as { window?: unknown }).window = {
      navigator: { sendBeacon },
      location: { pathname: '/', search: '' },
    } as unknown as Window

    expect(trackEvent('homepage_viewed', { page_variant: 'variant_a' })).toBe(false)
    expect(sendBeacon).toHaveBeenCalledTimes(1)

    ;(globalThis as unknown as { window?: unknown }).window = originalWindow
  })

  it('sends event with undefined params removed', () => {
    const gtag = vi.fn()
    const originalWindow = (globalThis as unknown as { window?: unknown }).window
    const docRef = (globalThis as unknown as { document?: Document }).document
    ;(globalThis as unknown as { window?: unknown }).window = { gtag } as unknown as Window

    const ok = trackEvent('homepage_viewed', {
      page_variant: 'variant_a',
      locale: undefined,
    })

    expect(ok).toBe(true)
    expect(gtag).toHaveBeenCalledWith(
      'event',
      'homepage_viewed',
      expect.objectContaining({
        page_variant: 'variant_a',
        visitor_id: expect.any(String),
      })
    )
    if (docRef) {
      docRef.cookie = `${HOMEPAGE_VISITOR_ID_COOKIE}=; Max-Age=0; Path=/`
    }
    ;(globalThis as unknown as { window?: unknown }).window = originalWindow
  })

  it('reuses visitor_id from cookie when params omit it', () => {
    const gtag = vi.fn()
    const originalWindow = (globalThis as unknown as { window?: unknown }).window
    const originalDocument = (globalThis as unknown as { document?: Document }).document

    ;(globalThis as unknown as { window?: unknown }).window = {
      gtag,
      navigator: { sendBeacon: vi.fn(() => true) },
      location: { pathname: '/', search: '', protocol: 'https:' },
    } as unknown as Window
    ;(globalThis as unknown as { document?: Document }).document = {
      cookie: `${HOMEPAGE_VISITOR_ID_COOKIE}=cookie_visitor_abc`,
    } as unknown as Document
    const ok = trackEvent('homepage_viewed', { page_variant: 'variant_a' })

    expect(ok).toBe(true)
    expect(gtag).toHaveBeenCalledWith(
      'event',
      'homepage_viewed',
      expect.objectContaining({
        page_variant: 'variant_a',
        visitor_id: 'cookie_visitor_abc',
      })
    )

    if (originalDocument) {
      ;(globalThis as unknown as { document?: Document }).document = originalDocument
    } else {
      Reflect.deleteProperty(globalThis as object, 'document')
    }
    ;(globalThis as unknown as { window?: unknown }).window = originalWindow
  })

  it('captures first-touch attribution fields and persists attribution cookie', () => {
    const gtag = vi.fn()
    const originalWindow = (globalThis as unknown as { window?: unknown }).window
    const originalDocument = (globalThis as unknown as { document?: Document }).document
    const mockDocument = createMockDocument('https://google.com/search?q=smartprintai')

    ;(globalThis as unknown as { document?: Document }).document = mockDocument
    ;(globalThis as unknown as { window?: unknown }).window = {
      gtag,
      navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' },
      location: {
        pathname: '/',
        search: '?utm_source=tiktok&utm_medium=paid_social&utm_campaign=spring_launch&utm_content=hero_a&utm_term=ai+shirt',
        origin: 'https://smartprintai.com',
        protocol: 'https:',
      },
    } as unknown as Window

    const ok = trackEvent('homepage_viewed', { page_variant: 'variant_a' })
    expect(ok).toBe(true)
    expect(gtag).toHaveBeenCalledWith(
      'event',
      'homepage_viewed',
      expect.objectContaining({
        utm_source: 'tiktok',
        utm_medium: 'paid_social',
        utm_campaign: 'spring_launch',
        utm_content: 'hero_a',
        utm_term: 'ai shirt',
        referrer_domain: 'google.com',
        landing_path: '/',
        device_type: 'mobile',
      })
    )
    expect(mockDocument.cookie).toContain(`${ANALYTICS_ATTRIBUTION_COOKIE}=`)

    if (originalDocument) {
      ;(globalThis as unknown as { document?: Document }).document = originalDocument
    } else {
      Reflect.deleteProperty(globalThis as object, 'document')
    }
    ;(globalThis as unknown as { window?: unknown }).window = originalWindow
  })

  it('preserves first-touch attribution across later events', () => {
    const gtag = vi.fn()
    const originalWindow = (globalThis as unknown as { window?: unknown }).window
    const originalDocument = (globalThis as unknown as { document?: Document }).document
    const mockDocument = createMockDocument('https://google.com/search?q=smartprintai')
    const firstTouchAttribution = encodeURIComponent(JSON.stringify({
      visitor_id: 'cookie_visitor_abc',
      captured_at: '2026-03-22T00:00:00.000Z',
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'brand_search',
      utm_content: 'ad_1',
      utm_term: 'smartprintai',
      referrer: 'https://google.com/search?q=smartprintai',
      referrer_domain: 'google.com',
      landing_path: '/',
      device_type: 'desktop',
    }))
    mockDocument.cookie = `${HOMEPAGE_VISITOR_ID_COOKIE}=cookie_visitor_abc`
    mockDocument.cookie = `${ANALYTICS_ATTRIBUTION_COOKIE}=${firstTouchAttribution}`

    ;(globalThis as unknown as { document?: Document }).document = mockDocument
    ;(globalThis as unknown as { window?: unknown }).window = {
      gtag,
      navigator: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)' },
      location: {
        pathname: '/create',
        search: '?utm_source=tiktok&utm_medium=paid_social&utm_campaign=retargeting',
        origin: 'https://smartprintai.com',
        protocol: 'https:',
      },
    } as unknown as Window

    const ok = trackEvent('homepage_to_create_clicked', { cta_location: 'hero_primary_create' })
    expect(ok).toBe(true)
    expect(gtag).toHaveBeenCalledWith(
      'event',
      'homepage_to_create_clicked',
      expect.objectContaining({
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'brand_search',
        referrer_domain: 'google.com',
        landing_path: '/',
      })
    )

    if (originalDocument) {
      ;(globalThis as unknown as { document?: Document }).document = originalDocument
    } else {
      Reflect.deleteProperty(globalThis as object, 'document')
    }
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
    expect(PRODUCT_PROOF_EVENT_NAMES.sectionViewed).toBe('product_proof_section_viewed')
    expect(PRODUCT_PROOF_EVENT_NAMES.ctaClicked).toBe('product_proof_cta_clicked')
    expect(CREATE_ENTRY_EVENT_NAMES.pageViewed).toBe('create_page_viewed')
    expect(CREATE_ENTRY_EVENT_NAMES.entrypointResolved).toBe('create_entrypoint_resolved')
    expect(CREATE_ENTRY_EVENT_NAMES.promptInputFocused).toBe('create_prompt_input_focused')
    expect(CREATE_ENTRY_EVENT_NAMES.promptStarted).toBe('create_prompt_started')
    expect(CREATE_ENTRY_EVENT_NAMES.generationStarted).toBe('create_generation_started')
    expect(CREATE_ENTRY_EVENT_NAMES.productSelected).toBe('create_product_selected')
    expect(CREATE_ENTRY_EVENT_NAMES.templateSelected).toBe('create_template_selected')
    expect(CREATE_ENTRY_EVENT_NAMES.flowAbandonedEarly).toBe('create_flow_abandoned_early')
  })

  it('dispatches helper events through gtag', () => {
    const gtag = vi.fn()
    const originalWindow = (globalThis as unknown as { window?: unknown }).window
    ;(globalThis as unknown as { window?: unknown }).window = { gtag } as unknown as Window

    trackHomepageViewed({ page_variant: 'variant_a', locale: 'en' })
    trackHomepageCtaClicked({ cta_location: 'hero_primary_create', destination: '/create' })
    trackHomepageSectionViewed({ section_name: 'hero', page_variant: 'variant_a' })
    trackHomepageScrollDepthReached({ scroll_depth_percent: 50, page_variant: 'variant_a' })
    trackHomepageToCreateClicked({ cta_location: 'hero_primary_create', destination: '/create' })
    trackProductProofSectionViewed({ page_variant: 'variant_a' })
    trackProductProofCtaClicked({ cta_location: 'product_proof_primary_create', destination: '/create' })
    trackCreateFlowStarted({ entrypoint: 'homepage', referrer_path: '/', locale: 'en', page_variant: 'variant_a' })
    trackCreatePageViewed({ entrypoint: 'homepage', referrer_path: '/', locale: 'en', page_variant: 'variant_a' })
    trackCreateEntrypointResolved({ entrypoint: 'homepage', referrer_path: '/', locale: 'en', page_variant: 'variant_a' })
    trackCreatePromptInputFocused({ entrypoint: 'homepage', locale: 'en', page_variant: 'variant_a' })
    trackCreatePromptStarted({ entrypoint: 'homepage', locale: 'en', page_variant: 'variant_a', prompt_length_bucket: '11_30' })
    trackCreateGenerationStarted({
      entrypoint: 'homepage',
      locale: 'en',
      page_variant: 'variant_a',
      prompt_length_bucket: '11_30',
      template_type: 'artistic',
      has_reference_image: false,
    })
    trackCreateTemplateSelected({ entrypoint: 'homepage', locale: 'en', page_variant: 'variant_a', template_type: 'photorealistic' })
    trackCreateProductSelected({ entrypoint: 'homepage', locale: 'en', page_variant: 'variant_a', product_type: 'apparel', product_id: 'prod_1' })
    trackCreateFlowAbandonedEarly({
      entrypoint: 'homepage',
      referrer_path: '/',
      locale: 'en',
      page_variant: 'variant_a',
      last_completed_step: 'prompt_started',
      prompt_length_bucket: '11_30',
    })

    expect(gtag).toHaveBeenCalledWith('event', 'homepage_viewed', expect.objectContaining({ page_variant: 'variant_a' }))
    expect(gtag).toHaveBeenCalledWith('event', 'homepage_cta_clicked', expect.objectContaining({ cta_location: 'hero_primary_create' }))
    expect(gtag).toHaveBeenCalledWith('event', 'homepage_section_viewed', expect.objectContaining({ section_name: 'hero' }))
    expect(gtag).toHaveBeenCalledWith('event', 'homepage_scroll_depth_reached', expect.objectContaining({ scroll_depth_percent: 50 }))
    expect(gtag).toHaveBeenCalledWith('event', 'homepage_to_create_clicked', expect.objectContaining({ destination: '/create' }))
    expect(gtag).toHaveBeenCalledWith('event', 'product_proof_section_viewed', expect.objectContaining({ page_variant: 'variant_a' }))
    expect(gtag).toHaveBeenCalledWith('event', 'product_proof_cta_clicked', expect.objectContaining({ cta_location: 'product_proof_primary_create' }))
    expect(gtag).toHaveBeenCalledWith('event', 'create_flow_started', expect.objectContaining({ entrypoint: 'homepage', page_variant: 'variant_a' }))
    expect(gtag).toHaveBeenCalledWith('event', 'create_page_viewed', expect.objectContaining({ entrypoint: 'homepage', page_variant: 'variant_a' }))
    expect(gtag).toHaveBeenCalledWith('event', 'create_entrypoint_resolved', expect.objectContaining({ entrypoint: 'homepage' }))
    expect(gtag).toHaveBeenCalledWith('event', 'create_prompt_input_focused', expect.objectContaining({ entrypoint: 'homepage' }))
    expect(gtag).toHaveBeenCalledWith('event', 'create_prompt_started', expect.objectContaining({ prompt_length_bucket: '11_30' }))
    expect(gtag).toHaveBeenCalledWith('event', 'create_generation_started', expect.objectContaining({ template_type: 'artistic' }))
    expect(gtag).toHaveBeenCalledWith('event', 'create_template_selected', expect.objectContaining({ template_type: 'photorealistic' }))
    expect(gtag).toHaveBeenCalledWith('event', 'create_product_selected', expect.objectContaining({ product_id: 'prod_1' }))
    expect(gtag).toHaveBeenCalledWith('event', 'create_flow_abandoned_early', expect.objectContaining({ last_completed_step: 'prompt_started' }))

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
