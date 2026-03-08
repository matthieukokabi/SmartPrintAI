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
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mocks.prisma,
}))

vi.mock('@/lib/stripe', () => ({
  stripe: mocks.stripe,
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
  })

  it('creates Stripe session and returns checkout URL for valid payload', async () => {
    mocks.prisma.product.findMany.mockResolvedValue([
      {
        id: 'prod-1',
        name: 'Premium Tee',
        sellPrice: 29.99,
      },
    ])

    mocks.stripe.checkout.sessions.create.mockResolvedValue({
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
        success_url: 'https://smartprintai.com/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://smartprintai.com/cart',
        metadata: expect.objectContaining({
          sessionId: 'sess-abc',
        }),
      })
    )
  })
})
