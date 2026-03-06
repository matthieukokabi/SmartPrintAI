'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

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
    const [prompt, setPrompt] = useState(searchParams.get('prompt') || '')
    const [style, setStyle] = useState('artistic')
    const [loading, setLoading] = useState(false)
    const [generatedImage, setGeneratedImage] = useState<string | null>(null)
    const [designId, setDesignId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

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
        } catch (err: any) {
            setError(err.message || 'Something went wrong. Try again.')
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
                        <img
                            src={generatedImage}
                            alt="AI Generated Design"
                            style={{
                                maxWidth: '100%',
                                width: 512,
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
                            onClick={() => {
                                // TODO: scroll to product picker or navigate
                                alert('Product picker coming soon! Design saved with ID: ' + designId)
                            }}
                        >
                            ➡️ Choose Product
                        </button>
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
