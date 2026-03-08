'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useCart } from '@/store/cart'
import { ShoppingCart, Sparkles } from 'lucide-react'

export default function Navbar() {
    const itemCount = useCart((s) => s.itemCount())
    const [isSignedIn, setIsSignedIn] = useState(false)

    useEffect(() => {
        let cancelled = false

        async function loadSession() {
            try {
                const res = await fetch('/api/auth/me', { cache: 'no-store' })
                if (cancelled) return
                setIsSignedIn(res.ok)
            } catch {
                if (!cancelled) setIsSignedIn(false)
            }
        }

        loadSession()
        return () => {
            cancelled = true
        }
    }, [])

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-lg font-bold text-gradient">SmartPrintAI</span>
                    </Link>

                    <div className="hidden md:flex items-center gap-8">
                        <Link href="/create" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            Create
                        </Link>
                        <Link href="/products" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            Products
                        </Link>
                        <Link href="/account/orders" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            Orders
                        </Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link
                            href="/create"
                            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            Start Creating
                        </Link>

                        {isSignedIn ? (
                            <Link href="/api/auth/logout" className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground transition-colors">
                                Sign out
                            </Link>
                        ) : (
                            <Link href="/signin" className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground transition-colors">
                                Sign in
                            </Link>
                        )}

                        <Link href="/cart" className="relative p-2 rounded-lg hover:bg-white/5 transition-colors">
                            <ShoppingCart className="w-5 h-5" />
                            {itemCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-purple-500 text-xs font-bold flex items-center justify-center">
                                    {itemCount}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    )
}
