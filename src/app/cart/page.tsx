'use client'

import Link from 'next/link'
import { useCart } from '@/store/cart'

export default function CartPage() {
    const { items, removeItem, updateQuantity, total, clearCart } = useCart()

    const handleCheckout = async () => {
        if (!items.length) return

        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: items.map((i) => ({
                        productId: i.productId,
                        designId: i.designId,
                        size: i.size,
                        color: i.color,
                        quantity: i.quantity,
                    })),
                }),
            })

            const data = await res.json()
            if (data.url) {
                window.location.href = data.url
            }
        } catch (err) {
            console.error('Checkout error:', err)
        }
    }

    if (!items.length) {
        return (
            <div style={{ maxWidth: 600, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 64, marginBottom: 20 }}>🛒</div>
                <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Your cart is empty</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
                    Create a custom AI design and add it to your cart.
                </p>
                <Link href="/create" className="btn-primary" style={{ textDecoration: 'none' }}>
                    🎨 Create a Design
                </Link>
            </div>
        )
    }

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 32 }}>
                🛒 Your Cart ({items.length} item{items.length > 1 ? 's' : ''})
            </h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
                {items.map((item) => (
                    <div
                        key={item.id}
                        className="glass-card"
                        style={{ padding: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}
                    >
                        <img
                            src={item.mockupUrl || item.imageUrl}
                            alt={item.productName}
                            style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10 }}
                        />
                        <div style={{ flex: 1, minWidth: 200 }}>
                            <h3 style={{ fontWeight: 600, marginBottom: 4 }}>{item.productName}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                                {item.size} / {item.color}
                            </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="btn-secondary"
                                style={{ padding: '6px 12px', fontSize: 16 }}
                            >
                                −
                            </button>
                            <span style={{ fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                            <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="btn-secondary"
                                style={{ padding: '6px 12px', fontSize: 16 }}
                            >
                                +
                            </button>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 18, minWidth: 80, textAlign: 'right' }}>
                            ${(item.price * item.quantity).toFixed(2)}
                        </div>
                        <button
                            onClick={() => removeItem(item.id)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--error)',
                                cursor: 'pointer',
                                fontSize: 18,
                            }}
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>

            {/* Summary */}
            <div className="glass-card" style={{ padding: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                    <span style={{ fontWeight: 600 }}>${total().toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Shipping</span>
                    <span style={{ fontWeight: 600 }}>$5.99</span>
                </div>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        borderTop: '1px solid var(--border)',
                        paddingTop: 12,
                        marginTop: 12,
                    }}
                >
                    <span style={{ fontSize: 18, fontWeight: 700 }}>Total</span>
                    <span style={{ fontSize: 18, fontWeight: 700 }} className="gradient-text">
                        ${(total() + 5.99).toFixed(2)}
                    </span>
                </div>
                <button
                    onClick={handleCheckout}
                    className="btn-primary"
                    style={{ width: '100%', padding: 16, fontSize: 18, marginTop: 20 }}
                >
                    Proceed to Checkout →
                </button>
            </div>
        </div>
    )
}
