'use client'

import { useCart } from '@/store/cart'
import CartItemComponent from '@/components/cart/CartItem'
import CartSummary from '@/components/cart/CartSummary'
import Link from 'next/link'
import { ShoppingBag, ArrowLeft } from 'lucide-react'

export default function CartPage() {
    const items = useCart((s) => s.items)

    if (items.length === 0) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-24 text-center">
                <div className="text-6xl mb-6">🛒</div>
                <h1 className="text-2xl font-bold mb-3">Your cart is empty</h1>
                <p className="text-muted-foreground mb-8">Create a custom design and add it to your cart</p>
                <Link
                    href="/create"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity"
                >
                    <ShoppingBag className="w-4 h-4" /> Start Creating
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/create" className="p-2 rounded-lg glass hover:bg-white/10 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <h1 className="text-2xl font-bold">Shopping Cart ({items.length})</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    {items.map((item) => (
                        <CartItemComponent key={item.id} item={item} />
                    ))}
                </div>
                <CartSummary />
            </div>
        </div>
    )
}
