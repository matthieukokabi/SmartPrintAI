import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
    title: 'Privacy Policy | SmartPrintAI',
    description: 'Read how SmartPrintAI handles account, order, and support data.',
    alternates: {
        canonical: '/privacy',
    },
}

export default function PrivacyPage() {
    return (
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy</h1>
            <p className="mt-3 text-sm text-muted-foreground">Last updated: March 17, 2026</p>

            <div className="mt-8 space-y-6">
                <section className="glass rounded-2xl p-6">
                    <h2 className="text-xl font-semibold">Data We Use</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        We process data needed to operate the service, including account email, order and shipping details, and support messages.
                    </p>
                </section>

                <section className="glass rounded-2xl p-6">
                    <h2 className="text-xl font-semibold">How Data Is Used</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Data is used for order processing, delivery tracking, fraud prevention, customer support, and service improvements.
                    </p>
                </section>

                <section className="glass rounded-2xl p-6">
                    <h2 className="text-xl font-semibold">Contact</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Questions about privacy can be sent through our support center.
                    </p>
                    <Link href="/support" className="mt-3 inline-flex text-sm text-purple-300 hover:text-purple-200">
                        Contact support
                    </Link>
                </section>
            </div>
        </div>
    )
}
