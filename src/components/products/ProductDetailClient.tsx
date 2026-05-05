'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Shirt, Loader2 } from 'lucide-react'
import { resolveColorHexFromName } from '@/lib/product-colors'
import { useCart } from '@/store/cart'

const PDP_MOCKUP_DEFAULT_RETRY_SEC = 8
const PDP_MOCKUP_RETRY_BUFFER_SEC = 1
const PDP_MOCKUP_MAX_RETRY_SEC = 30
const PDP_MOCKUP_MAX_RETRY_ATTEMPTS = 4

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

    const searchParams = useSearchParams()
    const designId = searchParams.get('designId')

    const [pdpMockupUrl, setPdpMockupUrl] = useState<string | null>(null)
    const [pdpMockupLoading, setPdpMockupLoading] = useState(false)

    useEffect(() => {
        if (!designId || !selectedColor) {
            setPdpMockupUrl(null)
            setPdpMockupLoading(false)
            return
        }

        const controller = new AbortController()
        let cancelled = false
        let retryTimer: ReturnType<typeof setTimeout> | null = null

        async function generate(attempt = 0) {
            let keepLoading = false
            setPdpMockupLoading(true)
            if (attempt === 0) setPdpMockupUrl(null)
            try {
                const res = await fetch('/api/mockup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ designId, productId: product.id, color: selectedColor }),
                    signal: controller.signal,
                })
                const ct = res.headers.get('content-type') || ''
                const data = ct.includes('application/json')
                    ? ((await res.json()) as { mockupUrl?: string; error?: string; retryAfterSec?: number })
                    : null

                if (res.status === 429) {
                    const headerSec = Number(res.headers.get('retry-after') || '')
                    const bodySec = typeof data?.retryAfterSec === 'number' ? data.retryAfterSec : NaN
                    const baseSec = Number.isFinite(headerSec) && headerSec > 0
                        ? headerSec
                        : Number.isFinite(bodySec) && bodySec > 0
                            ? bodySec
                            : PDP_MOCKUP_DEFAULT_RETRY_SEC
                    const sec = Math.min(
                        Math.max(Math.ceil(baseSec) + PDP_MOCKUP_RETRY_BUFFER_SEC, 1),
                        PDP_MOCKUP_MAX_RETRY_SEC,
                    )
                    if (attempt < PDP_MOCKUP_MAX_RETRY_ATTEMPTS && !cancelled) {
                        keepLoading = true
                        retryTimer = setTimeout(() => void generate(attempt + 1), sec * 1000)
                        return
                    }
                    return
                }

                if (!res.ok || !data?.mockupUrl) return
                if (!cancelled) setPdpMockupUrl(data.mockupUrl)
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') return
            } finally {
                if (!cancelled && !keepLoading) setPdpMockupLoading(false)
            }
        }

        void generate()
        return () => {
            cancelled = true
            controller.abort()
            if (retryTimer) clearTimeout(retryTimer)
        }
    }, [designId, product.id, selectedColor])

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
                {pdpMockupUrl ? (
                    <Image
                        src={pdpMockupUrl}
                        alt={`${product.name} mockup`}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-contain p-2"
                        unoptimized
                        priority
                    />
                ) : imageUrl ? (
                    <>
                        <Image
                            src={imageUrl}
                            alt={`${product.name} - ${selectedColor}`}
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-cover"
                            priority
                        />
                        {pdpMockupLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                                <div className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm text-white">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Generating preview…
                                </div>
                            </div>
                        )}
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
