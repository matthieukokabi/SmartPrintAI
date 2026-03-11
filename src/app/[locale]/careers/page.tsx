import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CareersLanding from '@/components/careers/CareersLanding'
import { SUPPORTED_LOCALES, buildLocaleAlternates, getLocaleCopy, isSupportedLocale, type SupportedLocale } from '@/lib/i18n'

type LocalizedCareersPageProps = {
    params: {
        locale: string
    }
}

export const dynamicParams = false

export function generateStaticParams() {
    return SUPPORTED_LOCALES.map((locale) => ({ locale }))
}

export function generateMetadata({ params }: LocalizedCareersPageProps): Metadata {
    if (!isSupportedLocale(params.locale)) {
        return {}
    }

    const locale = params.locale as SupportedLocale
    const copy = getLocaleCopy(locale).careers

    return {
        title: copy.metadataTitle,
        description: copy.metadataDescription,
        alternates: {
            canonical: `/${locale}/careers`,
            languages: buildLocaleAlternates('/careers'),
        },
    }
}

export default function LocalizedCareersPage({ params }: LocalizedCareersPageProps) {
    if (!isSupportedLocale(params.locale)) {
        notFound()
    }

    const copy = getLocaleCopy(params.locale).careers
    return <CareersLanding locale={params.locale} copy={copy} />
}
