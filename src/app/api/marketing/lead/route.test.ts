import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rateLimitRequest: vi.fn(),
  sendDiscountLeadNotification: vi.fn(),
  sendFirstOrderCouponEmail: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitRequest: mocks.rateLimitRequest,
}))

vi.mock('@/lib/resend', () => ({
  sendDiscountLeadNotification: mocks.sendDiscountLeadNotification,
  sendFirstOrderCouponEmail: mocks.sendFirstOrderCouponEmail,
}))

import { POST } from './route'

function createRequest(body: string, headers: HeadersInit = {}) {
  return new NextRequest('http://localhost:3100/api/marketing/lead', {
    method: 'POST',
    body,
    headers,
  })
}

describe('/api/marketing/lead POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.rateLimitRequest.mockResolvedValue({
      allowed: true,
      limit: 20,
      remaining: 19,
      resetInSec: 3600,
    })
    process.env.FIRST_ORDER_COUPON_CODE = 'WELCOME10'
  })

  it('returns 429 when route is rate limited', async () => {
    mocks.rateLimitRequest.mockResolvedValue({
      allowed: false,
      limit: 20,
      remaining: 0,
      resetInSec: 25,
    })

    const req = createRequest(JSON.stringify({ email: 'lead@example.com' }))
    const res = await POST(req)

    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBe('25')
    await expect(res.json()).resolves.toEqual({
      error: 'Rate limit exceeded. Please try again shortly.',
    })
    expect(mocks.sendDiscountLeadNotification).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid email', async () => {
    const req = createRequest(JSON.stringify({ email: 'not-an-email' }))
    const res = await POST(req)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'Invalid email' })
    expect(mocks.sendDiscountLeadNotification).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid locale', async () => {
    const req = createRequest(JSON.stringify({ email: 'lead@example.com', locale: 'pt' }))
    const res = await POST(req)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'Invalid locale' })
    expect(mocks.sendDiscountLeadNotification).not.toHaveBeenCalled()
  })

  it('sends lead notification and coupon email for valid payload', async () => {
    const req = createRequest(JSON.stringify({
      email: 'LEAD@EXAMPLE.COM',
      locale: 'fr',
      source: 'homepage_popup',
    }), { 'x-request-id': 'req-lead-ok' })

    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('x-request-id')).toBe('req-lead-ok')
    await expect(res.json()).resolves.toEqual({
      ok: true,
      message: 'Discount code sent.',
      couponCode: 'WELCOME10',
    })

    expect(mocks.sendDiscountLeadNotification).toHaveBeenCalledWith({
      email: 'lead@example.com',
      locale: 'fr',
      source: 'homepage_popup',
      couponCode: 'WELCOME10',
      requestId: 'req-lead-ok',
    })

    expect(mocks.sendFirstOrderCouponEmail).toHaveBeenCalledWith({
      email: 'lead@example.com',
      locale: 'fr',
      couponCode: 'WELCOME10',
    })
  })

  it('returns 500 when sending email fails', async () => {
    mocks.sendFirstOrderCouponEmail.mockRejectedValue(new Error('resend unavailable'))

    const req = createRequest(JSON.stringify({
      email: 'lead@example.com',
      locale: 'en',
    }))

    const res = await POST(req)

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({ error: 'Unable to send discount code' })
  })
})
