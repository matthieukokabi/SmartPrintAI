import type { Metadata } from 'next'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from './i18n'
import { toAbsoluteUrl } from './site'

const OPEN_GRAPH_LOCALE_BY_LOCALE: Record<SupportedLocale, string> = {
    en: 'en_US',
    fr: 'fr_FR',
    de: 'de_DE',
    es: 'es_ES',
}

const DEFAULT_SOCIAL_IMAGE = '/opengraph-image.png'

type LocalizedSocialMetadataInput = {
    locale: SupportedLocale
    path: string
    title: string
    description: string
    type?: 'website' | 'article'
    images?: string[]
}

function normalizePath(path: string): string {
    return path.startsWith('/') ? path : `/${path}`
}

export function buildLocalizedSocialMetadata(input: LocalizedSocialMetadataInput): Pick<Metadata, 'openGraph' | 'twitter'> {
    const path = normalizePath(input.path)
    const socialImages = (input.images && input.images.length > 0 ? input.images : [DEFAULT_SOCIAL_IMAGE]).map((image) =>
        toAbsoluteUrl(image)
    )
    const openGraphLocale = OPEN_GRAPH_LOCALE_BY_LOCALE[input.locale] || OPEN_GRAPH_LOCALE_BY_LOCALE[DEFAULT_LOCALE]
    const alternateLocales = SUPPORTED_LOCALES.filter((locale) => locale !== input.locale).map(
        (locale) => OPEN_GRAPH_LOCALE_BY_LOCALE[locale]
    )

    return {
        openGraph: {
            title: input.title,
            description: input.description,
            type: input.type || 'website',
            siteName: 'SmartPrintAI',
            url: toAbsoluteUrl(path),
            locale: openGraphLocale,
            alternateLocale: alternateLocales,
            images: socialImages,
        },
        twitter: {
            card: 'summary_large_image',
            title: input.title,
            description: input.description,
            images: socialImages,
        },
    }
}

