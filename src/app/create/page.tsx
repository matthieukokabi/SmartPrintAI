'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import Image from 'next/image'
import { useCart } from '@/store/cart'

interface ApiProductColor {
    name: string
    hex: string
    printfulVariantId: number
    previewImageUrl?: string | null
}

interface ApiProduct {
    id: string
    name: string
    printfulId: string
    description: string
    category: string
    basePrice: number
    sellPrice: number
    sizes: string[]
    colors: ApiProductColor[]
    imageUrl: string
    active: boolean
}

const STYLES = [
    { id: 'artistic', label: '🎨 Artistic', desc: 'Vibrant & bold' },
    { id: 'watercolor', label: '🌊 Watercolor', desc: 'Soft & flowing' },
    { id: 'cartoon', label: '🎭 Cartoon', desc: 'Fun & playful' },
    { id: 'minimalist', label: '⬜ Minimalist', desc: 'Clean & modern' },
    { id: 'pop-art', label: '💥 Pop Art', desc: 'Bold contrasts' },
    { id: 'photorealistic', label: '📷 Photorealistic', desc: 'Ultra detailed' },
]

function CreatePageContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const { addItem } = useCart()
    const [prompt, setPrompt] = useState(searchParams.get('prompt') || '')
    const [style, setStyle] = useState('artistic')
    const [loading, setLoading] = useState(false)
    const [generatedImage, setGeneratedImage] = useState<string | null>(null)
    const [designId, setDesignId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [showProductPicker, setShowProductPicker] = useState(false)

    const [products, setProducts] = useState<ApiProduct[]>([])
    const [productsLoading, setProductsLoading] = useState(true)
    const [productSearch, setProductSearch] = useState('')
    const [activeCategory, setActiveCategory] = useState<string>('all')
    const [brokenImageById, setBrokenImageById] = useState<Record<string, true>>({})
    const autoAppliedRef = useRef(false)

    const preselectedProductId = searchParams.get('productId')
    const preselectedColor = searchParams.get('color') || ''
    const preselectedSize = searchParams.get('size') || ''

    useEffect(() => {
        let cancelled = false
        fetch('/api/products')
            .then((r) => r.json())
            .then((data) => {
                if (cancelled) return
                if (Array.isArray(data)) setProducts(data)
            })
            .catch(() => { /* keep page usable even if products fetch fails */ })
            .finally(() => { if (!cancelled) setProductsLoading(false) })
        return () => { cancelled = true }
    }, [])

    const categories = useMemo(() => {
        const set = new Set<string>()
        for (const p of products) if (p.category) set.add(p.category)
        return ['all', ...Array.from(set).sort()]
    }, [products])

    const filteredProducts = useMemo(() => {
        const q = productSearch.trim().toLowerCase()
        return products.filter((p) => {
            if (activeCategory !== 'all' && p.category !== activeCategory) return false
            if (q && !(p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))) return false
            return true
        })
    }, [products, productSearch, activeCategory])

    const preselectedProduct = useMemo(() => (
        preselectedProductId ? products.find((p) => p.id === preselectedProductId) || null : null
    ), [products, preselectedProductId])

    function pickVariant(product: ApiProduct, urlSize?: string, urlColor?: string) {
        const size = (urlSize && product.sizes.includes(urlSize))
            ? urlSize
            : (product.sizes[0] || 'One size')
        const color = (urlColor && product.colors.some((c) => c.name === urlColor))
            ? urlColor
            : (product.colors[0]?.name || 'Default')
        return { size, color }
    }

    function applyDesignToProduct(product: ApiProduct) {
        if (!designId || !generatedImage) return
        const { size, color } = pickVariant(product, preselectedSize, preselectedColor)
        addItem({
            id: `${designId}-${product.id}`,
            productId: product.id,
            productName: product.name,
            designId,
            imageUrl: generatedImage,
            mockupUrl: '',
            size,
            color,
            quantity: 1,
            price: product.sellPrice,
        })
        setShowProductPicker(false)
        router.push('/cart')
    }

    useEffect(() => {
        if (!generatedImage || !designId) return
        if (!preselectedProduct) return
        if (autoAppliedRef.current) return
        autoAppliedRef.current = true
        applyDesignToProduct(preselectedProduct)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [generatedImage, designId, preselectedProduct])

    const handleGenerate = async () => {
        if (!prompt.trim() || prompt.length < 3) return
        setLoading(true)
        setError(null)
        setGeneratedImage(null)
        autoAppliedRef.current = false

        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt.trim(), style }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Generation failed')
            setGeneratedImage(data.imageUrl)
            setDesignId(data.designId)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
                Create Your <span className="gradient-text">Design</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
                Describe what you want, pick a style, and let AI create it.
            </p>

            {preselectedProduct && (
                <div className="glass-card" style={{ padding: 16, marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0, borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                        <Image
                            src={preselectedProduct.imageUrl}
                            alt={preselectedProduct.name}
                            fill
                            sizes="56px"
                            unoptimized
                            style={{ objectFit: 'cover' }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Designing for</div>
                        <div style={{ fontWeight: 600 }}>{preselectedProduct.name}</div>
                        {(preselectedSize || preselectedColor) && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                {[preselectedSize, preselectedColor].filter(Boolean).join(' · ')}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
                <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
                    Describe your design
                </label>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="A golden retriever wearing sunglasses sitting on a surfboard, sunset beach background..."
                    maxLength={500}
                    rows={3}
                    style={{
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--foreground)',
                        fontSize: 16,
                        resize: 'vertical',
                        outline: 'none',
                        lineHeight: 1.5,
                        fontFamily: 'inherit',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        💡 Artistic styles work best. Describe visuals, not text.
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {prompt.length}/500
                    </span>
                </div>
            </div>

            <div className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
                <label style={{ fontWeight: 600, marginBottom: 12, display: 'block' }}>
                    Choose a style
                </label>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                        gap: 10,
                    }}
                >
                    {STYLES.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => setStyle(s.id)}
                            style={{
                                padding: '12px 14px',
                                borderRadius: 10,
                                border: `2px solid ${style === s.id ? 'var(--primary)' : 'var(--border)'}`,
                                background: style === s.id ? 'rgba(124,58,237,0.15)' : 'var(--surface)',
                                color: 'var(--foreground)',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s',
                            }}
                        >
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{s.label}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.desc}</div>
                        </button>
                    ))}
                </div>
            </div>

            <button
                onClick={handleGenerate}
                disabled={loading || prompt.trim().length < 3}
                className="btn-primary"
                style={{
                    width: '100%',
                    padding: '16px',
                    fontSize: 18,
                    marginBottom: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                }}
            >
                {loading ? (
                    <>
                        <span className="loading-pulse" style={{ display: 'inline-block', width: 20, height: 20, borderRadius: '50%', background: 'white' }} />
                        Generating... (5-15 seconds)
                    </>
                ) : (
                    <>🎨 Generate Design</>
                )}
            </button>

            {error && (
                <div
                    style={{
                        padding: 16,
                        borderRadius: 12,
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        color: 'var(--error)',
                        marginBottom: 24,
                    }}
                >
                    ⚠️ {error}
                </div>
            )}

            {loading && (
                <div
                    className="glass-card shimmer"
                    style={{
                        width: '100%',
                        aspectRatio: '1',
                        maxWidth: 512,
                        margin: '0 auto',
                        borderRadius: 16,
                    }}
                />
            )}

            {generatedImage && !loading && (
                <div className="fade-in" style={{ textAlign: 'center' }}>
                    <div className="glass-card" style={{ padding: 16, display: 'inline-block' }}>
                        <Image
                            src={generatedImage}
                            alt="AI Generated Design"
                            width={512}
                            height={512}
                            unoptimized
                            style={{
                                maxWidth: '100%',
                                borderRadius: 12,
                                display: 'block',
                            }}
                        />
                    </div>
                    <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={handleGenerate} className="btn-secondary">
                            🔄 Regenerate
                        </button>
                        <button
                            className="btn-primary"
                            onClick={() => setShowProductPicker(true)}
                        >
                            Choose Product
                        </button>
                    </div>
                </div>
            )}

            {showProductPicker && generatedImage && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24,
                    }}
                >
                    <div
                        onClick={() => setShowProductPicker(false)}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0, 0, 0, 0.7)',
                            backdropFilter: 'blur(4px)',
                        }}
                    />
                    <div
                        className="glass-card fade-in"
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: 960,
                            maxHeight: '85vh',
                            display: 'flex',
                            flexDirection: 'column',
                            padding: 28,
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div>
                                <h2 style={{ fontSize: 22, fontWeight: 700 }}>
                                    Pick a <span className="gradient-text">Product</span>
                                </h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
                                    Your design will be printed on the product you choose
                                </p>
                            </div>
                            <button
                                onClick={() => setShowProductPicker(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    fontSize: 24,
                                    cursor: 'pointer',
                                    padding: 4,
                                    lineHeight: 1,
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <input
                            type="search"
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            placeholder="Search products…"
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: 10,
                                border: '1px solid var(--border)',
                                background: 'var(--surface)',
                                color: 'var(--foreground)',
                                fontSize: 14,
                                outline: 'none',
                                marginBottom: 12,
                            }}
                        />

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                            {categories.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => setActiveCategory(c)}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: 999,
                                        border: `1px solid ${activeCategory === c ? 'var(--primary)' : 'var(--border)'}`,
                                        background: activeCategory === c ? 'rgba(124,58,237,0.15)' : 'transparent',
                                        color: 'var(--foreground)',
                                        fontSize: 13,
                                        cursor: 'pointer',
                                        textTransform: 'capitalize',
                                    }}
                                >
                                    {c === 'all' ? 'All' : c}
                                </button>
                            ))}
                        </div>

                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                            {productsLoading
                                ? 'Loading products…'
                                : `${filteredProducts.length} of ${products.length} products`}
                        </div>

                        <div style={{ overflowY: 'auto', flex: 1, paddingRight: 4 }}>
                            {productsLoading ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Loading…</p>
                            ) : filteredProducts.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                                    No products match your search.
                                </p>
                            ) : (
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                        gap: 14,
                                    }}
                                >
                                    {filteredProducts.map((product) => {
                                        const hasImage = Boolean(product.imageUrl) && !brokenImageById[product.id]
                                        return (
                                            <button
                                                key={product.id}
                                                onClick={() => applyDesignToProduct(product)}
                                                style={{
                                                    background: 'var(--surface)',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: 14,
                                                    padding: 0,
                                                    cursor: 'pointer',
                                                    overflow: 'hidden',
                                                    transition: 'all 0.2s ease',
                                                    textAlign: 'center',
                                                    color: 'var(--foreground)',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.borderColor = 'var(--primary)'
                                                    e.currentTarget.style.transform = 'translateY(-3px)'
                                                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(124,58,237,0.2)'
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.borderColor = 'var(--border)'
                                                    e.currentTarget.style.transform = 'translateY(0)'
                                                    e.currentTarget.style.boxShadow = 'none'
                                                }}
                                            >
                                                <div style={{ position: 'relative', width: '100%', aspectRatio: '1', background: 'rgba(255,255,255,0.05)' }}>
                                                    {hasImage ? (
                                                        <Image
                                                            src={product.imageUrl}
                                                            alt={product.name}
                                                            fill
                                                            sizes="(max-width: 640px) 45vw, 200px"
                                                            unoptimized
                                                            style={{ objectFit: 'cover' }}
                                                            onError={() => {
                                                                setBrokenImageById((prev) => ({ ...prev, [product.id]: true }))
                                                            }}
                                                        />
                                                    ) : (
                                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                                                            No image
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ padding: '10px 12px 14px' }}>
                                                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {product.name}
                                                    </div>
                                                    <div style={{ color: 'var(--primary-light)', fontSize: 14, fontWeight: 600 }}>
                                                        ${product.sellPrice.toFixed(2)}
                                                    </div>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function CreatePage() {
    return (
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>}>
            <CreatePageContent />
        </Suspense>
    )
}
