'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Shirt } from 'lucide-react'
import { resolveColorHexFromName } from '@/lib/product-colors'
import { useCart } from '@/store/cart'

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
    cartPath?: string
    canDesignWithAI?: boolean
    isGootenProduct?: boolean
    copy?: {
        availableSizesLabel: string
        colorsLabel: string
        designButtonLabel: string
        readyToBuyOnlyLabel: string
        readyToBuyAddToCartLabel: string
        readyToBuyAddedToCartLabel: string
        readyToBuyGoToCartLabel: string
    }
}

const defaultCopy = {
    availableSizesLabel: 'Available Sizes',
    colorsLabel: 'Colors',
    designButtonLabel: 'Design This Product with AI',
    readyToBuyOnlyLabel: 'This product is sold as-is and is not available in AI design mode.',
    readyToBuyAddToCartLabel: 'Add to Cart',
    readyToBuyAddedToCartLabel: 'Added to Cart',
    readyToBuyGoToCartLabel: 'Go to Cart',
}

function colorDotStyle(name: string, hex: string) {
    const hasValidHex = /^#[0-9a-f]{6}$/i.test(hex)
    const safeHex = hasValidHex && hex.toLowerCase() !== '#ffffff' ? hex : resolveColorHexFromName(name)
    return { backgroundColor: safeHex }
}

export default function ProductDetailClient({
    product,
    createPath = '/create',
    cartPath = '/cart',
    canDesignWithAI = true,
    isGootenProduct = false,
    copy = defaultCopy,
}: Props) {
    const initialColor = product.colors[0]?.name ?? 'Default'
    const initialSize = product.sizes[0] ?? 'One Size'

    const [selectedColor, setSelectedColor] = useState(initialColor)
    const [selectedSize, setSelectedSize] = useState(initialSize)
    const [added, setAdded] = useState(false)
    const addItem = useCart((s) => s.addItem)

    const imageUrl = product.imageUrl || '/images/placeholder-product.png'

    const createHref =
        `${createPath}?productId=${encodeURIComponent(product.id)}` +
        `&color=${encodeURIComponent(selectedColor)}` +
        `&size=${encodeURIComponent(selectedSize)}`

    const handleReadyToBuyAddToCart = () => {
        const readyDesignId = `ready_${product.id}`
        const selectedPreview = imageUrl || product.imageUrl

        addItem({
            id: `${readyDesignId}:${selectedSize}:${selectedColor}`,
            productId: product.id,
            productName: product.name,
            designId: readyDesignId,
            imageUrl: selectedPreview,
            mockupUrl: selectedPreview,
            size: selectedSize,
            color: selectedColor,
            quantity: 1,
            price: product.sellPrice,
        })

        setAdded(true)
        setTimeout(() => setAdded(false), 1400)
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="relative aspect-square rounded-2xl glass flex items-center justify-center overflow-hidden">
                {imageUrl ? (
                    <>
                        <Image
                            src={imageUrl}
                            alt={`${product.name} - ${selectedColor}`}
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-cover"
                            priority
                        />

                    </>
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
                                    <span
                                        className="w-4 h-4 rounded-full border border-white/20"
                                        style={colorDotStyle(color.name, color.hex)}
                                    />
                                    {color.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    {isGootenProduct && (
                        <div className="flex items-start gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
                            <span className="text-blue-400 text-sm mt-0.5">ℹ️</span>
                            <p className="text-xs text-muted-foreground">
                                Color preview is for reference only. Your order will be fulfilled in the exact color you select.
                            </p>
                        </div>
                    )}
                </div>

                {canDesignWithAI && !isGootenProduct ? (
                    <Link
                        href={createHref}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity w-full justify-center"
                    >
                        {copy.designButtonLabel}
                    </Link>
                ) : isGootenProduct ? (
                    <Link
                        href={createHref}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity w-full justify-center"
                    >
                        Order This Product
                    </Link>
                ) : (
                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={handleReadyToBuyAddToCart}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity w-full justify-center"
                        >
                            {added ? copy.readyToBuyAddedToCartLabel : copy.readyToBuyAddToCartLabel}
                        </button>
                        <Link
                            href={cartPath}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border bg-card/40 text-sm text-foreground hover:bg-card/60 transition-colors w-full justify-center"
                        >
                            {copy.readyToBuyGoToCartLabel}
                        </Link>
                        <div className="rounded-xl border border-border bg-card/40 px-4 py-3 text-center text-sm text-muted-foreground">
                            {copy.readyToBuyOnlyLabel}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
