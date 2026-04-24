import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
    title: 'Shipping & Delivery | SmartPrintAI',
    description: 'Production and delivery times, tracking, shipping costs, and customs information for SmartPrintAI orders.',
    alternates: {
        canonical: '/shipping',
    },
}

export default function ShippingPage() {
    return (
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Shipping &amp; Delivery</h1>
            <p className="mt-3 text-sm text-muted-foreground">Effective date: April 24, 2026</p>

            <div className="mt-8 space-y-6">
                <section className="glass rounded-2xl p-6">
                    <h2 className="text-xl font-semibold">Production time</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Each item is custom-printed when you order. Production takes 2&ndash;5 business days before the parcel ships.
                    </p>
                </section>

                <section className="glass rounded-2xl p-6">
                    <h2 className="text-xl font-semibold">Delivery windows</h2>
                    <p className="mt-2 text-sm text-muted-foreground">After production, typical carrier delivery times are:</p>
                    <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-muted-foreground">
                        <li>United States: 3&ndash;7 business days (USPS / UPS, depending on item)</li>
                        <li>Canada: 5&ndash;10 business days</li>
                        <li>United Kingdom &amp; European Union: 6&ndash;12 business days</li>
                        <li>Rest of world: 10&ndash;20 business days</li>
                    </ul>
                    <p className="mt-3 text-sm text-muted-foreground">
                        Combined production + shipping is usually 3&ndash;10 business days within the US, and up to 25 business days for
                        international destinations.
                    </p>
                </section>

                <section className="glass rounded-2xl p-6">
                    <h2 className="text-xl font-semibold">Tracking</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Once the parcel leaves our fulfilment partner you receive an email with a tracking number. You can also see live
                        order status on your{' '}
                        <Link href="/orders" className="text-purple-300 hover:text-purple-200">orders page</Link>.
                    </p>
                </section>

                <section className="glass rounded-2xl p-6">
                    <h2 className="text-xl font-semibold">Shipping costs</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Calculated at checkout based on destination and the items in your cart.
                    </p>
                </section>

                <section className="glass rounded-2xl p-6">
                    <h2 className="text-xl font-semibold">Customs and duties</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        International orders may be subject to import duties or taxes assessed by your local customs authority. These
                        charges are the recipient&rsquo;s responsibility and are not included in the price you pay at checkout.
                    </p>
                </section>

                <section className="glass rounded-2xl p-6">
                    <h2 className="text-xl font-semibold">Wrong address</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        If you spot an address error, email{' '}
                        <a href="mailto:help@smartprintai.com" className="text-purple-300 hover:text-purple-200">help@smartprintai.com</a>{' '}
                        within 1 hour of ordering and we will correct it before production starts. After production begins, address changes
                        are not possible.
                    </p>
                </section>

                <section className="glass rounded-2xl p-6">
                    <h2 className="text-xl font-semibold">Contact</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        SmartPrintAI Support<br />
                        Email: <a href="mailto:help@smartprintai.com" className="text-purple-300 hover:text-purple-200">help@smartprintai.com</a><br />
                        Response time: within 1 business day, Monday&ndash;Friday.
                    </p>
                    <Link href="/support" className="mt-3 inline-flex text-sm text-purple-300 hover:text-purple-200">
                        Go to support
                    </Link>
                </section>
            </div>
        </div>
    )
}
