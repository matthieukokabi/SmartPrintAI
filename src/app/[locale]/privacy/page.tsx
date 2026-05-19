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
    const copy = getLocaleCopy(locale).privacy
    return {
        title: copy.metadata.title,
        description: copy.metadata.description,
        alternates: {
            canonical: locale === 'en' ? '/privacy' : `/${locale}/privacy`,
        },
    }
}

export default function LocalizedPrivacyPage({ params }: PageProps) {
    const locale = resolveLocale(params.locale)
    const copy = getLocaleCopy(locale).privacy

    return (
        <LegalPageLayout
            title={copy.headerTitle}
            effectiveDate={copy.effectiveDate}
            lastUpdated={copy.lastUpdated}
            sections={[
                { id: 'overview', label: copy.nav.overview },
                { id: 'processors', label: copy.nav.processors },
                { id: 'cookies', label: copy.nav.cookies },
                { id: 'your-rights', label: copy.nav.yourRights },
                { id: 'retention', label: copy.nav.retention },
                { id: 'contact', label: copy.nav.contact },
            ]}
        >
            <section id="overview" className="glass rounded-2xl p-6">
                <h2 className="text-xl font-semibold">{copy.intro.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{copy.intro.body}</p>
                <p className="mt-3 text-sm text-muted-foreground">{copy.intro.controller}</p>
            </section>

            <section id="processors" className="glass rounded-2xl p-6">
                <h2 className="text-xl font-semibold">{copy.processors.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{copy.processors.intro}</p>
                <ul className="mt-4 space-y-3 text-sm">
                    {copy.processors.items.map((p, i) => (
                        <li key={i} className="border-l-2 border-purple-500/40 pl-3">
                            <div className="font-medium text-foreground">{p.name}</div>
                            <div className="text-muted-foreground">{p.role}</div>
                            <div className="text-xs text-muted-foreground">{p.region}</div>
                        </li>
                    ))}
                </ul>
            </section>

            <section id="cookies" className="glass rounded-2xl p-6">
                <h2 className="text-xl font-semibold">{copy.cookies.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{copy.cookies.intro}</p>
                <div className="mt-4 space-y-3 text-sm">
                    <div>
                        <h3 className="font-medium text-foreground">{copy.cookies.essential.title}</h3>
                        <p className="text-muted-foreground">{copy.cookies.essential.body}</p>
                    </div>
                    <div>
                        <h3 className="font-medium text-foreground">{copy.cookies.analytics.title}</h3>
                        <p className="text-muted-foreground">{copy.cookies.analytics.body}</p>
                    </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{copy.cookies.consentNote}</p>
            </section>

            <section id="your-rights" className="glass rounded-2xl p-6">
                <h2 className="text-xl font-semibold">{copy.yourRights.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{copy.yourRights.intro}</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {copy.yourRights.items.map((r, i) => (
                        <li key={i}>{r}</li>
                    ))}
                </ul>
                <p className="mt-3 text-sm text-muted-foreground">{copy.yourRights.howToExercise}</p>
                <p className="mt-2 text-sm text-muted-foreground">{copy.yourRights.supervisoryAuthority}</p>
            </section>

            <section id="retention" className="glass rounded-2xl p-6">
                <h2 className="text-xl font-semibold">{copy.retention.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{copy.retention.intro}</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {copy.retention.items.map((r, i) => (
                        <li key={i}>
                            <span className="font-medium text-foreground">{r.category}:</span> {r.period}
                        </li>
                    ))}
                </ul>
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
                    <Link
                        href={locale === 'en' ? '/support' : `/${locale}/support`}
                        className="text-purple-300 hover:text-purple-200"
                    >
                        {copy.contact.supportLinkText}
                    </Link>
                </div>
            </section>
        </LegalPageLayout>
    )
}
