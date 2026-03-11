import Link from 'next/link'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import type { LocaleCopy, SupportedLocale } from '@/lib/i18n'

interface CareersLandingProps {
    locale: SupportedLocale
    copy: LocaleCopy['careers']
}

export default function CareersLanding({ locale, copy }: CareersLandingProps) {
    const [beforeEmail, afterEmail = ''] = copy.closingLine.split('hello@smartprintai.com')

    return (
        <div className="max-w-6xl mx-auto px-4 py-14 space-y-12">
            <div className="flex justify-end">
                <LanguageSwitcher currentLocale={locale} pagePath="/careers" />
            </div>
            <section className="glass rounded-3xl p-8 sm:p-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.25),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(236,72,153,0.18),transparent_40%)]" />
                <div className="relative z-10 space-y-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-purple-300/90">{copy.eyebrow}</p>
                    <h1 className="text-3xl sm:text-5xl font-bold max-w-3xl leading-tight">
                        {copy.titleLead} <span className="text-gradient">{copy.titleAccent}</span>
                    </h1>
                    <p className="text-muted-foreground max-w-2xl">
                        {copy.subtitle}
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2">
                        <a
                            href="mailto:hello@smartprintai.com?subject=SmartPrintAI%20Career%20Application"
                            className="inline-flex items-center px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity"
                        >
                            {copy.applyButton}
                        </a>
                        <Link
                            href="/products"
                            className="inline-flex items-center px-5 py-2.5 rounded-full border border-white/15 text-sm text-muted-foreground hover:text-foreground hover:border-purple-400/40 transition-colors"
                        >
                            {copy.exploreButton}
                        </Link>
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold">{copy.roleSectionTitle}</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {copy.openRoles.map((role) => (
                        <article key={role.title} className="glass rounded-2xl p-6 space-y-3">
                            <h3 className="text-xl font-semibold">{role.title}</h3>
                            <p className="text-xs text-purple-300/90 uppercase tracking-wide">
                                {role.type} • {role.location}
                            </p>
                            <p className="text-sm text-muted-foreground">{role.summary}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="glass rounded-2xl p-7 sm:p-8 space-y-4">
                <h2 className="text-2xl font-bold">{copy.valuesTitle}</h2>
                <ul className="space-y-3 text-sm text-muted-foreground">
                    {copy.values.map((value) => (
                        <li key={value} className="flex gap-3">
                            <span className="mt-1 block w-2 h-2 rounded-full bg-purple-400" />
                            <span>{value}</span>
                        </li>
                    ))}
                </ul>
                <p className="text-sm text-muted-foreground pt-2">
                    {beforeEmail}
                    <a className="text-purple-300 hover:text-purple-200" href="mailto:hello@smartprintai.com">
                        hello@smartprintai.com
                    </a>
                    {afterEmail}
                </p>
            </section>
        </div>
    )
}
