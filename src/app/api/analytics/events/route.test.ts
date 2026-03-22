import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ANALYTICS_ATTRIBUTION_COOKIE } from '@/lib/analytics-attribution'
import { HOMEPAGE_VISITOR_ID_COOKIE } from '@/lib/homepage-experiment'

const mocks = vi.hoisted(() => ({
  rateLimitRequest: vi.fn(),
  appendHomepageEventRecord: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitRequest: mocks.rateLimitRequest,
}))

vi.mock('@/lib/homepage-funnel-report', async () => {
  const actual = await vi.importActual<typeof import('@/lib/homepage-funnel-report')>('@/lib/homepage-funnel-report')
  return {
    ...actual,
    appendHomepageEventRecord: mocks.appendHomepageEventRecord,
  }
})

import { POST } from './route'

function createRequest(body: string, headers: HeadersInit = {}, url = 'http://localhost:3100/api/analytics/events') {
  return new NextRequest(url, {
    method: 'POST',
    body,
    headers,
  })
}

describe('/api/analytics/events POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.rateLimitRequest.mockResolvedValue({
      allowed: true,
      limit: 240,
      remaining: 239,
      resetInSec: 60,
    })
    mocks.appendHomepageEventRecord.mockResolvedValue({
      eventName: 'homepage_viewed',
      deviceType: 'desktop',
    })
  })

  it('returns 429 when route is rate limited', async () => {
    mocks.rateLimitRequest.mockResolvedValue({
      allowed: false,
      limit: 240,
      remaining: 0,
      resetInSec: 22,
    })

    const req = createRequest(JSON.stringify({ eventName: 'homepage_viewed' }))
    const res = await POST(req)

    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBe('22')
    await expect(res.json()).resolves.toEqual({ error: 'Rate limit exceeded.' })
    expect(mocks.appendHomepageEventRecord).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid event name', async () => {
    const req = createRequest(JSON.stringify({ eventName: 'purchase' }))
    const res = await POST(req)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'Invalid eventName' })
    expect(mocks.appendHomepageEventRecord).not.toHaveBeenCalled()
  })

  it('records allowed event payload', async () => {
    const req = createRequest(
      JSON.stringify({
        eventName: 'homepage_cta_clicked',
        params: { cta_location: 'hero_primary_create', destination: '/create' },
        path: '/',
        pageVariant: 'variant_a',
        locale: 'en',
      }),
      { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)' }
    )

    const res = await POST(req)

    expect(res.status).toBe(202)
    await expect(res.json()).resolves.toEqual({ ok: true })
    expect(mocks.appendHomepageEventRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'homepage_cta_clicked',
        params: expect.objectContaining({
          cta_location: 'hero_primary_create',
          destination: '/create',
          visitor_id: expect.any(String),
          utm_source: expect.any(String),
          utm_campaign: expect.any(String),
          referrer_domain: expect.any(String),
          landing_path: expect.any(String),
          device_type: expect.any(String),
        }),
        path: '/',
        pageVariant: 'variant_a',
        locale: 'en',
      })
    )
  })

  it('accepts create entry funnel events', async () => {
    const req = createRequest(
      JSON.stringify({
        eventName: 'create_prompt_started',
        params: { entrypoint: 'homepage', prompt_length_bucket: '11_30' },
        path: '/create',
        pageVariant: 'variant_b',
        locale: 'en',
      })
    )

    const res = await POST(req)

    expect(res.status).toBe(202)
    await expect(res.json()).resolves.toEqual({ ok: true })
    expect(mocks.appendHomepageEventRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'create_prompt_started',
        params: expect.objectContaining({
          entrypoint: 'homepage',
          prompt_length_bucket: '11_30',
          visitor_id: expect.any(String),
        }),
        path: '/create',
        pageVariant: 'variant_b',
      })
    )
  })

  it('accepts product proof homepage events', async () => {
    const req = createRequest(
      JSON.stringify({
        eventName: 'product_proof_cta_clicked',
        params: { cta_location: 'product_proof_primary_create', destination: '/create' },
        path: '/',
        pageVariant: 'variant_a',
        locale: 'en',
      })
    )

    const res = await POST(req)

    expect(res.status).toBe(202)
    await expect(res.json()).resolves.toEqual({ ok: true })
    expect(mocks.appendHomepageEventRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'product_proof_cta_clicked',
        params: expect.objectContaining({
          cta_location: 'product_proof_primary_create',
          destination: '/create',
          visitor_id: expect.any(String),
        }),
        path: '/',
        pageVariant: 'variant_a',
      })
    )
  })

  it('reuses visitor_id from request cookie when payload omits it', async () => {
    const req = createRequest(
      JSON.stringify({
        eventName: 'homepage_viewed',
        params: { page_variant: 'variant_a' },
        path: '/',
      }),
      { cookie: `${HOMEPAGE_VISITOR_ID_COOKIE}=cookie_visitor_123` }
    )

    const res = await POST(req)

    expect(res.status).toBe(202)
    await expect(res.json()).resolves.toEqual({ ok: true })
    expect(mocks.appendHomepageEventRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'homepage_viewed',
        params: expect.objectContaining({
          page_variant: 'variant_a',
          visitor_id: 'cookie_visitor_123',
        }),
      })
    )
    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).toContain(`${ANALYTICS_ATTRIBUTION_COOKIE}=`)
  })

  it('captures attribution from landing path and referrer when missing in payload', async () => {
    const req = createRequest(
      JSON.stringify({
        eventName: 'homepage_viewed',
        params: { page_variant: 'variant_a' },
        path: '/?utm_source=meta&utm_medium=paid_social&utm_campaign=q2_launch',
      }),
      {
        cookie: `${HOMEPAGE_VISITOR_ID_COOKIE}=cookie_visitor_456`,
        referer: 'https://l.instagram.com/?u=https%3A%2F%2Fsmartprintai.com%2F',
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      }
    )

    const res = await POST(req)

    expect(res.status).toBe(202)
    await expect(res.json()).resolves.toEqual({ ok: true })
    expect(mocks.appendHomepageEventRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          visitor_id: 'cookie_visitor_456',
          utm_source: 'meta',
          utm_medium: 'paid_social',
          utm_campaign: 'q2_launch',
          landing_path: '/',
          device_type: 'mobile',
        }),
      })
    )
  })

  it('reuses stored attribution cookie when payload omits attribution fields', async () => {
    const attributionCookie = encodeURIComponent(JSON.stringify({
      visitor_id: 'cookie_visitor_789',
      captured_at: '2026-03-22T00:00:00.000Z',
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'brand',
      utm_content: 'ad_1',
      utm_term: 'smartprintai',
      referrer: 'https://google.com/search?q=smartprintai',
      referrer_domain: 'google.com',
      landing_path: '/',
      device_type: 'desktop',
    }))

    const req = createRequest(
      JSON.stringify({
        eventName: 'homepage_to_create_clicked',
        params: { cta_location: 'hero_primary_create' },
        path: '/create',
      }),
      {
        cookie: `${HOMEPAGE_VISITOR_ID_COOKIE}=cookie_visitor_789; ${ANALYTICS_ATTRIBUTION_COOKIE}=${attributionCookie}`,
      }
    )

    const res = await POST(req)

    expect(res.status).toBe(202)
    await expect(res.json()).resolves.toEqual({ ok: true })
    expect(mocks.appendHomepageEventRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          visitor_id: 'cookie_visitor_789',
          utm_source: 'google',
          utm_campaign: 'brand',
          referrer_domain: 'google.com',
          landing_path: '/',
          device_type: 'desktop',
        }),
      })
    )
  })

  it('generates and sets visitor_id cookie when missing in payload and request', async () => {
    const req = createRequest(
      JSON.stringify({
        eventName: 'homepage_viewed',
        params: { page_variant: 'variant_a' },
        path: '/',
      })
    )

    const res = await POST(req)

    expect(res.status).toBe(202)
    await expect(res.json()).resolves.toEqual({ ok: true })
    expect(mocks.appendHomepageEventRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'homepage_viewed',
        params: expect.objectContaining({
          page_variant: 'variant_a',
          visitor_id: expect.any(String),
        }),
      })
    )

    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).toBeTruthy()
    expect(setCookie).toContain(`${HOMEPAGE_VISITOR_ID_COOKIE}=`)
    expect(setCookie).toContain(`${ANALYTICS_ATTRIBUTION_COOKIE}=`)
  })
})
