'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import PromptInput from '@/components/create/PromptInput'
import StyleSelector from '@/components/create/StyleSelector'
import GeneratedImage from '@/components/create/GeneratedImage'
import ProductPicker from '@/components/create/ProductPicker'
import MockupPreview from '@/components/create/MockupPreview'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import { useCart } from '@/store/cart'
import type { DesignStyle, Product } from '@/types'
import type { LocaleCopy, SupportedLocale } from '@/lib/i18n'
import { ShoppingCart, Check } from 'lucide-react'

type CreatePageClientProps = {
    locale: SupportedLocale
    copy: LocaleCopy['create']
}

function colorDotStyle(hex: string) {
    const safeHex = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#ffffff'
    return { backgroundColor: safeHex }
}

const MAX_REFERENCE_IMAGE_BYTES = 8 * 1024 * 1024
const SUPPORTED_REFERENCE_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])

export default function CreatePageClient({ locale, copy }: CreatePageClientProps) {
    const searchParams = useSearchParams()
    const initialPrompt = searchParams.get('prompt') || ''
    const initialProductId = searchParams.get('productId')
    const initialColor = searchParams.get('color') || ''
    const initialSize = searchParams.get('size') || ''

    const [style, setStyle] = useState<DesignStyle>('artistic')
    const [isGenerating, setIsGenerating] = useState(false)
    const [designId, setDesignId] = useState<string | null>(null)
    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const [currentPrompt, setCurrentPrompt] = useState(initialPrompt)
    const [referenceImageDataUrl, setReferenceImageDataUrl] = useState<string | null>(null)
    const [referenceImageName, setReferenceImageName] = useState<string | null>(null)
    const [referenceImageError, setReferenceImageError] = useState<string | null>(null)

    const [products, setProducts] = useState<Product[]>([])
    const [selectedProduct, setSelectedProduct] = useState<string | null>(initialProductId)
    const [mockupUrl, setMockupUrl] = useState<string | null>(null)
    const [isMockupLoading, setIsMockupLoading] = useState(false)

    const [selectedSize, setSelectedSize] = useState(initialSize)
    const [selectedColor, setSelectedColor] = useState(initialColor)
    const [added, setAdded] = useState(false)

    const addItem = useCart((s) => s.addItem)

    useEffect(() => {
        fetch('/api/products')
            .then((r) => r.json())
            .then((data: Product[]) => setProducts(data))
            .catch(console.error)
    }, [])

    useEffect(() => {
        if (!products.length || !selectedProduct) return
        const exists = products.some((p) => p.id === selectedProduct)
        if (!exists) {
            setSelectedProduct(null)
        }
    }, [products, selectedProduct])

    const product = products.find((p) => p.id === selectedProduct)

    useEffect(() => {
        if (!product) return

        const defaultSize = product.sizes[0] || 'One Size'
        const defaultColor = product.colors[0]?.name || 'Default'

        if (!product.sizes.includes(selectedSize)) {
            setSelectedSize(defaultSize)
        }

        const matchingColor = product.colors.find(
            (color) => color.name.toLowerCase() === selectedColor.toLowerCase()
        )
        if (!matchingColor) {
            setSelectedColor(defaultColor)
        } else if (matchingColor.name !== selectedColor) {
            setSelectedColor(matchingColor.name)
        }
    }, [product, selectedColor, selectedSize])

    useEffect(() => {
        if (!designId || !selectedProduct || !selectedColor) return

        const controller = new AbortController()
        let cancelled = false

        async function generateMockup() {
            setIsMockupLoading(true)
            setMockupUrl(null)
            try {
                const res = await fetch('/api/mockup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ designId, productId: selectedProduct, color: selectedColor }),
                    signal: controller.signal,
                })
                const data = await res.json()
                if (!cancelled && data.mockupUrl) {
                    setMockupUrl(data.mockupUrl)
                }
            } catch (err) {
                if (!cancelled) {
                    console.error(err)
                }
            } finally {
                if (!cancelled) {
                    setIsMockupLoading(false)
                }
            }
        }

        generateMockup()
        return () => {
            cancelled = true
            controller.abort()
        }
    }, [designId, selectedProduct, selectedColor])

    const handleGenerate = async (prompt: string) => {
        setIsGenerating(true)
        setImageUrl(null)
        setDesignId(null)
        setMockupUrl(null)
        setCurrentPrompt(prompt)
        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    style,
                    sourceImageDataUrl: referenceImageDataUrl ?? undefined,
                }),
            })
            const data = await res.json()
            if (data.imageUrl) {
                setImageUrl(data.imageUrl)
                setDesignId(data.designId)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setIsGenerating(false)
        }
    }

    const handleProductSelect = (productId: string) => {
        setSelectedProduct(productId)
    }

    const handleReferenceImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) {
            return
        }

        if (!SUPPORTED_REFERENCE_IMAGE_TYPES.has(file.type)) {
            setReferenceImageError('Use PNG, JPG, or WEBP only.')
            setReferenceImageDataUrl(null)
            setReferenceImageName(null)
            event.target.value = ''
            return
        }

        if (file.size > MAX_REFERENCE_IMAGE_BYTES) {
            setReferenceImageError('Image is too large. Max size is 8MB.')
            setReferenceImageDataUrl(null)
            setReferenceImageName(null)
            event.target.value = ''
            return
        }

        const reader = new FileReader()
        reader.onload = () => {
            if (typeof reader.result !== 'string') {
                setReferenceImageError('Could not read image. Please try another file.')
                return
            }

            setReferenceImageDataUrl(reader.result)
            setReferenceImageName(file.name)
            setReferenceImageError(null)
            event.target.value = ''
        }
        reader.onerror = () => {
            setReferenceImageError('Could not read image. Please try another file.')
            setReferenceImageDataUrl(null)
            setReferenceImageName(null)
            event.target.value = ''
        }
        reader.readAsDataURL(file)
    }

    const clearReferenceImage = () => {
        setReferenceImageDataUrl(null)
        setReferenceImageName(null)
        setReferenceImageError(null)
    }

    const handleAddToCart = () => {
        if (!designId || !selectedProduct) return
        const selectedProductData = products.find((p) => p.id === selectedProduct)
        if (!selectedProductData) return

        const sizeForCart = selectedProductData.sizes.includes(selectedSize)
            ? selectedSize
            : (selectedProductData.sizes[0] || 'One Size')
        const colorForCart = selectedProductData.colors.find(
            (color) => color.name.toLowerCase() === selectedColor.toLowerCase()
        )?.name || selectedProductData.colors[0]?.name || 'Default'

        addItem({
            id: `${designId}-${selectedProduct}-${sizeForCart}-${colorForCart}`,
            productId: selectedProduct,
            productName: selectedProductData.name,
            designId,
            imageUrl: imageUrl || '',
            mockupUrl: mockupUrl || imageUrl || '',
            size: sizeForCart,
            color: colorForCart,
            quantity: 1,
            price: selectedProductData.sellPrice,
        })
        setAdded(true)
        setTimeout(() => setAdded(false), 2000)
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="mb-5 flex justify-center">
                <LanguageSwitcher currentLocale={locale} pagePath="/create" />
            </div>

            <div className="text-center mb-12">
                <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                    {copy.titleLead} <span className="text-gradient">{copy.titleAccent}</span>
                </h1>
                <p className="text-muted-foreground">{copy.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 space-y-3">
                        <div>
                            <p className="text-sm font-semibold text-foreground">Reference Photo (optional)</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Upload your own image and AI will transform it using your prompt.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <label className="inline-flex items-center px-4 py-2 rounded-xl glass text-sm cursor-pointer hover:text-foreground transition-colors">
                                Upload Photo
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg,image/webp"
                                    className="hidden"
                                    onChange={handleReferenceImageUpload}
                                />
                            </label>
                            {referenceImageDataUrl && (
                                <button
                                    type="button"
                                    onClick={clearReferenceImage}
                                    className="inline-flex items-center px-4 py-2 rounded-xl border border-white/10 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                        {referenceImageName && (
                            <p className="text-xs text-muted-foreground truncate">{referenceImageName}</p>
                        )}
                        {referenceImageError && (
                            <p className="text-xs text-red-300">{referenceImageError}</p>
                        )}
                        {referenceImageDataUrl && (
                            <div className="relative h-40 w-full max-w-sm overflow-hidden rounded-xl border border-white/10 bg-black/20">
                                <Image
                                    src={referenceImageDataUrl}
                                    alt="Uploaded reference image"
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            </div>
                        )}
                    </div>

                    <PromptInput
                        onGenerate={handleGenerate}
                        isLoading={isGenerating}
                        initialPrompt={initialPrompt}
                        copy={{
                            placeholder: copy.promptPlaceholder,
                            generatingLabel: copy.promptGeneratingLabel,
                            generateLabel: copy.promptGenerateLabel,
                            tip: copy.promptTip,
                        }}
                    />
                    <StyleSelector selected={style} onSelect={setStyle} label={copy.styleLabel} />

                    {imageUrl && (
                        <>
                            <ProductPicker
                                products={products}
                                selectedId={selectedProduct}
                                onSelect={handleProductSelect}
                                chooseLabel={copy.chooseProductLabel}
                                loadingLabel={copy.loadingProductsLabel}
                            />
                            {selectedProduct && product && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground mb-2 block">{copy.sizeLabel}</label>
                                        <div className="flex flex-wrap gap-2">
                                            {product.sizes.map((size: string) => (
                                                <button
                                                    key={size}
                                                    onClick={() => setSelectedSize(size)}
                                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedSize === size
                                                        ? 'bg-purple-600 text-white'
                                                        : 'glass text-muted-foreground hover:text-foreground'
                                                        }`}
                                                >
                                                    {size}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground mb-2 block">{copy.colorLabel}</label>
                                        <div className="flex flex-wrap gap-2">
                                            {product.colors.map((color) => (
                                                <button
                                                    key={color.name}
                                                    onClick={() => setSelectedColor(color.name)}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedColor === color.name
                                                        ? 'bg-purple-600 text-white border border-purple-500'
                                                        : 'glass text-muted-foreground hover:text-foreground'
                                                        }`}
                                                >
                                                    <span className="w-4 h-4 rounded-full border border-white/20" style={colorDotStyle(color.hex)} />
                                                    {color.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleAddToCart}
                                        disabled={added}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition-all"
                                    >
                                        {added ? (
                                            <>
                                                <Check className="w-4 h-4" /> {copy.addedToCartLabel}
                                            </>
                                        ) : (
                                            <>
                                                <ShoppingCart className="w-4 h-4" /> {copy.addToCartLabel} - ${product.sellPrice.toFixed(2)}
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="space-y-6 lg:sticky lg:top-24 self-start">
                    <GeneratedImage
                        imageUrl={imageUrl}
                        isLoading={isGenerating}
                        onRegenerate={() => currentPrompt && handleGenerate(currentPrompt)}
                        copy={{
                            creatingLabel: copy.creatingDesignLabel,
                            creatingSubLabel: copy.creatingDesignSubLabel,
                            placeholderLabel: copy.generatedPlaceholderLabel,
                            regenerateLabel: copy.regenerateLabel,
                        }}
                    />
                    {imageUrl && selectedProduct && (
                        <MockupPreview
                            mockupUrl={mockupUrl}
                            isLoading={isMockupLoading}
                            copy={{
                                generatingLabel: copy.generatingMockupLabel,
                                placeholderLabel: copy.mockupPlaceholderLabel,
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
