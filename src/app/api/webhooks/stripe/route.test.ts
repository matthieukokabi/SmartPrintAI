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
      upsert: vi.fn(),
    },
    order: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    mockup: {
      findMany: vi.fn(),
    },
  },
  printful: {
    createOrder: vi.fn(),
  },
  gelato: {
    createOrder: vi.fn(),
  },
  gooten: {
    createOrder: vi.fn(),
  },
  buildPrintFile: vi.fn(),
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

vi.mock('@/lib/print-file', () => ({
  buildPrintFile: mocks.buildPrintFile,
}))

vi.mock('@/lib/gelato', () => ({
  gelato: mocks.gelato,
}))

vi.mock('@/lib/gooten', () => ({
  getGootenClient: vi.fn(() => mocks.gooten),
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
    process.env.GOOTEN_PARTNER_BILLING_KEY = 'gpk_test'
    mocks.prisma.order.findUnique.mockResolvedValue(null)
    mocks.prisma.mockup.findMany.mockResolvedValue([])
    mocks.buildPrintFile.mockResolvedValue({
      url: 'https://storage.example.com/printfiles/mock.png',
      widthPx: 720,
      heightPx: 1200,
      dpi: 300,
      placement: 'default',
    })
  })

  it('returns 400 when stripe-signature header is missing', async () => {
    // Real Stripe SDK throws when sig is null/empty; simulate that
    // so the route's try/catch returns 400 'Invalid signature'.
    mocks.stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('No signature header provided')
    })

    const res = await POST(createRequest('{}', { 'x-request-id': 'req-stripe-missing-sig' }))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'Invalid signature' })
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
          payment_status: 'paid',
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
    expect(mocks.gooten.createOrder).not.toHaveBeenCalled()
    expect(mocks.sendMakeOrderAlert).not.toHaveBeenCalled()
  })

  it('falls back to customer_details.address when shipping_details is missing', async () => {
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
          id: 'cs_test_customer_details_fallback',
          metadata: { items: JSON.stringify(metadataItems) },
          amount_total: 3598,
          amount_subtotal: 2999,
          shipping_cost: { amount_total: 599 },
          payment_status: 'paid',
          customer_email: null,
          customer_details: {
            email: 'buyer@example.com',
            name: 'Buyer Example',
            phone: '+12025550199',
            address: {
              line1: 'Main St 1',
              city: 'Zurich',
              country: 'CH',
              postal_code: '8000',
              state: null,
              line2: null,
            },
          },
          shipping_details: null,
        },
      },
    })

    mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user_1' })
    mocks.prisma.product.findMany.mockResolvedValue([
      {
        id: 'prod-1',
        printfulId: '12',
        name: 'Test',
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
    mocks.prisma.order.create.mockResolvedValue({ id: 'order_fallback_1', total: 35.98 })
    mocks.printful.createOrder.mockResolvedValue({ id: 'pf_fallback_123' })

    const res = await POST(createRequest('{}', { 'stripe-signature': 'sig_value' }))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true })

    expect(mocks.prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          stripeSessionId: 'cs_test_customer_details_fallback',
          status: 'processing',
          shippingAddress: expect.objectContaining({
            line1: 'Main St 1',
            city: 'Zurich',
            country: 'CH',
            postal_code: '8000',
          }),
        }),
      })
    )
    expect(mocks.printful.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'buyer@example.com',
        shippingAddress: expect.objectContaining({
          name: 'Buyer Example',
          address1: 'Main St 1',
          city: 'Zurich',
          country_code: 'CH',
          zip: '8000',
          phone: '+12025550199',
        }),
      })
    )
    expect(mocks.sendOrderConfirmation).toHaveBeenCalledWith({
      email: 'buyer@example.com',
      orderId: 'order_fallback_1',
      items: metadataItems,
      total: 35.98,
    })
    expect(mocks.sendMakeOrderAlert).toHaveBeenCalled()
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
          payment_status: 'paid',
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
        printfulId: '12',
        name: 'Test',
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

    mocks.prisma.order.create.mockResolvedValue({ id: 'order_1', total: 35.98, status: 'processing' })
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

  it('treats duplicate webhook replays as idempotent and skips fulfillment/email side effects', async () => {
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
          id: 'cs_test_duplicate_replay',
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
    mocks.prisma.order.create.mockRejectedValue({ code: 'P2002' })

    const res = await POST(createRequest('{}', { 'stripe-signature': 'sig_value' }))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true })
    expect(mocks.printful.createOrder).not.toHaveBeenCalled()
    expect(mocks.gelato.createOrder).not.toHaveBeenCalled()
    expect(mocks.gooten.createOrder).not.toHaveBeenCalled()
    expect(mocks.sendOrderConfirmation).not.toHaveBeenCalled()
    expect(mocks.sendMakeOrderAlert).not.toHaveBeenCalled()
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
          payment_status: 'paid',
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
    expect(mocks.gooten.createOrder).not.toHaveBeenCalled()
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

  it('creates fallback design for ready-to-buy items when design record is missing', async () => {
    const metadataItems = [
      {
        productId: 'prod-ready',
        designId: 'ready_prod-ready',
        size: 'L',
        color: 'Black',
        quantity: 1,
      },
    ]

    mocks.stripe.webhooks.constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_ready_buy',
          metadata: { items: JSON.stringify(metadataItems) },
          amount_total: 7799,
          amount_subtotal: 7200,
          shipping_cost: { amount_total: 599 },
          customer_email: 'ready@example.com',
          customer_details: { email: 'ready@example.com' },
          shipping_details: {
            name: 'Ready Buyer',
            address: {
              line1: 'Commerce St 12',
              city: 'Austin',
              country: 'US',
              postal_code: '73301',
              state: 'TX',
              line2: null,
            },
          },
        },
      },
    })

    mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user_1' })
    mocks.prisma.product.findMany.mockResolvedValue([
      {
        id: 'prod-ready',
        name: 'adidas Premium Polo Shirt',
        printfulId: '123',
        sellPrice: 72,
        imageUrl: 'https://cdn.smartprintai.com/catalog/adidas-polo.png',
        colors: [{ name: 'Black', printfulVariantId: 9876 }],
      },
    ])
    mocks.prisma.design.findMany.mockResolvedValue([])
    mocks.prisma.design.upsert.mockResolvedValue({
      id: 'ready_prod-ready',
      imageUrl: 'https://cdn.smartprintai.com/catalog/adidas-polo.png',
    })
    mocks.prisma.order.create.mockResolvedValue({ id: 'order_ready_1', total: 77.99 })
    mocks.printful.createOrder.mockResolvedValue({ id: 'pf_ready_123' })

    const res = await POST(createRequest('{}', { 'stripe-signature': 'sig_value', 'x-request-id': 'req-ready-buy' }))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true })

    expect(mocks.prisma.design.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ready_prod-ready' },
        create: expect.objectContaining({
          id: 'ready_prod-ready',
          sessionId: 'cs_test_ready_buy',
          prompt: '[ready-to-buy] adidas Premium Polo Shirt',
          style: 'ready_to_buy',
          imageUrl: 'https://cdn.smartprintai.com/catalog/adidas-polo.png',
        }),
      })
    )

    expect(mocks.printful.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            variantId: 9876,
            imageUrl: 'https://cdn.smartprintai.com/catalog/adidas-polo.png',
          }),
        ],
      })
    )
  })

  it('creates Gooten order with SKU mapping for gooten products', async () => {
    const metadataItems = [
      {
        productId: 'prod-gooten',
        designId: 'design-1',
        size: 'M',
        color: 'White',
        quantity: 2,
      },
    ]

    mocks.stripe.webhooks.constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_gooten',
          metadata: { items: JSON.stringify(metadataItems) },
          amount_total: 6798,
          amount_subtotal: 6199,
          shipping_cost: { amount_total: 599 },
          payment_status: 'paid',
          currency: 'usd',
          customer_email: 'gooten@example.com',
          customer_details: { email: 'gooten@example.com', phone: '+15125550123' },
          shipping_details: {
            name: 'Gooten Buyer',
            address: {
              line1: 'Main St 7',
              city: 'Austin',
              country: 'US',
              postal_code: '73301',
              state: 'TX',
              line2: null,
            },
          },
        },
      },
    })

    mocks.prisma.user.findUnique.mockResolvedValue({ id: 'user_1' })
    mocks.prisma.product.findMany.mockResolvedValue([
      {
        id: 'prod-gooten',
        printfulId: 'gooten:hoodie_001',
        sellPrice: 30.99,
        colors: [{ name: 'White', printfulVariantId: 0 }],
        printArea: {
          providerProductId: 'hoodie_001',
          providerDefaultSku: 'sku_white_m',
          variantMapping: {
            'm:white': 'sku_white_m',
            white: 'sku_white_m',
          },
        },
      },
    ])
    mocks.prisma.design.findMany.mockResolvedValue([
      {
        id: 'design-1',
        imageUrl: 'https://example.com/design-gooten.png',
      },
    ])
    mocks.prisma.order.create.mockResolvedValue({ id: 'order_gooten_1', total: 67.98, shippingCost: 5.99 })
    mocks.gooten.createOrder.mockResolvedValue({ OrderId: 'gt_order_123' })

    const res = await POST(createRequest('{}', { 'stripe-signature': 'sig_value', 'x-request-id': 'req-gooten-ok' }))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true })

    expect(mocks.printful.createOrder).not.toHaveBeenCalled()
    expect(mocks.gelato.createOrder).not.toHaveBeenCalled()
    expect(mocks.gooten.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        SourceId: 'order_gooten_1',
        ExternalId: 'order_gooten_1',
        BillingAddress: expect.objectContaining({
          FirstName: 'Gooten',
          LastName: 'Buyer',
          Line1: 'Main St 7',
          CountryCode: 'US',
          Email: 'gooten@example.com',
          Phone: '+15125550123',
        }),
        ShipToAddress: expect.objectContaining({
          Phone: '+15125550123',
        }),
        Payment: expect.objectContaining({
          PartnerBillingKey: 'gpk_test',
        }),
        Items: [
          expect.objectContaining({
            SKU: 'sku_white_m',
            ProductId: 'hoodie_001',
            Quantity: 2,
          }),
        ],
      })
    )

    expect(mocks.sendMakeOrderAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req-gooten-ok',
        orderId: 'order_gooten_1',
        printfulOrderId: 'gt_order_123',
      })
    )
  })

  it('persists internalNotes with failure reason on REQUIRES_REVIEW orders when buildPrintFile throws', async () => {
    const metadataItems = [
      {
        productId: 'prod-1',
        designId: 'design-1',
        size: '2.4″×4″',
        color: 'Default',
        quantity: 1,
      },
    ]

    mocks.stripe.webhooks.constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_requires_review',
          metadata: { items: JSON.stringify(metadataItems) },
          amount_total: 2909,
          amount_subtotal: 2310,
          shipping_cost: { amount_total: 599 },
          payment_status: 'paid',
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

    mocks.prisma.product.findMany.mockResolvedValue([
      {
        id: 'prod-1',
        printfulId: '938',
        name: 'Luggage Tag',
        sellPrice: 23.1,
        colors: [{ name: 'Default', printfulVariantId: 23889 }],
      },
    ])
    mocks.prisma.design.findMany.mockResolvedValue([
      {
        id: 'design-1',
        imageUrl: 'https://example.com/design.png',
      },
    ])
    mocks.prisma.order.create.mockResolvedValue({
      id: 'order_review_1',
      total: 29.09,
    })

    // Simulate the print-file build throwing — this is the path the
    // P0 mockup-fix added to route the order to REQUIRES_REVIEW.
    mocks.buildPrintFile.mockRejectedValue(new Error('boom dimension mismatch'))

    const res = await POST(createRequest('{}', { 'stripe-signature': 'sig_value' }))

    expect(res.status).toBe(200)
    expect(mocks.printful.createOrder).not.toHaveBeenCalled()
    expect(mocks.prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'REQUIRES_REVIEW',
          internalNotes: expect.stringContaining('boom dimension mismatch'),
        }),
      })
    )
  })
})
