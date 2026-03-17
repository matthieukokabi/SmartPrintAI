import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import HomeLanding from '@/components/home/HomeLanding'
import { SUPPORTED_LOCALES, buildLocaleAlternates, buildLocaleCanonical, getLocaleCopy, isSupportedLocale, type SupportedLocale } from '@/lib/i18n'

type LocalePageProps = {
    params: {
        locale: string
    }
}

export const dynamic = 'force-dynamic'
export const dynamicParams = false

export function generateStaticParams() {
    return SUPPORTED_LOCALES.map((locale) => ({ locale }))
}

export function generateMetadata({ params }: LocalePageProps): Metadata {
    if (!isSupportedLocale(params.locale)) {
        return {}
    }

    const locale = params.locale as SupportedLocale
    const copy = getLocaleCopy(locale).home

    return {
        title: copy.metadataTitle,
        description: copy.metadataDescription,
        alternates: {
            canonical: buildLocaleCanonical(locale, '/'),
            languages: buildLocaleAlternates('/'),
        },
    }
}

export default function LocalizedHomePage({ params }: LocalePageProps) {
    if (!isSupportedLocale(params.locale)) {
        notFound()
    }

    const copy = getLocaleCopy(params.locale).home
    return <HomeLanding locale={params.locale} copy={copy} />
}
