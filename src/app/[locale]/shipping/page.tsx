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

type LocaleShippingPageProps = {
    params: {
        locale: string
    }
}

export const dynamic = 'force-dynamic'
export const dynamicParams = false

export function generateStaticParams() {
    return SUPPORTED_LOCALES.map((locale) => ({ locale }))
}

export function generateMetadata({ params }: LocaleShippingPageProps): Metadata {
    if (!isSupportedLocale(params.locale)) {
        return {}
    }

    const locale = params.locale as SupportedLocale
    const copy = getLocaleCopy(locale).shipping
    const canonicalPath = buildLocaleCanonical(locale, '/shipping')

    return {
        title: copy.metaTitle,
        description: copy.metaDescription,
        alternates: {
            canonical: canonicalPath,
            languages: buildLocaleAlternates('/shipping'),
        },
    }
}

export default function LocalizedShippingPage({ params }: LocaleShippingPageProps) {
    if (!isSupportedLocale(params.locale)) {
        notFound()
    }

    const locale = params.locale as SupportedLocale
    if (locale === DEFAULT_LOCALE) {
        // Default locale (en) is served at /shipping, not /en/shipping —
        // matches the convention used by /[locale]/returns and /[locale]/create.
        notFound()
    }

    const copy = getLocaleCopy(locale).shipping
    return <ReturnsPolicyContent copy={copy} />
}
