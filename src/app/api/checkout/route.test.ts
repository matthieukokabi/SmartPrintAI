import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  prisma: {
    product: {
      findMany: vi.fn(),
    },
  },
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
  },
  sendMakeAbandonedCartCandidate: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mocks.prisma,
}))

vi.mock('@/lib/stripe', () => ({
  stripe: mocks.stripe,
}))

vi.mock('@/lib/make', () => ({
  sendMakeAbandonedCartCandidate: mocks.sendMakeAbandonedCartCandidate,
}))

import { POST } from './route'

function createRequest(body: string, headers: HeadersInit = {}) {
  return new NextRequest('http://localhost:3100/api/checkout', {
    method: 'POST',
    body,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  })
}

describe('/api/checkout POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'https://smartprintai.com'
  })

  it('returns 400 on invalid JSON body', async () => {
    const res = await POST(createRequest('{', { 'x-request-id': 'req-checkout-invalid-json' }))

    expect(res.status).toBe(400)
    expect(res.headers.get('x-request-id')).toBe('req-checkout-invalid-json')
    await expect(res.json()).resolves.toEqual({ error: 'Invalid JSON body' })
    expect(mocks.prisma.product.findMany).not.toHaveBeenCalled()
    expect(mocks.sendMakeAbandonedCartCandidate).not.toHaveBeenCalled()
  })

  it('returns 400 when product IDs are missing in DB', async () => {
    mocks.prisma.product.findMany.mockResolvedValue([])

    const payload = {
      items: [
        {
          productId: 'prod-1',
          designId: 'design-1',
          size: 'M',
          color: 'Black',
          quantity: 1,
        },
      ],
    }

    const res = await POST(createRequest(JSON.stringify(payload)))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'One or more products were not found' })
    expect(mocks.stripe.checkout.sessions.create).not.toHaveBeenCalled()
    expect(mocks.sendMakeAbandonedCartCandidate).not.toHaveBeenCalled()
  })

  it('creates Stripe session and returns checkout URL for valid payload', async () => {
    mocks.prisma.product.findMany.mockResolvedValue([
      {
        id: 'prod-1',
        name: 'Premium Tee',
        printfulId: '401',
        sellPrice: 29.99,
      },
    ])

    mocks.stripe.checkout.sessions.create.mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.test/session_123',
    })

    const payload = {
      items: [
        {
          productId: 'prod-1',
          designId: 'design-1',
          size: 'L',
          color: 'Black',
          quantity: 2,
        },
      ],
      email: 'TEST@Example.com',
      sessionId: 'sess-abc',
    }

    const res = await POST(createRequest(JSON.stringify(payload), { 'x-request-id': 'req-checkout-ok' }))

    expect(res.status).toBe(200)
    expect(res.headers.get('x-request-id')).toBe('req-checkout-ok')
    await expect(res.json()).resolves.toEqual({ url: 'https://checkout.stripe.test/session_123' })

    expect(mocks.stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_email: 'test@example.com',
        phone_number_collection: {
          enabled: true,
        },
        shipping_address_collection: {
          allowed_countries: ['US', 'CA', 'GB', 'DE', 'FR', 'AU', 'NL', 'BE', 'CH'],
        },
        success_url: 'https://smartprintai.com/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://smartprintai.com/cart',
        metadata: expect.objectContaining({
          sessionId: 'sess-abc',
        }),
      })
    )

    expect(mocks.sendMakeAbandonedCartCandidate).toHaveBeenCalledWith({
      requestId: 'req-checkout-ok',
      stripeSessionId: 'cs_test_123',
      checkoutUrl: 'https://checkout.stripe.test/session_123',
      email: 'test@example.com',
      sessionId: 'sess-abc',
      itemCount: 1,
      cartTotal: 59.98,
      items: [
        {
          productId: 'prod-1',
          designId: 'design-1',
          size: 'L',
          color: 'Black',
          quantity: 2,
        },
      ],
    })
  })

  it('returns 409 when cart contains blocked gooten ready-to-buy product', async () => {
    mocks.prisma.product.findMany.mockResolvedValue([
      {
        id: 'prod-gooten-411',
        name: 'Stainless Steel Travel Mug',
        printfulId: 'gooten:411',
        sellPrice: 40.48,
        printArea: {
          providerProductId: '411',
          providerDefaultSku: 'StainlessSteelTravelMugsHandle-PolarCamel-20oz',
          variantMapping: {
            white: 'StainlessSteelTravelMugsHandle-PolarCamel-20oz',
          },
        },
      },
    ])

    const payload = {
      items: [
        {
          productId: 'prod-gooten-411',
          designId: 'ready_prod-gooten-411',
          size: 'One Size',
          color: 'Default',
          quantity: 1,
        },
      ],
    }

    const res = await POST(createRequest(JSON.stringify(payload)))

    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({
      error: 'One or more items are temporarily unavailable while we update print production settings.',
      blockedProductIds: ['prod-gooten-411'],
    })
    expect(mocks.stripe.checkout.sessions.create).not.toHaveBeenCalled()
    expect(mocks.sendMakeAbandonedCartCandidate).not.toHaveBeenCalled()
  })

  it('blocks destination country before Stripe session when product is US-only', async () => {
    mocks.prisma.product.findMany.mockResolvedValue([
      {
        id: 'prod-us-only',
        name: 'Acrylic Ornaments',
        printfulId: '793',
        sellPrice: 14.5,
      },
    ])

    const payload = {
      items: [
        {
          productId: 'prod-us-only',
          designId: 'design-1',
          size: 'One Size',
          color: 'Default',
          quantity: 1,
        },
      ],
      destinationCountry: 'FR',
    }

    const res = await POST(createRequest(JSON.stringify(payload)))

    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({
      error: 'Some items in your cart are not available for shipping to FR.',
      blockedProductIds: ['prod-us-only'],
      destinationCountry: 'FR',
      allowedCountries: ['US'],
    })
    expect(mocks.stripe.checkout.sessions.create).not.toHaveBeenCalled()
    expect(mocks.sendMakeAbandonedCartCandidate).not.toHaveBeenCalled()
  })

  it('restricts checkout shipping countries to US for known US-only products', async () => {
    mocks.prisma.product.findMany.mockResolvedValue([
      {
        id: 'prod-us-only',
        name: 'Acrylic Ornaments',
        printfulId: '793',
        sellPrice: 14.5,
      },
    ])

    mocks.stripe.checkout.sessions.create.mockResolvedValue({
      id: 'cs_test_usa_only',
      url: 'https://checkout.stripe.test/session_us_only',
    })

    const payload = {
      items: [
        {
          productId: 'prod-us-only',
          designId: 'design-1',
          size: 'One Size',
          color: 'Default',
          quantity: 1,
        },
      ],
    }

    const res = await POST(createRequest(JSON.stringify(payload)))

    expect(res.status).toBe(200)
    expect(mocks.stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        shipping_address_collection: {
          allowed_countries: ['US'],
        },
      })
    )
  })
})
