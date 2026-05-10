'use client'

import Link from 'next/link'
import { ShoppingBag, ArrowLeft } from 'lucide-react'
import { useCart } from '@/store/cart'
import CartItemComponent from '@/components/cart/CartItem'
import CartSummary from '@/components/cart/CartSummary'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import type { LocaleCopy, SupportedLocale } from '@/lib/i18n'

type CartPageClientProps = {
    locale: SupportedLocale
    createPath: string
    copy: LocaleCopy['cart']
}

export default function CartPageClient({ locale, createPath, copy }: CartPageClientProps) {
    const items = useCart((s) => s.items)

    if (items.length === 0) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-24 text-center">
                <div className="mb-8 flex justify-center">
                    <LanguageSwitcher currentLocale={locale} pagePath="/cart" />
                </div>
                <div className="text-6xl mb-6">🛒</div>
                <h1 className="text-2xl font-bold mb-3">{copy.emptyTitle}</h1>
                <p className="text-muted-foreground mb-8">{copy.emptySubtitle}</p>
                <Link
                    href={createPath}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity"
                >
                    <ShoppingBag className="w-4 h-4" /> {copy.startCreatingLabel}
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="mb-5 flex justify-center">
                <LanguageSwitcher currentLocale={locale} pagePath="/cart" />
            </div>
            <div className="flex items-center gap-4 mb-8">
                <Link
                    href={createPath}
                    aria-label="Back to product picker"
                    className="p-2 rounded-lg glass hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <h1 className="text-2xl font-bold">{copy.headingLabel} ({items.length})</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    {items.map((item) => (
                        <CartItemComponent
                            key={item.id}
                            item={item}
                            sizeLabel={copy.sizeLabel}
                            colorLabel={copy.colorLabel}
                        />
                    ))}
                </div>
                <CartSummary
                    copy={{
                        orderSummaryLabel: copy.orderSummaryLabel,
                        subtotalLabel: copy.subtotalLabel,
                        itemsLabel: copy.itemsLabel,
                        shippingLabel: copy.shippingLabel,
                        totalLabel: copy.totalLabel,
                        checkoutLabel: copy.checkoutLabel,
                        checkoutFailedLabel: copy.checkoutFailedLabel,
                        secureCheckoutLabel: copy.secureCheckoutLabel,
                    }}
                />
            </div>
        </div>
    )
}
