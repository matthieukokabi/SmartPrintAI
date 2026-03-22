'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useCart } from '@/store/cart'
import { ShoppingCart, Sparkles } from 'lucide-react'
import ThemeToggle from '@/components/theme/ThemeToggle'
import BrandMark from '@/components/brand/BrandMark'

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
        <nav className="site-nav fixed inset-x-0 top-0 z-50 px-3 sm:px-4 lg:px-6">
            <div className="site-nav-shell mx-auto mt-3 flex max-w-7xl items-center rounded-full border border-border/70 bg-background/80 px-4 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:px-6">
                <div className="flex h-16 w-full items-center justify-between gap-4">
                    <Link href="/" className="group flex items-center gap-3">
                        <div className="site-nav-logoMark flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-105">
                            <BrandMark size={18} />
                        </div>
                        <span className="site-nav-brand text-base font-semibold uppercase tracking-[0.14em] text-foreground">SmartPrintAI</span>
                    </Link>

                    <div className="hidden md:flex items-center gap-6">
                        <Link href="/create" className="site-nav-link text-sm text-muted-foreground transition-colors">
                            Create
                        </Link>
                        <Link href="/products" className="site-nav-link text-sm text-muted-foreground transition-colors">
                            Products
                        </Link>
                        <Link href="/blog" className="site-nav-link text-sm text-muted-foreground transition-colors">
                            Blog
                        </Link>
                        <Link href="/account/orders" className="site-nav-link text-sm text-muted-foreground transition-colors">
                            Orders
                        </Link>
                        <Link href="/support" className="site-nav-link text-sm text-muted-foreground transition-colors">
                            Support
                        </Link>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <ThemeToggle compact className="inline-flex" />

                        <Link
                            href="/create"
                            className="site-nav-cta inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-sky-500 px-3 py-2 text-sm font-medium text-white shadow-[0_18px_36px_-26px_rgba(14,165,233,0.8)] transition-all duration-300 hover:opacity-90 sm:gap-2 sm:px-4"
                            aria-label="Start creating"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Start Creating</span>
                        </Link>

                        {isSignedIn ? (
                            <Link href="/api/auth/logout" className="site-nav-link hidden text-sm text-muted-foreground transition-colors sm:inline-flex">
                                Sign out
                            </Link>
                        ) : (
                            <Link href="/signin" className="site-nav-link hidden text-sm text-muted-foreground transition-colors sm:inline-flex">
                                Sign in
                            </Link>
                        )}

                        <Link href="/cart" className="site-nav-cart relative rounded-full border border-border/70 bg-background/55 p-2.5 text-foreground transition-colors hover:bg-secondary/75">
                            <ShoppingCart className="w-5 h-5" />
                            {itemCount > 0 && (
                                <span className="site-nav-cartBadge absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold">
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
