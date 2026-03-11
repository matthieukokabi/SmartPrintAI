'use client'

import { Minus, Plus, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { useCart, type CartItem as CartItemType } from '@/store/cart'

type CartItemProps = {
    item: CartItemType
    sizeLabel: string
    colorLabel: string
}

export default function CartItem({ item, sizeLabel, colorLabel }: CartItemProps) {
    const { removeItem, updateQuantity } = useCart()

    return (
        <div className="glass rounded-xl p-4 flex gap-4">
            <div className="w-24 h-24 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 relative">
                <Image
                    src={item.mockupUrl || item.imageUrl}
                    alt={item.productName}
                    fill
                    className="object-contain"
                    unoptimized
                />
            </div>

            <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{item.productName}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {sizeLabel}: {item.size} · {colorLabel}: {item.color}
                </p>
                <p className="text-sm text-purple-400 font-medium mt-1">
                    ${item.price.toFixed(2)}
                </p>

                <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-1 glass rounded-lg">
                        <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1.5 hover:bg-white/5 rounded-l-lg transition-colors"
                        >
                            <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-3 text-sm font-medium">{item.quantity}</span>
                        <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1.5 hover:bg-white/5 rounded-r-lg transition-colors"
                        >
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>
                    <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="text-right">
                <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
            </div>
        </div>
    )
}
