import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
    title: 'Terms of Service | SmartPrintAI',
    description: 'Review SmartPrintAI terms for orders, fulfillment, and platform usage.',
    alternates: {
        canonical: '/terms',
    },
}

export default function TermsPage() {
    return (
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Terms of Service</h1>
            <p className="mt-3 text-sm text-muted-foreground">Last updated: March 17, 2026</p>

            <div className="mt-8 space-y-6">
                <section className="glass rounded-2xl p-6">
                    <h2 className="text-xl font-semibold">Orders and Fulfillment</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Custom items are produced on demand after checkout. Production and shipping timelines may vary by product and destination.
                    </p>
                </section>

                <section className="glass rounded-2xl p-6">
                    <h2 className="text-xl font-semibold">AI-Generated Content</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        You are responsible for prompts and uploaded content. Designs that violate platform policies or applicable law may be
                        blocked.
                    </p>
                </section>

                <section className="glass rounded-2xl p-6">
                    <h2 className="text-xl font-semibold">Help</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        For order issues or account questions, use support.
                    </p>
                    <Link href="/support" className="mt-3 inline-flex text-sm text-purple-300 hover:text-purple-200">
                        Go to support
                    </Link>
                </section>
            </div>
        </div>
    )
}
