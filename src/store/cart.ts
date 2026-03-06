import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
    id: string
    productId: string
    productName: string
    designId: string
    imageUrl: string
    mockupUrl: string
    size: string
    color: string
    quantity: number
    price: number
}

interface CartStore {
    items: CartItem[]
    addItem: (item: CartItem) => void
    removeItem: (id: string) => void
    updateQuantity: (id: string, quantity: number) => void
    clearCart: () => void
    total: () => number
    itemCount: () => number
}

export const useCart = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],

            addItem: (item) => {
                set((state) => {
                    const existing = state.items.find(
                        (i) =>
                            i.productId === item.productId &&
                            i.designId === item.designId &&
                            i.size === item.size &&
                            i.color === item.color
                    )
                    if (existing) {
                        return {
                            items: state.items.map((i) =>
                                i.id === existing.id ? { ...i, quantity: i.quantity + item.quantity } : i
                            ),
                        }
                    }
                    return { items: [...state.items, item] }
                })
            },

            removeItem: (id) =>
                set((state) => ({
                    items: state.items.filter((i) => i.id !== id),
                })),

            updateQuantity: (id, quantity) =>
                set((state) => ({
                    items:
                        quantity <= 0
                            ? state.items.filter((i) => i.id !== id)
                            : state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
                })),

            clearCart: () => set({ items: [] }),

            total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

            itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
        }),
        { name: 'smartprintai-cart' }
    )
)
