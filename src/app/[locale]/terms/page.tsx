import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPageLayout from '@/components/legal/LegalPageLayout'
import {
    DEFAULT_LOCALE,
    getLocaleCopy,
    isSupportedLocale,
    type SupportedLocale,
} from '@/lib/i18n'

type PageProps = { params: { locale: string } }

function resolveLocale(rawLocale: string): SupportedLocale {
    return isSupportedLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE
}

export function generateMetadata({ params }: PageProps): Metadata {
    const locale = resolveLocale(params.locale)
    const copy = getLocaleCopy(locale).terms
    return {
        title: copy.metadata.title,
        description: copy.metadata.description,
        alternates: {
            canonical: locale === 'en' ? '/terms' : `/${locale}/terms`,
        },
    }
}

export default function LocalizedTermsPage({ params }: PageProps) {
    const locale = resolveLocale(params.locale)
    const copy = getLocaleCopy(locale).terms
    const returnsHref = locale === 'en' ? '/returns' : `/${locale}/returns`
    const shippingHref = '/shipping'
    const supportHref = locale === 'en' ? '/support' : `/${locale}/support`

    return (
        <LegalPageLayout
            title={copy.headerTitle}
            effectiveDate={copy.effectiveDate}
            lastUpdated={copy.lastUpdated}
            sections={[
                { id: 'overview', label: copy.nav.overview },
                { id: 'orders', label: copy.nav.orders },
                { id: 'pricing', label: copy.nav.pricing },
                { id: 'ai-content', label: copy.nav.aiContent },
                { id: 'intellectual-property', label: copy.nav.intellectualProperty },
                { id: 'returns', label: copy.nav.returns },
                { id: 'liability', label: copy.nav.liability },
                { id: 'governing-law', label: copy.nav.governingLaw },
                { id: 'changes', label: copy.nav.changes },
                { id: 'contact', label: copy.nav.contact },
            ]}
        >
            <section id="overview" className="glass rounded-2xl p-6">
                <h2 className="text-xl font-semibold">{copy.intro.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{copy.intro.body}</p>
            </section>

            <section id="orders" className="glass rounded-2xl p-6">
                <h2 className="text-xl font-semibold">{copy.orders.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{copy.orders.body}</p>
            </section>

            <section id="pricing" className="glass rounded-2xl p-6">
                <h2 className="text-xl font-semibold">{copy.pricing.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{copy.pricing.body}</p>
            </section>

            <section id="ai-content" className="glass rounded-2xl p-6">
                <h2 className="text-xl font-semibold">{copy.aiContent.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{copy.aiContent.body}</p>
            </section>

            <section id="intellectual-property" className="glass rounded-2xl p-6">
                <h2 className="text-xl font-semibold">{copy.intellectualProperty.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{copy.intellectualProperty.body}</p>
            </section>

            <section id="returns" className="glass rounded-2xl p-6">
                <h2 className="text-xl font-semibold">{copy.returns.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{copy.returns.body}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                    <Link href={returnsHref} className="text-purple-300 hover:text-purple-200">
                        {copy.returns.returnsLinkLabel}
                    </Link>
                    <Link href={shippingHref} className="text-purple-300 hover:text-purple-200">
                        {copy.returns.shippingLinkLabel}
                    </Link>
                </div>
            </section>

            <section id="liability" className="glass rounded-2xl p-6">
                <h2 className="text-xl font-semibold">{copy.liability.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{copy.liability.body}</p>
            </section>

            <section id="governing-law" className="glass rounded-2xl p-6">
                <h2 className="text-xl font-semibold">{copy.governingLaw.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{copy.governingLaw.body}</p>
            </section>

            <section id="changes" className="glass rounded-2xl p-6">
                <h2 className="text-xl font-semibold">{copy.changes.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{copy.changes.body}</p>
            </section>

            <section id="contact" className="glass rounded-2xl p-6">
                <h2 className="text-xl font-semibold">{copy.contact.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{copy.contact.body}</p>
                <a
                    href={`mailto:${copy.contact.email}`}
                    className="mt-3 inline-flex text-sm text-purple-300 hover:text-purple-200"
                >
                    {copy.contact.email}
                </a>
                <div className="mt-3 text-sm text-muted-foreground">
                    {copy.contact.supportLinkLabel}{' '}
                    <Link href={supportHref} className="text-purple-300 hover:text-purple-200">
                        {copy.contact.supportLinkText}
                    </Link>
                </div>
            </section>
        </LegalPageLayout>
    )
}
