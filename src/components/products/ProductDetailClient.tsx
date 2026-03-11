'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Shirt } from 'lucide-react'

type ProductColor = {
    name: string
    hex: string
    printfulVariantId: number
    previewImageUrl?: string | null
}

type ProductDetail = {
    id: string
    name: string
    description: string
    category: string
    sellPrice: number
    sizes: string[]
    imageUrl: string
    colors: ProductColor[]
}

type Props = {
    product: ProductDetail
    createPath?: string
    copy?: {
        availableSizesLabel: string
        colorsLabel: string
        designButtonLabel: string
    }
}

const defaultCopy = {
    availableSizesLabel: 'Available Sizes',
    colorsLabel: 'Colors',
    designButtonLabel: 'Design This Product with AI',
}

function colorDotStyle(hex: string) {
    const safeHex = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#ffffff'
    return { backgroundColor: safeHex }
}

export default function ProductDetailClient({ product, createPath = '/create', copy = defaultCopy }: Props) {
    const initialColor = product.colors[0]?.name ?? 'Default'
    const initialSize = product.sizes[0] ?? 'One Size'

    const [selectedColor, setSelectedColor] = useState(initialColor)
    const [selectedSize, setSelectedSize] = useState(initialSize)

    const selectedColorData = useMemo(
        () => product.colors.find((color) => color.name === selectedColor) ?? product.colors[0],
        [product.colors, selectedColor]
    )

    const imageUrl = selectedColorData?.previewImageUrl || product.imageUrl
    const createHref =
        `${createPath}?productId=${encodeURIComponent(product.id)}` +
        `&color=${encodeURIComponent(selectedColor)}` +
        `&size=${encodeURIComponent(selectedSize)}`

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="relative aspect-square rounded-2xl glass flex items-center justify-center overflow-hidden">
                {imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt={`${product.name} - ${selectedColor}`}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover"
                        unoptimized
                        priority
                    />
                ) : (
                    <Shirt className="w-32 h-32 text-muted-foreground/30" />
                )}
            </div>

            <div>
                <p className="text-xs text-purple-400 font-medium uppercase mb-2">{product.category}</p>
                <h1 className="text-3xl font-bold mb-3">{product.name}</h1>
                <p className="text-2xl text-gradient font-bold mb-4">${product.sellPrice.toFixed(2)}</p>
                <p className="text-muted-foreground text-sm mb-6">{product.description}</p>

                <div className="space-y-4 mb-8">
                    <div>
                        <label className="text-sm font-medium mb-2 block">{copy.availableSizesLabel}</label>
                        <div className="flex flex-wrap gap-2">
                            {product.sizes.map((size) => (
                                <button
                                    type="button"
                                    key={size}
                                    onClick={() => setSelectedSize(size)}
                                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${selectedSize === size
                                        ? 'bg-purple-600 text-white border border-purple-500'
                                        : 'glass text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-2 block">{copy.colorsLabel}</label>
                        <div className="flex flex-wrap gap-2">
                            {product.colors.map((color) => (
                                <button
                                    type="button"
                                    key={color.name}
                                    onClick={() => setSelectedColor(color.name)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${selectedColor === color.name
                                        ? 'bg-purple-500/15 border border-purple-500 text-white'
                                        : 'glass text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    <span className="w-4 h-4 rounded-full border border-white/20" style={colorDotStyle(color.hex)} />
                                    {color.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <Link
                    href={createHref}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity w-full justify-center"
                >
                    {copy.designButtonLabel}
                </Link>
            </div>
        </div>
    )
}
