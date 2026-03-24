import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rateLimitRequest: vi.fn(),
  sendSupportRequest: vi.fn(),
  sendSupportAutoReply: vi.fn(),
  appendSupportIntakeRecord: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitRequest: mocks.rateLimitRequest,
}))

vi.mock('@/lib/resend', () => ({
  sendSupportRequest: mocks.sendSupportRequest,
  sendSupportAutoReply: mocks.sendSupportAutoReply,
}))

vi.mock('@/lib/support-intake-log', () => ({
  appendSupportIntakeRecord: mocks.appendSupportIntakeRecord,
}))

import { POST } from './route'

function createRequest(body: string, headers: HeadersInit = {}) {
  return new NextRequest('http://localhost:3100/api/support', {
    method: 'POST',
    body,
    headers,
  })
}

describe('/api/support POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.rateLimitRequest.mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetInSec: 3600,
    })
  })

  it('returns 429 when support route is rate limited', async () => {
    mocks.rateLimitRequest.mockResolvedValue({
      allowed: false,
      limit: 10,
      remaining: 0,
      resetInSec: 55,
    })

    const req = createRequest(JSON.stringify({
      name: 'Matt',
      email: 'm@example.com',
      subject: 'Need help',
      message: 'Order did not update to shipped.',
    }))

    const res = await POST(req)
    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBe('55')
    await expect(res.json()).resolves.toEqual({
      error: 'Rate limit exceeded. Please try again shortly.',
    })
    expect(mocks.sendSupportRequest).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid payload', async () => {
    const req = createRequest(JSON.stringify({
      name: 'Matt',
      email: 'invalid-email',
      subject: 'Need help',
      message: 'Order did not update to shipped.',
    }))

    const res = await POST(req)
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'Invalid email' })
    expect(mocks.sendSupportRequest).not.toHaveBeenCalled()
  })

  it('creates support request and sends auto-reply for valid payload', async () => {
    const req = createRequest(
      JSON.stringify({
        name: 'Matt',
        email: 'MATT@EXAMPLE.COM',
        orderId: 'cmmiupftt0006qjl2yt1s3on5',
        subject: 'Where is my tracking?',
        message: 'Can you confirm if my order has shipped and provide tracking details?',
      }),
      { 'x-request-id': 'req-support-ok' }
    )

    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('x-request-id')).toBe('req-support-ok')
    await expect(res.json()).resolves.toEqual({
      ok: true,
      message: 'Support request received. We reply within 24 business hours.',
    })
    expect(mocks.sendSupportRequest).toHaveBeenCalledWith({
      name: 'Matt',
      email: 'matt@example.com',
      orderId: 'cmmiupftt0006qjl2yt1s3on5',
      subject: 'Where is my tracking?',
      message: 'Can you confirm if my order has shipped and provide tracking details?',
      requestId: 'req-support-ok',
    })
    expect(mocks.sendSupportAutoReply).toHaveBeenCalledWith({
      name: 'Matt',
      email: 'matt@example.com',
      orderId: 'cmmiupftt0006qjl2yt1s3on5',
    })
    expect(mocks.appendSupportIntakeRecord).toHaveBeenCalledTimes(1)
    expect(mocks.appendSupportIntakeRecord).toHaveBeenCalledWith(expect.objectContaining({
      requestId: 'req-support-ok',
      name: 'Matt',
      email: 'matt@example.com',
      subject: 'Where is my tracking?',
      orderId: 'cmmiupftt0006qjl2yt1s3on5',
    }))
  })

  it('returns 500 when sending support email fails', async () => {
    mocks.sendSupportRequest.mockRejectedValue(new Error('resend unavailable'))

    const req = createRequest(JSON.stringify({
      name: 'Matt',
      email: 'm@example.com',
      subject: 'Need help',
      message: 'Order did not update to shipped.',
    }))

    const res = await POST(req)
    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({ error: 'Support request failed' })
    expect(mocks.sendSupportAutoReply).not.toHaveBeenCalled()
    expect(mocks.appendSupportIntakeRecord).not.toHaveBeenCalled()
  })
})
