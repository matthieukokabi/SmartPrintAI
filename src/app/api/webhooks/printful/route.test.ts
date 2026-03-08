import { createHmac } from 'node:crypto'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  prisma: {
    order: {
      updateMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mocks.prisma,
}))

import { POST } from './route'

function createRequest(body: string, headers: HeadersInit = {}) {
  return new NextRequest('http://localhost:3100/api/webhooks/printful', {
    method: 'POST',
    body,
    headers,
  })
}

function signPayload(rawBody: string, secretHex: string) {
  return createHmac('sha256', Buffer.from(secretHex, 'hex')).update(rawBody).digest('hex')
}

describe('/api/webhooks/printful POST', () => {
  const secretHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.PRINTFUL_WEBHOOK_SECRET = secretHex
  })

  it('returns 401 for invalid webhook signature', async () => {
    const payload = JSON.stringify({ type: 'shipment_sent', data: { shipment: { order_id: 'pf_1' } } })
    const res = await POST(
      createRequest(payload, {
        'x-pf-webhook-signature': 'deadbeef',
      })
    )

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: 'Invalid signature' })
    expect(mocks.prisma.order.updateMany).not.toHaveBeenCalled()
  })

  it('marks order as shipped on valid shipment event with valid signature', async () => {
    const payload = JSON.stringify({
      type: 'shipment_sent',
      data: { shipment: { order_id: 'pf_order_123' } },
    })

    const signature = signPayload(payload, secretHex)
    mocks.prisma.order.updateMany.mockResolvedValue({ count: 1 })

    const res = await POST(
      createRequest(payload, {
        'x-pf-webhook-signature': signature,
        'x-request-id': 'req-printful-ok',
      })
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('x-request-id')).toBe('req-printful-ok')
    await expect(res.json()).resolves.toEqual({ ok: true })
    expect(mocks.prisma.order.updateMany).toHaveBeenCalledWith({
      where: { printfulOrderId: 'pf_order_123' },
      data: { status: 'shipped' },
    })
  })

  it('ignores unsupported events', async () => {
    const payload = JSON.stringify({ type: 'order_updated', data: { order: { id: 'pf_2' } } })
    const signature = signPayload(payload, secretHex)

    const res = await POST(
      createRequest(payload, {
        'x-pf-webhook-signature': signature,
      })
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true })
    expect(mocks.prisma.order.updateMany).not.toHaveBeenCalled()
  })
})
