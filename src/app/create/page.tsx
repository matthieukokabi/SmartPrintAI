'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import Image from 'next/image'
import { useCart } from '@/store/cart'

const PRODUCTS = [
    { id: 'tshirt', name: 'Unisex T-Shirt', price: 29.99, image: '/images/cat-tshirt.svg', size: 'M', color: 'Black' },
    { id: 'hoodie', name: 'Premium Hoodie', price: 59.99, image: '/images/cat-hoodie.svg', size: 'L', color: 'Black' },
    { id: 'mug', name: 'White Mug 11oz', price: 18.99, image: '/images/cat-mug.svg', size: '11oz', color: 'White' },
    { id: 'canvas', name: 'Canvas Print 12x12', price: 39.99, image: '/images/cat-canvas.svg', size: '12x12', color: 'White' },
    { id: 'phone', name: 'Phone Case', price: 24.99, image: '/images/cat-phone.svg', size: 'iPhone 15', color: 'Clear' },
    { id: 'tote', name: 'Tote Bag', price: 22.99, image: '/images/cat-tote.svg', size: 'One Size', color: 'Black' },
    { id: 'sticker', name: 'Sticker Sheet', price: 12.99, image: '/images/cat-sticker.svg', size: '4x4', color: 'White' },
    { id: 'blanket', name: 'Fleece Blanket', price: 64.99, image: '/images/cat-blanket.svg', size: '50x60', color: 'White' },
]

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

    const handleGenerate = async () => {
        if (!prompt.trim() || prompt.length < 3) return
        setLoading(true)
        setError(null)
        setGeneratedImage(null)

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

            {/* Prompt Input */}
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

            {/* Style Selector */}
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

            {/* Generate Button */}
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

            {/* Error */}
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

            {/* Loading Skeleton */}
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

            {/* Generated Image */}
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

            {/* Product Picker Modal */}
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
                    {/* Backdrop */}
                    <div
                        onClick={() => setShowProductPicker(false)}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0, 0, 0, 0.7)',
                            backdropFilter: 'blur(4px)',
                        }}
                    />

                    {/* Modal */}
                    <div
                        className="glass-card fade-in"
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: 720,
                            maxHeight: '85vh',
                            overflowY: 'auto',
                            padding: 32,
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
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

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                gap: 14,
                            }}
                        >
                            {PRODUCTS.map((product) => (
                                <button
                                    key={product.id}
                                    onClick={() => {
                                        addItem({
                                            id: `${designId}-${product.id}`,
                                            productId: product.id,
                                            productName: product.name,
                                            designId: designId!,
                                            imageUrl: generatedImage,
                                            mockupUrl: '',
                                            size: product.size,
                                            color: product.color,
                                            quantity: 1,
                                            price: product.price,
                                        })
                                        setShowProductPicker(false)
                                        router.push('/cart')
                                    }}
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
                                    <Image
                                        src={product.image}
                                        alt={product.name}
                                        width={150}
                                        height={150}
                                        style={{ width: '100%', height: 'auto', display: 'block' }}
                                    />
                                    <div style={{ padding: '10px 12px 14px' }}>
                                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{product.name}</div>
                                        <div style={{ color: 'var(--primary-light)', fontSize: 14, fontWeight: 600 }}>
                                            ${product.price.toFixed(2)}
                                        </div>
                                    </div>
                                </button>
                            ))}
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
