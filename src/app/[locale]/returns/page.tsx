import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ReturnsPolicyContent from '@/components/legal/ReturnsPolicyContent'
import {
    DEFAULT_LOCALE,
    SUPPORTED_LOCALES,
    buildLocaleAlternates,
    buildLocaleCanonical,
    isSupportedLocale,
    type SupportedLocale,
} from '@/lib/i18n'

type LocaleReturnsPageProps = {
    params: {
        locale: string
    }
}

export const dynamic = 'force-dynamic'
export const dynamicParams = false

export function generateStaticParams() {
    return SUPPORTED_LOCALES.map((locale) => ({ locale }))
}

export function generateMetadata({ params }: LocaleReturnsPageProps): Metadata {
    if (!isSupportedLocale(params.locale)) {
        return {}
    }

    const locale = params.locale as SupportedLocale
    const canonicalPath = buildLocaleCanonical(locale, '/returns')

    return {
        title: 'Returns & Refund Policy',
        description: 'How to return or refund a custom AI-designed product from SmartPrintAI, including eligibility, timelines, and contact details.',
        alternates: {
            canonical: canonicalPath,
            languages: buildLocaleAlternates('/returns'),
        },
    }
}

export default function LocalizedReturnsPage({ params }: LocaleReturnsPageProps) {
    if (!isSupportedLocale(params.locale)) {
        notFound()
    }

    const locale = params.locale as SupportedLocale
    if (locale === DEFAULT_LOCALE) {
        // Default locale (en) is served at /returns, not /en/returns —
        // matches the convention used by /[locale]/create.
        notFound()
    }

    // INTERIM: English fallback. The policy content is hard-coded
    // English in ReturnsPolicyContent.tsx. Tracked as a P2 follow-up
    // in TODO.md — when fr/de/es translations land, replace this
    // with a locale-keyed render via getLocaleCopy(locale).returns.
    return <ReturnsPolicyContent />
}
