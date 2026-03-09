import type { Order } from '@/types'

declare global {
    interface Window {
        gtag?: (...args: unknown[]) => void
    }
}

function toNumber(value: unknown): number {
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n)) {
        return 0
    }
    return Math.round(n * 100) / 100
}

export function trackPurchase(order: Order): boolean {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
        return false
    }

    const items = (order.items || []).map((item) => ({
        item_id: item.productId,
        item_name: item.productId,
        item_variant: `${item.size} / ${item.color}`,
        price: toNumber(item.price),
        quantity: item.quantity,
    }))

    window.gtag('event', 'purchase', {
        currency: 'USD',
        transaction_id: order.id,
        value: toNumber(order.total),
        shipping: toNumber(order.shippingCost),
        items,
    })

    return true
}
