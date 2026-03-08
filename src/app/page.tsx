import Hero from '@/components/home/Hero'
import HowItWorks from '@/components/home/HowItWorks'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import SampleDesigns from '@/components/home/SampleDesigns'
import { Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
    return (
        <>
            <Hero />
            <HowItWorks />
            <FeaturedProducts />
            <SampleDesigns />

            {/* CTA Section */}
            <section className="py-24">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <div className="glass rounded-3xl p-12 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10" />
                        <div className="relative z-10">
                            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                                Ready to Create Something <span className="text-gradient">Amazing</span>?
                            </h2>
                            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                                Join thousands of creators making unique custom products with AI. Start for free — only pay when you order.
                            </p>
                            <Link
                                href="/create"
                                className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity text-lg"
                            >
                                <Sparkles className="w-5 h-5" />
                                Start Creating
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}
