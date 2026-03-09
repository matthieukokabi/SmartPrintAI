import { describe, expect, it, vi } from 'vitest'
import { trackPurchase } from './analytics'
import type { Order } from '@/types'

describe('trackPurchase', () => {
  it('returns false when gtag is unavailable', () => {
    const originalWindow = (globalThis as unknown as { window?: unknown }).window
    ;(globalThis as unknown as { window?: unknown }).window = {} as Window

    const ok = trackPurchase({
      id: 'ord_1',
      email: 'x@example.com',
      status: 'paid',
      subtotal: 10,
      shippingCost: 5.99,
      total: 15.99,
      createdAt: new Date().toISOString(),
      items: [],
    } as Order)

    expect(ok).toBe(false)
    ;(globalThis as unknown as { window?: unknown }).window = originalWindow
  })

  it('sends purchase event when gtag exists', () => {
    const gtag = vi.fn()
    const originalWindow = (globalThis as unknown as { window?: unknown }).window
    ;(globalThis as unknown as { window?: unknown }).window = { gtag } as unknown as Window

    const order: Order = {
      id: 'ord_2',
      email: 'buyer@example.com',
      status: 'paid',
      subtotal: 20,
      shippingCost: 5.99,
      total: 25.99,
      createdAt: new Date().toISOString(),
      items: [
        {
          id: 'item_1',
          productId: 'prod_1',
          designId: 'des_1',
          size: 'L',
          color: 'Black',
          quantity: 2,
          price: 10,
        },
      ],
    }

    const ok = trackPurchase(order)
    expect(ok).toBe(true)
    expect(gtag).toHaveBeenCalledTimes(1)
    expect(gtag).toHaveBeenCalledWith(
      'event',
      'purchase',
      expect.objectContaining({
        currency: 'USD',
        transaction_id: 'ord_2',
        value: 25.99,
        shipping: 5.99,
      })
    )

    ;(globalThis as unknown as { window?: unknown }).window = originalWindow
  })
})
