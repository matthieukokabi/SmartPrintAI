'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function HomePage() {
    const [prompt, setPrompt] = useState('')

    const steps = [
        { icon: '✍️', title: 'Describe', desc: 'Type what you want — "a golden retriever in pop art style"' },
        { icon: '🤖', title: 'Generate', desc: 'AI creates your unique design in seconds' },
        { icon: '📦', title: 'Receive', desc: 'Pick a product, checkout, and we ship it to you' },
    ]

    const categories = [
        { name: 'T-Shirts', emoji: '👕', price: 'From $29.99' },
        { name: 'Hoodies', emoji: '🧥', price: 'From $59.99' },
        { name: 'Mugs', emoji: '☕', price: 'From $18.99' },
        { name: 'Canvas', emoji: '🖼️', price: 'From $39.99' },
        { name: 'Phone Cases', emoji: '📱', price: 'From $24.99' },
        { name: 'Tote Bags', emoji: '👜', price: 'From $22.99' },
        { name: 'Stickers', emoji: '✨', price: 'From $12.99' },
        { name: 'Blankets', emoji: '🛋️', price: 'From $64.99' },
    ]

    return (
        <div>
            {/* Hero Section */}
            <section
                style={{
                    minHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '80px 24px 60px',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Background gradient orbs */}
                <div
                    style={{
                        position: 'absolute',
                        top: '-20%',
                        left: '-10%',
                        width: 600,
                        height: 600,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
                        pointerEvents: 'none',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        bottom: '-20%',
                        right: '-10%',
                        width: 500,
                        height: 500,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)',
                        pointerEvents: 'none',
                    }}
                />

                <div style={{ position: 'relative', zIndex: 1, maxWidth: 800 }}>
                    <div
                        style={{
                            display: 'inline-block',
                            padding: '6px 16px',
                            borderRadius: 100,
                            border: '1px solid var(--border)',
                            color: 'var(--primary-light)',
                            fontSize: 13,
                            fontWeight: 500,
                            marginBottom: 24,
                            background: 'rgba(124,58,237,0.08)',
                        }}
                    >
                        ✨ AI-Powered Design — No Skills Required
                    </div>

                    <h1
                        style={{
                            fontSize: 'clamp(36px, 6vw, 64px)',
                            fontWeight: 800,
                            lineHeight: 1.1,
                            marginBottom: 20,
                        }}
                    >
                        Describe Your Idea.
                        <br />
                        <span className="gradient-text">We Print It.</span>
                    </h1>

                    <p
                        style={{
                            fontSize: 'clamp(16px, 2vw, 20px)',
                            color: 'var(--text-muted)',
                            marginBottom: 40,
                            lineHeight: 1.6,
                            maxWidth: 600,
                            marginLeft: 'auto',
                            marginRight: 'auto',
                        }}
                    >
                        Type what you imagine — AI generates a stunning design — choose a product — we print and ship it to your door.
                    </p>

                    {/* Hero Prompt Input */}
                    <div
                        style={{
                            display: 'flex',
                            gap: 12,
                            maxWidth: 600,
                            margin: '0 auto',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                        }}
                    >
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="a golden retriever wearing sunglasses, pop art style..."
                            style={{
                                flex: 1,
                                minWidth: 280,
                                padding: '16px 20px',
                                borderRadius: 12,
                                border: '1px solid var(--border)',
                                background: 'var(--surface)',
                                color: 'var(--foreground)',
                                fontSize: 16,
                                outline: 'none',
                                transition: 'border-color 0.3s',
                            }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                        />
                        <Link
                            href={`/create${prompt ? `?prompt=${encodeURIComponent(prompt)}` : ''}`}
                            className="btn-primary"
                            style={{
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            🎨 Create Design
                        </Link>
                    </div>

                    <p
                        style={{
                            marginTop: 16,
                            fontSize: 13,
                            color: 'var(--text-muted)',
                        }}
                    >
                        💡 Try: &quot;cute cat astronaut&quot;, &quot;abstract mountain landscape watercolor&quot;, &quot;minimalist geometric wolf&quot;
                    </p>
                </div>
            </section>

            {/* How It Works */}
            <section style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
                <h2
                    style={{
                        textAlign: 'center',
                        fontSize: 32,
                        fontWeight: 700,
                        marginBottom: 48,
                    }}
                >
                    How It Works
                </h2>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: 32,
                    }}
                >
                    {steps.map((step, i) => (
                        <div
                            key={i}
                            className="glass-card fade-in"
                            style={{
                                padding: 32,
                                textAlign: 'center',
                                animationDelay: `${i * 0.15}s`,
                            }}
                        >
                            <div style={{ fontSize: 48, marginBottom: 16 }}>{step.icon}</div>
                            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{step.title}</h3>
                            <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>{step.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Product Categories */}
            <section
                style={{
                    padding: '80px 24px',
                    maxWidth: 1200,
                    margin: '0 auto',
                }}
            >
                <h2
                    style={{
                        textAlign: 'center',
                        fontSize: 32,
                        fontWeight: 700,
                        marginBottom: 12,
                    }}
                >
                    Choose Your Product
                </h2>
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 48, fontSize: 16 }}>
                    Your AI design on 15+ premium products
                </p>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: 20,
                    }}
                >
                    {categories.map((cat, i) => (
                        <Link
                            key={i}
                            href="/create"
                            className="glass-card"
                            style={{
                                padding: 24,
                                textAlign: 'center',
                                textDecoration: 'none',
                                color: 'var(--foreground)',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'var(--primary)'
                                e.currentTarget.style.transform = 'translateY(-4px)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--border)'
                                e.currentTarget.style.transform = 'translateY(0)'
                            }}
                        >
                            <div style={{ fontSize: 40, marginBottom: 12 }}>{cat.emoji}</div>
                            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{cat.name}</h3>
                            <p style={{ color: 'var(--primary-light)', fontSize: 14 }}>{cat.price}</p>
                        </Link>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section
                style={{
                    padding: '80px 24px',
                    textAlign: 'center',
                    background: 'linear-gradient(180deg, transparent, rgba(124,58,237,0.05))',
                }}
            >
                <h2 style={{ fontSize: 36, fontWeight: 700, marginBottom: 16 }}>
                    Ready to Create Something <span className="gradient-text">Unique</span>?
                </h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: 32, fontSize: 18 }}>
                    No design skills needed. Just your imagination.
                </p>
                <Link href="/create" className="btn-primary" style={{ textDecoration: 'none', fontSize: 18, padding: '16px 40px' }}>
                    🎨 Start Creating — It&apos;s Free to Try
                </Link>
            </section>
        </div>
    )
}
