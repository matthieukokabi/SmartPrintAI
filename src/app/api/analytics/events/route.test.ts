import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

function createRequest(body: string, headers: HeadersInit = {}) {
  return new NextRequest('http://localhost:3100/api/analytics/events', {
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
    expect(res.headers.get('set-cookie')).toBeNull()
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
  })
})
