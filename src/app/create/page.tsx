'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import PromptInput from '@/components/create/PromptInput'
import StyleSelector from '@/components/create/StyleSelector'
import GeneratedImage from '@/components/create/GeneratedImage'
import ProductPicker from '@/components/create/ProductPicker'
import MockupPreview from '@/components/create/MockupPreview'
import { useCart } from '@/store/cart'
import type { DesignStyle, Product } from '@/types'
import { ShoppingCart, Check } from 'lucide-react'

function CreatePageContent() {
    const searchParams = useSearchParams()
    const initialPrompt = searchParams.get('prompt') || ''

    const [style, setStyle] = useState<DesignStyle>('artistic')
    const [isGenerating, setIsGenerating] = useState(false)
    const [designId, setDesignId] = useState<string | null>(null)
    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const [currentPrompt, setCurrentPrompt] = useState(initialPrompt)

    const [products, setProducts] = useState<Product[]>([])
    const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
    const [mockupUrl, setMockupUrl] = useState<string | null>(null)
    const [isMockupLoading, setIsMockupLoading] = useState(false)

    const [selectedSize, setSelectedSize] = useState('M')
    const selectedColor = 'White'
    const [added, setAdded] = useState(false)

    const addItem = useCart((s) => s.addItem)

    useEffect(() => {
        fetch('/api/products')
            .then((r) => r.json())
            .then((data: Product[]) => setProducts(data))
            .catch(console.error)
    }, [])

    const handleGenerate = async (prompt: string) => {
        setIsGenerating(true)
        setImageUrl(null)
        setDesignId(null)
        setMockupUrl(null)
        setSelectedProduct(null)
        setCurrentPrompt(prompt)
        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, style }),
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

    const handleProductSelect = async (productId: string) => {
        setSelectedProduct(productId)
        if (!designId) return
        setIsMockupLoading(true)
        setMockupUrl(null)
        try {
            const res = await fetch('/api/mockup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ designId, productId, color: selectedColor }),
            })
            const data = await res.json()
            if (data.mockupUrl) setMockupUrl(data.mockupUrl)
        } catch (err) {
            console.error(err)
        } finally {
            setIsMockupLoading(false)
        }
    }

    const handleAddToCart = () => {
        if (!designId || !selectedProduct) return
        const product = products.find((p) => p.id === selectedProduct)
        if (!product) return
        addItem({
            id: `${designId}-${selectedProduct}-${selectedSize}-${selectedColor}`,
            productId: selectedProduct,
            productName: product.name,
            designId,
            imageUrl: imageUrl || '',
            mockupUrl: mockupUrl || imageUrl || '',
            size: selectedSize,
            color: selectedColor,
            quantity: 1,
            price: product.sellPrice,
        })
        setAdded(true)
        setTimeout(() => setAdded(false), 2000)
    }

    const product = products.find((p) => p.id === selectedProduct)

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="text-center mb-12">
                <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                    Create Your <span className="text-gradient">Design</span>
                </h1>
                <p className="text-muted-foreground">Describe it, pick a product, add to cart</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left column: input + controls */}
                <div className="space-y-8">
                    <PromptInput onGenerate={handleGenerate} isLoading={isGenerating} initialPrompt={initialPrompt} />
                    <StyleSelector selected={style} onSelect={setStyle} />

                    {imageUrl && (
                        <>
                            <ProductPicker products={products} selectedId={selectedProduct} onSelect={handleProductSelect} />
                            {selectedProduct && product && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground mb-2 block">Size</label>
                                        <div className="flex flex-wrap gap-2">
                                            {product.sizes.map((size: string) => (
                                                <button
                                                    key={size}
                                                    onClick={() => setSelectedSize(size)}
                                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedSize === size ? 'bg-purple-600 text-white' : 'glass text-muted-foreground hover:text-foreground'
                                                        }`}
                                                >
                                                    {size}
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
                                                <Check className="w-4 h-4" /> Added to Cart!
                                            </>
                                        ) : (
                                            <>
                                                <ShoppingCart className="w-4 h-4" /> Add to Cart — ${product.sellPrice.toFixed(2)}
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Right column: preview */}
                <div className="space-y-6 lg:sticky lg:top-24 self-start">
                    <GeneratedImage imageUrl={imageUrl} isLoading={isGenerating} onRegenerate={() => currentPrompt && handleGenerate(currentPrompt)} />
                    {imageUrl && selectedProduct && (
                        <MockupPreview mockupUrl={mockupUrl} isLoading={isMockupLoading} />
                    )}
                </div>
            </div>
        </div>
    )
}

export default function CreatePage() {
    return (
        <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-12" />}>
            <CreatePageContent />
        </Suspense>
    )
}
