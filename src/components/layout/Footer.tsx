import Link from 'next/link'

export default function Footer() {
    return (
        <footer
            style={{
                borderTop: '1px solid var(--border)',
                padding: '48px 24px',
                background: 'var(--surface)',
            }}
        >
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 40,
                        marginBottom: 40,
                    }}
                >
                    <div>
                        <h3 className="gradient-text" style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>
                            🎨 SmartPrintAI
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
                            Describe it. AI creates it. We print and ship it.
                        </p>
                    </div>
                    <div>
                        <h4 style={{ fontWeight: 600, marginBottom: 12 }}>Products</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <Link href="/create" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14 }}>
                                T-Shirts
                            </Link>
                            <Link href="/create" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14 }}>
                                Hoodies
                            </Link>
                            <Link href="/create" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14 }}>
                                Mugs
                            </Link>
                            <Link href="/create" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14 }}>
                                Wall Art
                            </Link>
                        </div>
                    </div>
                    <div>
                        <h4 style={{ fontWeight: 600, marginBottom: 12 }}>Support</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>help@smartprintai.com</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Shipping Info</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Returns Policy</span>
                        </div>
                    </div>
                </div>
                <div
                    style={{
                        borderTop: '1px solid var(--border)',
                        paddingTop: 24,
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontSize: 13,
                    }}
                >
                    © 2026 SmartPrintAI. All rights reserved.
                </div>
            </div>
        </footer>
    )
}
