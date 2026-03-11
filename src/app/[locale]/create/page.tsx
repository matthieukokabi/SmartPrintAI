import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CreatePageClient from '@/components/create/CreatePageClient'
import { SUPPORTED_LOCALES, buildLocaleAlternates, getLocaleCopy, isSupportedLocale, type SupportedLocale } from '@/lib/i18n'

type LocaleCreatePageProps = {
    params: {
        locale: string
    }
}

export const dynamic = 'force-dynamic'
export const dynamicParams = false

export function generateStaticParams() {
    return SUPPORTED_LOCALES.map((locale) => ({ locale }))
}

export function generateMetadata({ params }: LocaleCreatePageProps): Metadata {
    if (!isSupportedLocale(params.locale)) {
        return {}
    }

    const locale = params.locale as SupportedLocale
    const copy = getLocaleCopy(locale).create

    return {
        title: copy.metadataTitle,
        description: copy.metadataDescription,
        alternates: {
            canonical: `/${locale}/create`,
            languages: buildLocaleAlternates('/create'),
        },
    }
}

export default function LocalizedCreatePage({ params }: LocaleCreatePageProps) {
    if (!isSupportedLocale(params.locale)) {
        notFound()
    }

    const locale = params.locale as SupportedLocale
    const copy = getLocaleCopy(locale).create

    return (
        <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-12" />}>
            <CreatePageClient locale={locale} copy={copy} />
        </Suspense>
    )
}
