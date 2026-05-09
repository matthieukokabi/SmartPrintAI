import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ReturnsPolicyContent from '@/components/legal/ReturnsPolicyContent'
import {
    DEFAULT_LOCALE,
    SUPPORTED_LOCALES,
    buildLocaleAlternates,
    buildLocaleCanonical,
    getLocaleCopy,
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
    const copy = getLocaleCopy(locale).returns
    const canonicalPath = buildLocaleCanonical(locale, '/returns')

    return {
        title: copy.metaTitle,
        description: copy.metaDescription,
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

    // Phase 1: fr/de/es bundles literally reference enReturnsCopy in
    // src/lib/i18n.ts, so this still renders English content for non-en
    // locales. Phase 2 swaps those references for localized constants.
    const copy = getLocaleCopy(locale).returns
    return <ReturnsPolicyContent copy={copy} />
}
