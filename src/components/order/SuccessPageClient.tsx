'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { CheckCircle, Package, ArrowRight } from 'lucide-react'
import { useCart } from '@/store/cart'
import type { LocaleCopy, SupportedLocale } from '@/lib/i18n'
import type { Order } from '@/types'
import OrderStatusTimeline from '@/components/order/OrderStatusTimeline'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import { trackPurchase } from '@/lib/analytics'

type SuccessPageClientProps = {
    locale: SupportedLocale
    copy: LocaleCopy['success']
    createPath: string
}

export default function SuccessPageClient({ locale, copy, createPath }: SuccessPageClientProps) {
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

    useEffect(() => {
        if (!order) return

        const key = `ga4_purchase_tracked:${order.id}`
        if (typeof window !== 'undefined' && window.sessionStorage.getItem(key) === '1') {
            return
        }

        const tracked = trackPurchase(order)
        if (tracked && typeof window !== 'undefined') {
            window.sessionStorage.setItem(key, '1')
        }
    }, [order])

    return (
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
            <div className="mb-8 flex justify-center">
                <LanguageSwitcher currentLocale={locale} pagePath="/success" />
            </div>
            <div className="glass rounded-3xl p-12">
                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-green-400" />
                </div>

                <h1 className="text-3xl font-bold mb-3">{copy.heading}</h1>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">{copy.subtitle}</p>

                <div className="glass rounded-xl p-6 mb-8 text-left space-y-5">
                    <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-purple-400" />
                        <span className="font-medium">{copy.progressLabel}</span>
                    </div>

                    {isLoading ? (
                        <p className="text-sm text-muted-foreground">{copy.loadingOrderLabel}</p>
                    ) : order ? (
                        <>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <p>
                                    {copy.orderLabel}: <span className="text-foreground font-medium">{orderLabel}</span>
                                </p>
                                <p>
                                    {copy.totalLabel}: <span className="text-foreground font-medium">${order.total.toFixed(2)}</span>
                                </p>
                            </div>

                            <OrderStatusTimeline status={order.status} copy={copy.timeline} />

                            <Link
                                href={`/orders/${order.id}`}
                                className="inline-flex items-center gap-2 text-sm text-purple-300 hover:text-purple-200"
                            >
                                {copy.viewTrackingLabel}
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </>
                    ) : (
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <span className="text-purple-400 font-bold">1.</span>
                                {copy.fallbackStepOne}
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-purple-400 font-bold">2.</span>
                                {copy.fallbackStepTwo}
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-purple-400 font-bold">3.</span>
                                {copy.fallbackStepThree}
                            </li>
                        </ul>
                    )}
                </div>

                <Link
                    href={createPath}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity"
                >
                    {copy.createAnotherLabel}
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    )
}
