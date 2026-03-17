import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
    title: 'About SmartPrintAI',
    description: 'Learn how SmartPrintAI turns AI-generated designs into premium printed products with secure checkout and support.',
    alternates: {
        canonical: '/about',
    },
}

export default function AboutPage() {
    return (
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">About SmartPrintAI</h1>
                <p className="text-muted-foreground">
                    SmartPrintAI helps people turn ideas into custom products in minutes. You describe your design, generate artwork with AI,
                    preview it, and order with print-on-demand fulfillment.
                </p>
            </div>

            <div className="mt-8 space-y-6">
                <section className="glass rounded-2xl p-6">
                    <h2 className="text-xl font-semibold">How We Work</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        We focus on reliable generation, transparent pricing, and quality fulfillment partners. Orders are produced on demand to
                        reduce waste and ship globally.
                    </p>
                </section>

                <section className="glass rounded-2xl p-6">
                    <h2 className="text-xl font-semibold">Support & Trust</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Need help with an order, shipping, or account access? Our support team is reachable via the support center.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3 text-sm">
                        <Link href="/support" className="text-purple-300 hover:text-purple-200">
                            Go to Support
                        </Link>
                        <Link href="/privacy" className="text-purple-300 hover:text-purple-200">
                            Privacy Policy
                        </Link>
                        <Link href="/terms" className="text-purple-300 hover:text-purple-200">
                            Terms of Service
                        </Link>
                    </div>
                </section>
            </div>
        </div>
    )
}
