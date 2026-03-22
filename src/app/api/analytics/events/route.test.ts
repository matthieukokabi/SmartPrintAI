import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
        pageVariant: 'premium_v2',
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
        path: '/',
        pageVariant: 'premium_v2',
        locale: 'en',
      })
    )
  })
})
