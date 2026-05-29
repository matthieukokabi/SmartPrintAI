import { Suspense } from 'react'
import type { Metadata } from 'next'
import CreatePageClient from '@/components/create/CreatePageClient'
import TrustSignalStrip from '@/components/shared/TrustSignalStrip'
import { DEFAULT_LOCALE, buildLocaleAlternates, getLocaleCopy } from '@/lib/i18n'
import { buildLocalizedSocialMetadata } from '@/lib/metadata'
import { buildBreadcrumbList, getBreadcrumbLabel } from '@/lib/schema'

const copy = getLocaleCopy(DEFAULT_LOCALE).create

type CreatePageProps = {
    searchParams?: Record<string, string | string[] | undefined>
}

// /create?productId=X&color=Y&size=Z and /create?utm_source=... are
// parametric variants of the same design canvas. The page server-
// renders only a thin Suspense fallback (the actual editor is client-
// side), so Google flags query-bearing URLs as Soft 404 even when the
// canonical points back to /create. The fix: emit noindex when any
// query param is present so Google drops the variant from the index
// while still consolidating link equity onto the canonical /create.
// Permissive any-param check intentionally covers productId/color/size
// (internal links from product detail pages) AND utm_* (marketing
// campaign URLs that should never be indexed individually).
//
// NOT solved via robots.txt: see src/app/robots.ts — blocking at the
// robots level prevented Google from seeing the canonical tag, which
// the GSC alert on 2026-05-05 surfaced.
export function generateMetadata({ searchParams }: CreatePageProps): Metadata {
    const base: Metadata = {
        title: copy.metadataTitle,
        description: copy.metadataDescription,
        alternates: {
            canonical: '/create',
            languages: buildLocaleAlternates('/create'),
        },
        ...buildLocalizedSocialMetadata({
            locale: DEFAULT_LOCALE,
            path: '/create',
            title: copy.metadataTitle,
            description: copy.metadataDescription,
        }),
    }

    if (searchParams && Object.keys(searchParams).length > 0) {
        return { ...base, robots: { index: false, follow: true } }
    }
    return base
}

export default function CreatePage() {
    const locale = DEFAULT_LOCALE
    const breadcrumbSchema = buildBreadcrumbList([
        { name: getBreadcrumbLabel(locale, 'home'), path: '/' },
        { name: getBreadcrumbLabel(locale, 'create'), path: '/create' },
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
                        <TrustSignalStrip locale={locale} className="mb-8" />
                    </div>
                }
            >
                <CreatePageClient locale={locale} copy={copy} />
            </Suspense>
        </>
    )
}
