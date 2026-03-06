'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SuccessContent() {
    const searchParams = useSearchParams()
    const sessionId = searchParams.get('session_id')

    return (
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 80, marginBottom: 20 }}>🎉</div>
            <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 12 }}>
                Order <span className="gradient-text">Confirmed!</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 18, lineHeight: 1.6, marginBottom: 32 }}>
                Your custom design is being printed right now. You&apos;ll receive a confirmation email with tracking info.
            </p>
            <div className="glass-card" style={{ padding: 24, marginBottom: 32 }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Estimated delivery: 5–10 business days</p>
                {sessionId && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
                        Session: {sessionId.slice(0, 20)}...
                    </p>
                )}
            </div>
            <Link href="/create" className="btn-primary" style={{ textDecoration: 'none' }}>
                🎨 Create Another Design
            </Link>
        </div>
    )
}

export default function SuccessPage() {
    return (
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>}>
            <SuccessContent />
        </Suspense>
    )
}
