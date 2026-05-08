import Link from 'next/link'

export default function ReturnsPolicyContent() {
    return (
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Returns &amp; Refund Policy</h1>
            <p className="mt-3 text-sm text-muted-foreground">Effective date: April 24, 2026</p>

            <div className="mt-8 space-y-6">
                <section className="glass rounded-2xl p-6">
                    <h2 className="text-xl font-semibold">Summary</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Custom AI-designed products are made to order specifically for you. We accept returns and issue refunds when an item
                        arrives damaged, defective, or materially different from what was ordered. We cannot accept returns for
                        buyer&rsquo;s-remorse, design dissatisfaction, or wrong size when the size matches the option you selected at
                        checkout, because each item is custom-printed and cannot be resold.
                    </p>
                </section>

                <section className="glass rounded-2xl p-6">
                    <h2 className="text-xl font-semibold">Eligibility window</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        You have 30 days from the delivery date shown by the carrier to request a return for a damaged, defective, or
                        incorrect item.
                    </p>
                </section>

                <section className="glass rounded-2xl p-6">
                    <h2 className="text-xl font-semibold">How to request a return or refund</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Email <a href="mailto:help@smartprintai.com" className="text-purple-300 hover:text-purple-200">help@smartprintai.com</a>{' '}
                        within the 30-day window with:
                    </p>
                    <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-muted-foreground">
                        <li>your order number,</li>
                        <li>the affected item(s),</li>
                        <li>clear photos showing the issue (front, back, and a close-up of the defect),</li>
                        <li>whether you would prefer a free replacement or a refund to your original payment method.</li>
                    </ul>
                    <p className="mt-3 text-sm text-muted-foreground">
                        We respond to all return requests within 1 business day.
                    </p>
                </section>

                <section className="glass rounded-2xl p-6">
                    <h2 className="text-xl font-semibold">What we replace or refund for free</h2>
                    <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-muted-foreground">
                        <li>Items that arrive damaged or defective.</li>
                        <li>Items printed with the wrong design, wrong product, wrong size, or wrong color compared to your confirmed order.</li>
                        <li>Items that never arrive (lost in transit) once the carrier has confirmed the parcel as lost.</li>
                    </ul>
                    <p className="mt-3 text-sm text-muted-foreground">
                        In these cases we cover all return shipping costs and ship a replacement at no charge, or refund the full amount
                        paid (item + original shipping) to your original payment method. Refunds are processed within 5 business days of
                        approval; depending on your card issuer or bank, they typically post within 5&ndash;10 business days after that.
                    </p>
                </section>

                <section className="glass rounded-2xl p-6">
                    <h2 className="text-xl font-semibold">What is final sale (no refund)</h2>
                    <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-muted-foreground">
                        <li>Buyer&rsquo;s-remorse on a correctly produced custom item.</li>
                        <li>Wrong size when the size you received matches the size selected at checkout.</li>
                        <li>
                            Designs that look different from your expectation when the printed result matches the AI-generated preview you
                            approved before payment.
                        </li>
                    </ul>
                </section>

                <section className="glass rounded-2xl p-6">
                    <h2 className="text-xl font-semibold">Order cancellations</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        You can cancel an order at no charge within 1 hour of placing it, before production begins. Email{' '}
                        <a href="mailto:help@smartprintai.com" className="text-purple-300 hover:text-purple-200">help@smartprintai.com</a>{' '}
                        with your order number. After production has started we cannot cancel, but the return policy above still applies if
                        anything is wrong on arrival.
                    </p>
                </section>

                <section className="glass rounded-2xl p-6">
                    <h2 className="text-xl font-semibold">Damaged on arrival</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Photograph the parcel and product within 7 days of delivery and email{' '}
                        <a href="mailto:help@smartprintai.com" className="text-purple-300 hover:text-purple-200">help@smartprintai.com</a>.
                        We will arrange a free replacement or full refund.
                    </p>
                </section>

                <section className="glass rounded-2xl p-6">
                    <h2 className="text-xl font-semibold">Lost in transit</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        If tracking has not updated for 10 consecutive business days for a US shipment (or 21 for international), email{' '}
                        <a href="mailto:help@smartprintai.com" className="text-purple-300 hover:text-purple-200">help@smartprintai.com</a>.
                        We will open a carrier claim and ship a replacement or issue a full refund.
                    </p>
                </section>

                <section className="glass rounded-2xl p-6">
                    <h2 className="text-xl font-semibold">Return shipping</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        For free returns (damaged, defective, incorrect), we email you a prepaid return label. Do not ship items back
                        without contacting us first &mdash; unsolicited returns cannot be processed.
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
