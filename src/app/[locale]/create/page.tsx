import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CreatePageClient from '@/components/create/CreatePageClient'
import { SUPPORTED_LOCALES, buildLocaleAlternates, buildLocaleCanonical, getLocaleCopy, isSupportedLocale, type SupportedLocale } from '@/lib/i18n'
import { buildLocalizedSocialMetadata } from '@/lib/metadata'
import { buildBreadcrumbList, getBreadcrumbLabel } from '@/lib/schema'

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
    const canonicalPath = buildLocaleCanonical(locale, '/create')

    return {
        title: copy.metadataTitle,
        description: copy.metadataDescription,
        alternates: {
            canonical: canonicalPath,
            languages: buildLocaleAlternates('/create'),
        },
        ...buildLocalizedSocialMetadata({
            locale,
            path: canonicalPath,
            title: copy.metadataTitle,
            description: copy.metadataDescription,
        }),
    }
}

export default function LocalizedCreatePage({ params }: LocaleCreatePageProps) {
    if (!isSupportedLocale(params.locale)) {
        notFound()
    }

    const locale = params.locale as SupportedLocale
    const copy = getLocaleCopy(locale).create
    const createPath = buildLocaleCanonical(locale, '/create')
    const homePath = buildLocaleCanonical(locale, '/')
    const breadcrumbSchema = buildBreadcrumbList([
        { name: getBreadcrumbLabel(locale, 'home'), path: homePath },
        { name: getBreadcrumbLabel(locale, 'create'), path: createPath },
    ])

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />
            <Suspense
                fallback={
                    <div className="max-w-7xl mx-auto px-4 py-12">
                        <div className="text-center mb-12">
                            <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                                {copy.titleLead} <span className="text-gradient">{copy.titleAccent}</span>
                            </h1>
                            <p className="text-muted-foreground">{copy.subtitle}</p>
                        </div>
                    </div>
                }
            >
                <CreatePageClient locale={locale} copy={copy} />
            </Suspense>
        </>
    )
}
