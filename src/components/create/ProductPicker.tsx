'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Shirt, Coffee, Frame, ShoppingBag, type LucideIcon } from 'lucide-react'

interface ProductOption {
    id: string
    name: string
    sellPrice: number
    category: string
    imageUrl: string
}

interface Props {
    products: ProductOption[]
    selectedId: string | null
    onSelect: (id: string) => void
    chooseLabel: string
    loadingLabel: string
}

const categoryIcons: Record<string, LucideIcon> = {
    apparel: Shirt,
    drinkware: Coffee,
    home: Frame,
    accessories: ShoppingBag,
}

export default function ProductPicker({ products, selectedId, onSelect, chooseLabel, loadingLabel }: Props) {
    const [brokenImageById, setBrokenImageById] = useState<Record<string, true>>({})

    if (!products.length) {
        return (
            <div className="glass rounded-xl p-6 text-center">
                <p className="text-sm text-muted-foreground">{loadingLabel}</p>
            </div>
        )
    }

    return (
        <div>
            <label className="text-sm font-medium text-muted-foreground mb-3 block">{chooseLabel}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {products.map((product) => {
                    const Icon = categoryIcons[product.category] || Frame
                    const hasImage = Boolean(product.imageUrl) && !brokenImageById[product.id]

                    return (
                        <button
                            key={product.id}
                            onClick={() => onSelect(product.id)}
                            className={`rounded-xl p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#26d4b8]/45 ${selectedId === product.id
                                    ? 'border-2 border-[#2f6cf3] bg-[#2f6cf3]/10 shadow-lg shadow-[#26d4b8]/15'
                                    : 'glass hover:border-[#2f6cf3]/30'
                                }`}
                        >
                            <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-white/5 mb-3">
                                {hasImage ? (
                                    <Image
                                        src={product.imageUrl}
                                        alt={product.name}
                                        fill
                                        sizes="(max-width: 640px) 45vw, 180px"
                                        className="object-cover"
                                        unoptimized
                                        onError={() => {
                                            setBrokenImageById((prev) => ({ ...prev, [product.id]: true }))
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Icon className={`w-6 h-6 ${selectedId === product.id ? 'text-[#26d4b8]' : 'text-muted-foreground'}`} />
                                    </div>
                                )}
                            </div>
                            <p className="text-sm font-medium truncate">{product.name}</p>
                            <p className="mt-0.5 text-xs text-[#2f6cf3]">${product.sellPrice.toFixed(2)}</p>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
