import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import CartPageClient from '@/components/cart/CartPageClient'
import { SUPPORTED_LOCALES, buildLocaleAlternates, buildLocaleCanonical, getLocaleCopy, getLocalizedPath, isSupportedLocale, type SupportedLocale } from '@/lib/i18n'

type LocaleCartPageProps = {
    params: {
        locale: string
    }
}

export const dynamic = 'force-dynamic'
export const dynamicParams = false

export function generateStaticParams() {
    return SUPPORTED_LOCALES.map((locale) => ({ locale }))
}

export function generateMetadata({ params }: LocaleCartPageProps): Metadata {
    if (!isSupportedLocale(params.locale)) {
        return {}
    }

    const locale = params.locale as SupportedLocale
    const copy = getLocaleCopy(locale).cart

    return {
        title: copy.metadataTitle,
        alternates: {
            canonical: buildLocaleCanonical(locale, '/cart'),
            languages: buildLocaleAlternates('/cart'),
        },
        robots: {
            index: false,
            follow: false,
        },
    }
}

export default function LocalizedCartPage({ params }: LocaleCartPageProps) {
    if (!isSupportedLocale(params.locale)) {
        notFound()
    }

    const locale = params.locale as SupportedLocale
    const copy = getLocaleCopy(locale).cart

    return <CartPageClient locale={locale} createPath={getLocalizedPath(locale, '/create')} copy={copy} />
}
