'use client'

import { Shirt, Coffee, Frame, ShoppingBag, type LucideIcon } from 'lucide-react'

interface ProductOption {
    id: string
    name: string
    sellPrice: number
    category: string
}

interface Props {
    products: ProductOption[]
    selectedId: string | null
    onSelect: (id: string) => void
}

const categoryIcons: Record<string, LucideIcon> = {
    apparel: Shirt,
    drinkware: Coffee,
    home: Frame,
    accessories: ShoppingBag,
}

export default function ProductPicker({ products, selectedId, onSelect }: Props) {
    if (!products.length) {
        return (
            <div className="glass rounded-xl p-6 text-center">
                <p className="text-sm text-muted-foreground">Loading products...</p>
            </div>
        )
    }

    return (
        <div>
            <label className="text-sm font-medium text-muted-foreground mb-3 block">Choose a Product</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {products.map((product) => {
                    const Icon = categoryIcons[product.category] || Frame
                    return (
                        <button
                            key={product.id}
                            onClick={() => onSelect(product.id)}
                            className={`p-4 rounded-xl text-left transition-all ${selectedId === product.id
                                    ? 'bg-purple-500/10 border-2 border-purple-500 shadow-lg shadow-purple-500/10'
                                    : 'glass hover:border-purple-500/30'
                                }`}
                        >
                            <Icon className={`w-6 h-6 mb-2 ${selectedId === product.id ? 'text-purple-400' : 'text-muted-foreground'}`} />
                            <p className="text-sm font-medium truncate">{product.name}</p>
                            <p className="text-xs text-purple-400 mt-0.5">${product.sellPrice.toFixed(2)}</p>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
