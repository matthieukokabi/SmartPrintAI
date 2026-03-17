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
    }
}

const defaultCopy = {
    availableSizesLabel: 'Available Sizes',
    colorsLabel: 'Colors',
    designButtonLabel: 'Design This Product with AI',
    readyToBuyOnlyLabel: 'This product is sold as-is and is not available in AI design mode.',
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const normalized = hex.trim().toLowerCase()
    if (!/^#[0-9a-f]{6}$/i.test(normalized)) {
        return null
    }
    const value = normalized.slice(1)
    const r = Number.parseInt(value.slice(0, 2), 16)
    const g = Number.parseInt(value.slice(2, 4), 16)
    const b = Number.parseInt(value.slice(4, 6), 16)
    return { r, g, b }
}

function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }): { h: number; s: number; l: number } {
    const rn = r / 255
    const gn = g / 255
    const bn = b / 255
    const max = Math.max(rn, gn, bn)
    const min = Math.min(rn, gn, bn)
    const delta = max - min

    let h = 0
    if (delta !== 0) {
        if (max === rn) {
            h = ((gn - bn) / delta + (gn < bn ? 6 : 0)) * 60
        } else if (max === gn) {
            h = ((bn - rn) / delta + 2) * 60
        } else {
            h = ((rn - gn) / delta + 4) * 60
        }
    }

    const l = (max + min) / 2
    const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))
    return { h, s, l }
}

function buildFallbackImageFilter(selectedColorHex: string): string {
    const rgb = hexToRgb(selectedColorHex)
    if (!rgb) {
        return 'none'
    }

    const { h, s, l } = rgbToHsl(rgb)
    const normalizedLightness = l
    const normalizedSaturation = s

    if (normalizedLightness >= 0.92) {
        return 'grayscale(1) brightness(1.22) contrast(0.92)'
    }

    if (normalizedLightness <= 0.12) {
        return 'grayscale(1) brightness(0.45) contrast(1.2)'
    }

    const saturateFactor = Math.max(2.8, Math.min(6.5, 2.6 + normalizedSaturation * 5))
    const brightnessFactor = Math.max(0.75, Math.min(1.06, 0.72 + normalizedLightness * 0.5))
    const contrastFactor = Math.max(0.96, Math.min(1.16, 0.96 + normalizedSaturation * 0.22))

    return `grayscale(1) sepia(1) saturate(${saturateFactor.toFixed(2)}) hue-rotate(${Math.round(h)}deg) brightness(${brightnessFactor.toFixed(2)}) contrast(${contrastFactor.toFixed(2)})`
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
    const imageUrl = selectedColorData?.previewImageUrl || product.imageUrl
    const isFallbackColorPreview = Boolean(!selectedColorData?.previewImageUrl && product.imageUrl)
    const fallbackImageFilter = isFallbackColorPreview ? buildFallbackImageFilter(selectedColorHex) : 'none'
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
                            style={isFallbackColorPreview ? { filter: fallbackImageFilter } : undefined}
                            unoptimized
                            priority
                        />
                        {isFallbackColorPreview ? (
                            <div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                    backgroundColor: selectedColorHex,
                                    opacity: 0.08,
                                    mixBlendMode: 'soft-light',
                                }}
                                aria-hidden="true"
                            />
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
