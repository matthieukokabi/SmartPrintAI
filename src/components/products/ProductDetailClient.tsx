'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Shirt } from 'lucide-react'
import { resolveColorHexFromName } from '@/lib/product-colors'

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
    canDesignWithAI?: boolean
    copy?: {
        availableSizesLabel: string
        colorsLabel: string
        designButtonLabel: string
        readyToBuyOnlyLabel: string
        fallbackPreviewNote?: string
    }
}

const defaultCopy = {
    availableSizesLabel: 'Available Sizes',
    colorsLabel: 'Colors',
    designButtonLabel: 'Design This Product with AI',
    readyToBuyOnlyLabel: 'This product is sold as-is and is not available in AI design mode.',
    fallbackPreviewNote:
        'Color-specific preview is not available for this item yet. Your selected color will still be used for ordering.',
}

function colorDotStyle(name: string, hex: string) {
    const hasValidHex = /^#[0-9a-f]{6}$/i.test(hex)
    const safeHex = hasValidHex && hex.toLowerCase() !== '#ffffff' ? hex : resolveColorHexFromName(name)
    return { backgroundColor: safeHex }
}

export default function ProductDetailClient({
    product,
    createPath = '/create',
    canDesignWithAI = true,
    copy = defaultCopy,
}: Props) {
    const initialColor = product.colors[0]?.name ?? 'Default'
    const initialSize = product.sizes[0] ?? 'One Size'

    const [selectedColor, setSelectedColor] = useState(initialColor)
    const [selectedSize, setSelectedSize] = useState(initialSize)

    const selectedColorData = useMemo(
        () => product.colors.find((color) => color.name === selectedColor) ?? product.colors[0],
        [product.colors, selectedColor]
    )

    const selectedColorRawHex = selectedColorData?.hex ?? '#FFFFFF'
    const selectedColorHasValidHex = /^#[0-9a-f]{6}$/i.test(selectedColorRawHex)
    const selectedColorHex = selectedColorData
        ? selectedColorHasValidHex && selectedColorRawHex.toLowerCase() !== '#ffffff'
            ? selectedColorRawHex
            : resolveColorHexFromName(selectedColorData.name)
        : '#ffffff'
    const selectedColorPreviewUrl =
        typeof selectedColorData?.previewImageUrl === 'string' && selectedColorData.previewImageUrl.trim().length > 0
            ? selectedColorData.previewImageUrl.trim()
            : null
    const imageUrl = selectedColorPreviewUrl || product.imageUrl
    const isFallbackColorPreview = Boolean(!selectedColorPreviewUrl && product.imageUrl)
    const createHref =
        `${createPath}?productId=${encodeURIComponent(product.id)}` +
        `&color=${encodeURIComponent(selectedColor)}` +
        `&size=${encodeURIComponent(selectedSize)}`

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
                            unoptimized
                            priority
                        />
                        {isFallbackColorPreview ? (
                            <div
                                className="absolute bottom-3 left-3 pointer-events-none rounded-md border border-border bg-background/85 px-2 py-1 text-[11px] leading-tight text-muted-foreground backdrop-blur"
                                style={{
                                    boxShadow: `inset 0 0 0 1px ${selectedColorHex}33`,
                                }}
                            >
                                {copy.fallbackPreviewNote || defaultCopy.fallbackPreviewNote}
                            </div>
                        ) : null}
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
                </div>

                {canDesignWithAI ? (
                    <Link
                        href={createHref}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity w-full justify-center"
                    >
                        {copy.designButtonLabel}
                    </Link>
                ) : (
                    <div className="rounded-xl border border-border bg-card/40 px-4 py-3 text-center text-sm text-muted-foreground">
                        {copy.readyToBuyOnlyLabel}
                    </div>
                )}
            </div>
        </div>
    )
}
