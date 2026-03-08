'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Package, ArrowRight } from 'lucide-react'
import { useCart } from '@/store/cart'
import type { Order } from '@/types'
import OrderStatusTimeline from '@/components/order/OrderStatusTimeline'

function SuccessContent() {
    const searchParams = useSearchParams()
    const sessionId = searchParams.get('session_id')
    const clearCart = useCart((s) => s.clearCart)

    const [isLoading, setIsLoading] = useState(true)
    const [order, setOrder] = useState<Order | null>(null)

    const orderLabel = useMemo(() => {
        if (!order?.id) return null
        return `#${order.id.slice(-8).toUpperCase()}`
    }, [order?.id])

    useEffect(() => {
        let cancelled = false

        async function loadOrder() {
            if (!sessionId) {
                setIsLoading(false)
                return
            }

            try {
                const res = await fetch(`/api/orders?session_id=${encodeURIComponent(sessionId)}`)
                if (!res.ok) {
                    setIsLoading(false)
                    return
                }

                const data = (await res.json()) as Order
                if (cancelled) return
                setOrder(data)
                clearCart()
            } catch {
                // Keep fallback success messaging when order fetch fails.
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }

        loadOrder()
        return () => {
            cancelled = true
        }
    }, [sessionId, clearCart])

    return (
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
            <div className="glass rounded-3xl p-12">
                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-green-400" />
                </div>

                <h1 className="text-3xl font-bold mb-3">Order Confirmed!</h1>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    Thank you for your order! Your custom product is being produced and will ship within 3-7 business days.
                </p>

                <div className="glass rounded-xl p-6 mb-8 text-left space-y-5">
                    <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-purple-400" />
                        <span className="font-medium">Order progress</span>
                    </div>

                    {isLoading ? (
                        <p className="text-sm text-muted-foreground">Loading order details...</p>
                    ) : order ? (
                        <>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <p>
                                    Order: <span className="text-foreground font-medium">{orderLabel}</span>
                                </p>
                                <p>
                                    Total: <span className="text-foreground font-medium">${order.total.toFixed(2)}</span>
                                </p>
                            </div>

                            <OrderStatusTimeline status={order.status} />

                            <Link
                                href={`/orders/${order.id}`}
                                className="inline-flex items-center gap-2 text-sm text-purple-300 hover:text-purple-200"
                            >
                                View full order tracking
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </>
                    ) : (
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <span className="text-purple-400 font-bold">1.</span>
                                Your design is sent to our production facility
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-purple-400 font-bold">2.</span>
                                Your product is printed with premium quality
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-purple-400 font-bold">3.</span>
                                You&apos;ll receive a tracking email when it ships
                            </li>
                        </ul>
                    )}
                </div>

                <Link
                    href="/create"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity"
                >
                    Create Another Design
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    )
}

export default function SuccessPage() {
    return (
        <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-24" />}>
            <SuccessContent />
        </Suspense>
    )
}
