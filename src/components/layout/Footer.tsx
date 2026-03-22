import Link from 'next/link'
import BrandMark from '@/components/brand/BrandMark'

export default function Footer() {
    return (
        <footer className="site-footer mt-24 border-t border-border/60">
            <div className="max-w-7xl mx-auto px-4 py-14 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-10 md:grid-cols-5">
                    <div className="col-span-1 md:col-span-2">
                        <Link href="/" className="mb-5 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full">
                                <BrandMark size={18} />
                            </div>
                            <span className="text-base font-semibold uppercase tracking-[0.14em]">SmartPrintAI</span>
                        </Link>
                        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                            Describe your vision, watch AI create it, and get it printed on premium products. No design skills needed.
                        </p>
                    </div>

                    <div>
                        <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Product</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/create" className="hover:text-foreground transition-colors">Create Design</Link></li>
                            <li><Link href="/products" className="hover:text-foreground transition-colors">Products</Link></li>
                            <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
                            <li><Link href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Support</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/support" className="hover:text-foreground transition-colors">Contact</Link></li>
                            <li><Link href="/support#faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
                            <li><Link href="/support#shipping" className="hover:text-foreground transition-colors">Shipping</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Trust</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
                            <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="mt-10 border-t border-border/60 pt-8 text-center text-xs text-muted-foreground">
                    © {new Date().getFullYear()} SmartPrintAI. All rights reserved.
                </div>
            </div>
        </footer>
    )
}
