import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SuccessPageClient from '@/components/order/SuccessPageClient'
import {
    SUPPORTED_LOCALES,
    buildLocaleAlternates,
    buildLocaleCanonical,
    getLocaleCopy,
    getLocalizedPath,
    isSupportedLocale,
    type SupportedLocale,
} from '@/lib/i18n'

type LocaleSuccessPageProps = {
    params: {
        locale: string
    }
}

export const dynamic = 'force-dynamic'
export const dynamicParams = false

export function generateStaticParams() {
    return SUPPORTED_LOCALES.map((locale) => ({ locale }))
}

export function generateMetadata({ params }: LocaleSuccessPageProps): Metadata {
    if (!isSupportedLocale(params.locale)) {
        return {}
    }

    const locale = params.locale as SupportedLocale
    const copy = getLocaleCopy(locale).success

    return {
        title: copy.metadataTitle,
        alternates: {
            canonical: buildLocaleCanonical(locale, '/success'),
            languages: buildLocaleAlternates('/success'),
        },
        robots: {
            index: false,
            follow: false,
        },
    }
}

export default function LocalizedSuccessPage({ params }: LocaleSuccessPageProps) {
    if (!isSupportedLocale(params.locale)) {
        notFound()
    }

    const locale = params.locale as SupportedLocale
    const copy = getLocaleCopy(locale).success

    return (
        <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-24" />}>
            <SuccessPageClient locale={locale} copy={copy} createPath={getLocalizedPath(locale, '/create')} />
        </Suspense>
    )
}
