import { createHmac } from 'node:crypto'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  prisma: {
    order: {
      updateMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
  sendShipmentNotification: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mocks.prisma,
}))

vi.mock('@/lib/resend', () => ({
  sendShipmentNotification: mocks.sendShipmentNotification,
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
      data: {
        shipment: {
          order_id: 'pf_order_123',
          tracking_url: 'https://carrier.example/track/123',
          tracking_number: 'TRACK-123',
          carrier: 'DHL',
        },
      },
    })

    const signature = signPayload(payload, secretHex)
    mocks.prisma.order.updateMany.mockResolvedValue({ count: 1 })
    mocks.prisma.order.findFirst.mockResolvedValue({
      id: 'order_123',
      email: 'buyer@example.com',
    })

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
      where: {
        printfulOrderId: 'pf_order_123',
        status: { not: 'shipped' },
      },
      data: { status: 'shipped' },
    })
    expect(mocks.prisma.order.findFirst).toHaveBeenCalledWith({
      where: { printfulOrderId: 'pf_order_123' },
      select: { id: true, email: true },
    })
    expect(mocks.sendShipmentNotification).toHaveBeenCalledWith({
      email: 'buyer@example.com',
      orderId: 'order_123',
      trackingUrl: 'https://carrier.example/track/123',
      trackingNumber: 'TRACK-123',
      carrier: 'DHL',
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
    expect(mocks.sendShipmentNotification).not.toHaveBeenCalled()
  })

  it('does not send shipment email when webhook is duplicate shipped event', async () => {
    const payload = JSON.stringify({
      type: 'shipment_sent',
      data: { shipment: { order_id: 'pf_order_123' } },
    })
    const signature = signPayload(payload, secretHex)

    mocks.prisma.order.updateMany.mockResolvedValue({ count: 0 })

    const res = await POST(
      createRequest(payload, {
        'x-pf-webhook-signature': signature,
      })
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true })
    expect(mocks.prisma.order.findFirst).not.toHaveBeenCalled()
    expect(mocks.sendShipmentNotification).not.toHaveBeenCalled()
  })
})
