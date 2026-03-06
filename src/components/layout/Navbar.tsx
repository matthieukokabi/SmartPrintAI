'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <nav
            style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                background: 'rgba(10, 10, 15, 0.85)',
                backdropFilter: 'blur(16px)',
                borderBottom: '1px solid var(--border)',
            }}
        >
            <div
                style={{
                    maxWidth: 1200,
                    margin: '0 auto',
                    padding: '0 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    height: 72,
                }}
            >
                <Link
                    href="/"
                    style={{
                        fontSize: 24,
                        fontWeight: 800,
                        textDecoration: 'none',
                        color: 'var(--foreground)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                    }}
                >
                    <span style={{ fontSize: 28 }}>🎨</span>
                    <span className="gradient-text">SmartPrintAI</span>
                </Link>

                {/* Desktop Nav */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 32,
                    }}
                    className="desktop-nav"
                >
                    <Link
                        href="/create"
                        style={{
                            color: 'var(--text-muted)',
                            textDecoration: 'none',
                            fontWeight: 500,
                            transition: 'color 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-light)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >
                        Create Design
                    </Link>
                    <Link
                        href="/cart"
                        style={{
                            color: 'var(--text-muted)',
                            textDecoration: 'none',
                            fontWeight: 500,
                            transition: 'color 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-light)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >
                        🛒 Cart
                    </Link>
                    <Link href="/create" className="btn-primary" style={{ textDecoration: 'none' }}>
                        Start Creating
                    </Link>
                </div>

                {/* Mobile Menu Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        display: 'none',
                        background: 'none',
                        border: 'none',
                        color: 'var(--foreground)',
                        fontSize: 24,
                        cursor: 'pointer',
                    }}
                    className="mobile-menu-btn"
                >
                    {isOpen ? '✕' : '☰'}
                </button>
            </div>

            {/* Mobile Nav */}
            {isOpen && (
                <div
                    style={{
                        padding: '16px 24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                        borderTop: '1px solid var(--border)',
                    }}
                >
                    <Link
                        href="/create"
                        style={{ color: 'var(--foreground)', textDecoration: 'none', fontWeight: 500 }}
                        onClick={() => setIsOpen(false)}
                    >
                        Create Design
                    </Link>
                    <Link
                        href="/cart"
                        style={{ color: 'var(--foreground)', textDecoration: 'none', fontWeight: 500 }}
                        onClick={() => setIsOpen(false)}
                    >
                        🛒 Cart
                    </Link>
                    <Link
                        href="/create"
                        className="btn-primary"
                        style={{ textDecoration: 'none', textAlign: 'center' }}
                        onClick={() => setIsOpen(false)}
                    >
                        Start Creating
                    </Link>
                </div>
            )}

            <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
        </nav>
    )
}
