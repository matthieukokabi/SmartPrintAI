import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export default function Footer() {
    return (
        <footer className="border-t border-white/5 mt-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="col-span-1 md:col-span-2">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-lg font-bold text-gradient">SmartPrintAI</span>
                        </Link>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            Describe your vision, watch AI create it, and get it printed on premium products. No design skills needed.
                        </p>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold mb-4">Product</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/create" className="hover:text-foreground transition-colors">Create Design</Link></li>
                            <li><Link href="/products" className="hover:text-foreground transition-colors">Products</Link></li>
                            <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
                            <li><Link href="/careers" className="hover:text-foreground transition-colors">Careers</Link></li>
                            <li><Link href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold mb-4">Support</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/support" className="hover:text-foreground transition-colors">Contact</Link></li>
                            <li><Link href="/support#faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
                            <li><Link href="/support#shipping" className="hover:text-foreground transition-colors">Shipping</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/5 mt-8 pt-8 text-center text-xs text-muted-foreground">
                    © {new Date().getFullYear()} SmartPrintAI. All rights reserved.
                </div>
            </div>
        </footer>
    )
}
