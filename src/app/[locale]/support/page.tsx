import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SupportPageClient from '@/components/support/SupportPageClient'
import { SUPPORTED_LOCALES, buildLocaleAlternates, buildLocaleCanonical, getLocaleCopy, isSupportedLocale, type SupportedLocale } from '@/lib/i18n'
import { buildLocalizedSocialMetadata } from '@/lib/metadata'

type LocaleSupportPageProps = {
    params: {
        locale: string
    }
}

export const dynamic = 'force-dynamic'
export const dynamicParams = false

export function generateStaticParams() {
    return SUPPORTED_LOCALES.map((locale) => ({ locale }))
}

export function generateMetadata({ params }: LocaleSupportPageProps): Metadata {
    if (!isSupportedLocale(params.locale)) {
        return {}
    }

    const locale = params.locale as SupportedLocale
    const copy = getLocaleCopy(locale).support
    const canonicalPath = buildLocaleCanonical(locale, '/support')

    return {
        title: copy.metadataTitle,
        description: copy.metadataDescription,
        alternates: {
            canonical: canonicalPath,
            languages: buildLocaleAlternates('/support'),
        },
        ...buildLocalizedSocialMetadata({
            locale,
            path: canonicalPath,
            title: copy.metadataTitle,
            description: copy.metadataDescription,
        }),
    }
}

export default function LocalizedSupportPage({ params }: LocaleSupportPageProps) {
    if (!isSupportedLocale(params.locale)) {
        notFound()
    }

    const locale = params.locale as SupportedLocale
    const copy = getLocaleCopy(locale).support

    return <SupportPageClient locale={locale} copy={copy} />
}
