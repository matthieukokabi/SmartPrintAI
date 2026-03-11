import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  prisma: {
    order: {
      count: vi.fn(),
    },
    design: {
      count: vi.fn(),
    },
  },
  sendMakeDailyDigest: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mocks.prisma,
}))

vi.mock('@/lib/make', () => ({
  sendMakeDailyDigest: mocks.sendMakeDailyDigest,
}))

import { POST } from './route'

function createRequest(body: string, headers: HeadersInit = {}) {
  return new NextRequest('http://localhost:3100/api/automations/daily-digest', {
    method: 'POST',
    body,
    headers,
  })
}

describe('/api/automations/daily-digest POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.AUTOMATION_SHARED_SECRET = 'automation-secret'
    mocks.prisma.order.count.mockResolvedValue(0)
    mocks.prisma.design.count.mockResolvedValue(0)
    mocks.sendMakeDailyDigest.mockResolvedValue({ sent: true, status: 200 })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 401 when token is missing', async () => {
    const res = await POST(createRequest(''))

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' })
    expect(mocks.sendMakeDailyDigest).not.toHaveBeenCalled()
  })

  it('returns 401 when token is invalid', async () => {
    const res = await POST(createRequest('', { 'x-automation-token': 'wrong-token' }))

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' })
    expect(mocks.sendMakeDailyDigest).not.toHaveBeenCalled()
  })

  it('returns 400 for out-of-range windowHours', async () => {
    const res = await POST(
      createRequest(
        JSON.stringify({ windowHours: 500 }),
        { 'x-automation-token': 'automation-secret' }
      )
    )

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: 'windowHours must be an integer between 1 and 168',
    })
    expect(mocks.sendMakeDailyDigest).not.toHaveBeenCalled()
  })

  it('computes metrics and sends digest with default 24h window', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-11T10:00:00.000Z'))

    mocks.prisma.order.count
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1)
    mocks.prisma.design.count.mockResolvedValueOnce(18)

    const res = await POST(
      createRequest(
        '',
        {
          'x-automation-token': 'automation-secret',
          'x-request-id': 'req-digest-ok',
        }
      )
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('x-request-id')).toBe('req-digest-ok')

    await expect(res.json()).resolves.toEqual({
      ok: true,
      windowHours: 24,
      windowStartIso: '2026-03-10T10:00:00.000Z',
      windowEndIso: '2026-03-11T10:00:00.000Z',
      metrics: {
        ordersCreated: 12,
        ordersPaid: 2,
        ordersProcessing: 5,
        ordersShipped: 3,
        ordersFulfillmentFailed: 1,
        designsCreated: 18,
      },
    })

    expect(mocks.sendMakeDailyDigest).toHaveBeenCalledWith({
      requestId: 'req-digest-ok',
      windowStartIso: '2026-03-10T10:00:00.000Z',
      windowEndIso: '2026-03-11T10:00:00.000Z',
      windowHours: 24,
      ordersCreated: 12,
      ordersPaid: 2,
      ordersProcessing: 5,
      ordersShipped: 3,
      ordersFulfillmentFailed: 1,
      designsCreated: 18,
    })
  })

  it('returns 503 when make digest webhook is not configured', async () => {
    mocks.sendMakeDailyDigest.mockResolvedValue({
      sent: false,
      reason: 'webhook_not_configured',
    })

    const res = await POST(
      createRequest(
        JSON.stringify({ windowHours: 12 }),
        { authorization: 'Bearer automation-secret' }
      )
    )

    expect(res.status).toBe(503)
    await expect(res.json()).resolves.toEqual({
      error: 'Daily digest webhook is not configured',
    })
  })
})
