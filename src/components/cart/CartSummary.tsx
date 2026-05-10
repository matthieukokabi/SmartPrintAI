'use client'

import { useState } from 'react'
import { useCart } from '@/store/cart'
import { Loader2, ShieldCheck } from 'lucide-react'

type CartSummaryProps = {
    copy: {
        orderSummaryLabel: string
        subtotalLabel: string
        itemsLabel: string
        shippingLabel: string
        totalLabel: string
        checkoutLabel: string
        checkoutFailedLabel: string
        secureCheckoutLabel: string
    }
}

export default function CartSummary({ copy }: CartSummaryProps) {
    const { items, total } = useCart()
    const [isLoading, setIsLoading] = useState(false)

    const subtotal = total()
    const shipping = 5.99
    const grandTotal = subtotal + shipping

    const handleCheckout = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: items.map((i) => ({
                        productId: i.productId,
                        designId: i.designId,
                        size: i.size,
                        color: i.color,
                        quantity: i.quantity,
                    })),
                }),
            })
            const data = await res.json().catch(() => null)
            if (!res.ok || !data?.url) {
                throw new Error(typeof data?.error === 'string' ? data.error : copy.checkoutFailedLabel)
            }

            window.location.href = data.url
        } catch (error) {
            const errorMessage =
                error instanceof Error && error.message.trim().length > 0
                    ? error.message
                    : copy.checkoutFailedLabel
            alert(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="glass rounded-2xl p-6 sticky top-24">
            <h2 className="text-lg font-bold mb-4">{copy.orderSummaryLabel}</h2>

            <div className="space-y-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                    <span>{copy.subtotalLabel} ({items.length} {copy.itemsLabel})</span>
                    <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                    <span>{copy.shippingLabel}</span>
                    <span>${shipping.toFixed(2)}</span>
                </div>
                <div className="border-t border-white/10 pt-3 flex justify-between font-bold text-lg">
                    <span>{copy.totalLabel}</span>
                    <span className="text-gradient">${grandTotal.toFixed(2)}</span>
                </div>
            </div>

            <button
                onClick={handleCheckout}
                disabled={isLoading || items.length === 0}
                className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    copy.checkoutLabel
                )}
            </button>

            <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5" />
                {copy.secureCheckoutLabel}
            </div>
        </div>
    )
}
