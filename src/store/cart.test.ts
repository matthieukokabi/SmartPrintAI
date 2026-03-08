import { beforeEach, describe, expect, it } from 'vitest'
import { type CartItem, useCart } from './cart'

const baseItem: CartItem = {
  id: 'item-1',
  productId: 'prod-1',
  productName: 'Test Tee',
  designId: 'design-1',
  imageUrl: 'https://example.com/design.png',
  mockupUrl: 'https://example.com/mockup.png',
  size: 'M',
  color: 'Black',
  quantity: 1,
  price: 29.99,
}

const makeItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  ...baseItem,
  ...overrides,
})

describe('useCart store', () => {
  beforeEach(() => {
    localStorage.removeItem('smartprintai-cart')
    useCart.setState({ items: [] })
  })

  it('adds a new item to the cart', () => {
    useCart.getState().addItem(makeItem())

    const { items, itemCount, total } = useCart.getState()
    expect(items).toHaveLength(1)
    expect(itemCount()).toBe(1)
    expect(total()).toBeCloseTo(29.99)
  })

  it('merges quantities for the same product/design/variant combination', () => {
    useCart.getState().addItem(makeItem({ id: 'item-a', quantity: 1 }))
    useCart.getState().addItem(makeItem({ id: 'item-b', quantity: 2 }))

    const { items, itemCount } = useCart.getState()
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('item-a')
    expect(items[0].quantity).toBe(3)
    expect(itemCount()).toBe(3)
  })

  it('updates quantity and removes item when quantity is zero', () => {
    useCart.getState().addItem(makeItem())
    useCart.getState().updateQuantity('item-1', 4)
    expect(useCart.getState().items[0].quantity).toBe(4)

    useCart.getState().updateQuantity('item-1', 0)
    expect(useCart.getState().items).toHaveLength(0)
  })

  it('removes and clears items correctly', () => {
    useCart.getState().addItem(makeItem({ id: 'item-1' }))
    useCart.getState().addItem(
      makeItem({
        id: 'item-2',
        productId: 'prod-2',
        designId: 'design-2',
        size: 'L',
        color: 'White',
      })
    )

    useCart.getState().removeItem('item-1')
    expect(useCart.getState().items).toHaveLength(1)

    useCart.getState().clearCart()
    expect(useCart.getState().items).toHaveLength(0)
  })
})
