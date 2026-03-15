import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
    design: {
      findMany: vi.fn(),
    },
    order: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  printful: {
    createOrder: vi.fn(),
  },
  gelato: {
    createOrder: vi.fn(),
  },
  sendOrderConfirmation: vi.fn(),
  sendMakeOrderAlert: vi.fn(),
}))

vi.mock('@/lib/stripe', () => ({
  stripe: mocks.stripe,
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mocks.prisma,
}))

vi.mock('@/lib/printful', () => ({
  printful: mocks.printful,
}))

vi.mock('@/lib/gelato', () => ({
  gelato: mocks.gelato,
}))

vi.mock('@/lib/resend', () => ({
  sendOrderConfirmation: mocks.sendOrderConfirmation,
}))

vi.mock('@/lib/make', () => ({
  sendMakeOrderAlert: mocks.sendMakeOrderAlert,
}))

import { POST } from './route'

function createRequest(body: string, headers: HeadersInit = {}) {
  return new NextRequest('http://localhost:3100/api/webhooks/stripe', {
    method: 'POST',
    body,
    headers,
  })
}

describe('/api/webhooks/stripe POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  })

  it('returns 400 when stripe-signature header is missing', async () => {
    const res = await POST(createRequest('{}', { 'x-request-id': 'req-stripe-missing-sig' }))

    expect(res.status).toBe(400)
    expect(res.headers.get('x-request-id')).toBe('req-stripe-missing-sig')
    await expect(res.json()).resolves.toEqual({ error: 'Missing signature' })
    expect(mocks.stripe.webhooks.constructEvent).not.toHaveBeenCalled()
  })

  it('returns 200 and ignores non-checkout events', async () => {
    mocks.stripe.webhooks.constructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: {} },
    })

    const res = await POST(createRequest('{}', { 'stripe-signature': 'sig_value' }))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true })
    expect(mocks.prisma.order.create).not.toHaveBeenCalled()
  })

  it('creates manual review order when shipping/email details are missing', async () => {
    const metadataItems = [
      {
        productId: 'prod-1',
        designId: 'design-1',
        size: 'M',
        color: 'Black',
        quantity: 1,
      },
    ]

    mocks.stripe.webhooks.constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_1',
          metadata: { items: JSON.stringify(metadataItems) },
          amount_total: 3598,
          amount_subtotal: 2999,
          shipping_cost: { amount_total: 599 },
          customer_email: null,
          customer_details: { email: null },
          shipping_details: null,
        },
      },
    })

    mocks.prisma.product.findMany.mockResolvedValue([
      {
        id: 'prod-1',
        sellPrice: 29.99,
        colors: [{ name: 'Black', printfulVariantId: 1234 }],
      },
    ])

    mocks.prisma.design.findMany.mockResolvedValue([
      {
        id: 'design-1',
        imageUrl: 'https://example.com/design.png',
      },
    ])

    mocks.prisma.order.create.mockResolvedValue({ id: 'order_1', total: 35.98 })

    const res = await POST(createRequest('{}', { 'stripe-signature': 'sig_value' }))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true })
    expect(mocks.prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          stripeSessionId: 'cs_test_1',
          status: 'manual_review',
        }),
      })
    )
    expect(mocks.printful.createOrder).not.toHaveBeenCalled()
    expect(mocks.gelato.createOrder).not.toHaveBeenCalled()
    expect(mocks.sendMakeOrderAlert).not.toHaveBeenCalled()
  })

  it('sends make order alert after successful order creation + fulfillment', async () => {
    const metadataItems = [
      {
        productId: 'prod-1',
        designId: 'design-1',
        size: 'M',
        color: 'Black',
        quantity: 1,
      },
    ]

    mocks.stripe.webhooks.constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_success',
          metadata: { items: JSON.stringify(metadataItems) },
          amount_total: 3598,
          amount_subtotal: 2999,
          shipping_cost: { amount_total: 599 },
          customer_email: 'buyer@example.com',
          customer_details: { email: 'buyer@example.com' },
          shipping_details: {
            name: 'Buyer',
            address: {
              line1: 'Main St 1',
              city: 'Zurich',
              country: 'CH',
              postal_code: '8000',
              state: null,
              line2: null,
            },
          },
        },
      },
    })

    mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user_1' })

    mocks.prisma.product.findMany.mockResolvedValue([
      {
        id: 'prod-1',
        sellPrice: 29.99,
        colors: [{ name: 'Black', printfulVariantId: 1234 }],
      },
    ])

    mocks.prisma.design.findMany.mockResolvedValue([
      {
        id: 'design-1',
        imageUrl: 'https://example.com/design.png',
      },
    ])

    mocks.prisma.order.create.mockResolvedValue({ id: 'order_1', total: 35.98 })
    mocks.printful.createOrder.mockResolvedValue({ id: 'pf_12345' })

    const res = await POST(createRequest('{}', { 'stripe-signature': 'sig_value', 'x-request-id': 'req-stripe-ok' }))

    expect(res.status).toBe(200)
    expect(res.headers.get('x-request-id')).toBe('req-stripe-ok')
    await expect(res.json()).resolves.toEqual({ ok: true })

    expect(mocks.sendOrderConfirmation).toHaveBeenCalledWith({
      email: 'buyer@example.com',
      orderId: 'order_1',
      items: metadataItems,
      total: 35.98,
    })

    expect(mocks.sendMakeOrderAlert).toHaveBeenCalledWith({
      requestId: 'req-stripe-ok',
      orderId: 'order_1',
      stripeSessionId: 'cs_test_success',
      email: 'buyer@example.com',
      total: 35.98,
      itemsCount: 1,
      status: 'processing',
      printfulOrderId: 'pf_12345',
    })
  })

  it('creates Gelato order with required currency and order reference', async () => {
    const metadataItems = [
      {
        productId: 'prod-gelato',
        designId: 'design-1',
        size: 'M',
        color: 'White',
        quantity: 1,
      },
    ]

    mocks.stripe.webhooks.constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_gelato',
          metadata: { items: JSON.stringify(metadataItems) },
          amount_total: 4210,
          amount_subtotal: 3611,
          shipping_cost: { amount_total: 599 },
          currency: 'chf',
          customer_email: 'gelato@example.com',
          customer_details: { email: 'gelato@example.com' },
          shipping_details: {
            name: 'Gelato Buyer',
            address: {
              line1: 'Lake St 9',
              city: 'Geneva',
              country: 'CH',
              postal_code: '1201',
              state: null,
              line2: null,
            },
          },
        },
      },
    })

    mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user_1' })
    mocks.prisma.product.findMany.mockResolvedValue([
      {
        id: 'prod-gelato',
        printfulId: 'gelato:template:abc',
        sellPrice: 36.11,
        colors: [],
        printArea: {
          variantMapping: {
            'm:white': 'gelato_uid_white_m',
          },
        },
      },
    ])
    mocks.prisma.design.findMany.mockResolvedValue([
      {
        id: 'design-1',
        imageUrl: 'https://example.com/design-gelato.png',
      },
    ])
    mocks.prisma.order.create.mockResolvedValue({ id: 'order_gelato_1', total: 42.1 })
    mocks.gelato.createOrder.mockResolvedValue({ id: 'gel_order_123' })

    const res = await POST(createRequest('{}', { 'stripe-signature': 'sig_value', 'x-request-id': 'req-gelato-ok' }))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true })

    expect(mocks.printful.createOrder).not.toHaveBeenCalled()
    expect(mocks.gelato.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        orderReferenceId: 'order_gelato_1',
        currency: 'CHF',
        customerEmail: 'gelato@example.com',
      })
    )

    expect(mocks.sendMakeOrderAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req-gelato-ok',
        orderId: 'order_gelato_1',
        printfulOrderId: 'gel_order_123',
      })
    )
  })
})
