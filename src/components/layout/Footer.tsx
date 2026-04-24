import Link from 'next/link'
import Image from 'next/image'

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
                        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Image src="/images/logo.svg" alt="SmartPrintAI" width={24} height={24} />
                            <span className="gradient-text">SmartPrintAI</span>
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
                            <a
                                href="mailto:help@smartprintai.com"
                                style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14 }}
                            >
                                help@smartprintai.com
                            </a>
                            <Link href="/shipping" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14 }}>
                                Shipping Info
                            </Link>
                            <Link href="/returns" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14 }}>
                                Returns Policy
                            </Link>
                            <Link href="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14 }}>
                                Terms
                            </Link>
                            <Link href="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 14 }}>
                                Privacy
                            </Link>
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
