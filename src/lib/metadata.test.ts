import { beforeEach, describe, expect, it } from 'vitest'
import { buildLocalizedSocialMetadata } from './metadata'

describe('buildLocalizedSocialMetadata', () => {
    beforeEach(() => {
        process.env.NEXT_PUBLIC_APP_URL = 'https://smartprintai.com'
    })

    it('builds locale-specific OpenGraph and Twitter metadata with absolute URLs', () => {
        const metadata = buildLocalizedSocialMetadata({
            locale: 'fr',
            path: '/fr/create',
            title: 'Creer votre design',
            description: 'Generez votre design avec IA.',
        })

        expect(metadata.openGraph).toMatchObject({
            locale: 'fr_FR',
            url: 'https://smartprintai.com/fr/create',
            title: 'Creer votre design',
            description: 'Generez votre design avec IA.',
        })
        expect(metadata.openGraph?.alternateLocale).toEqual(['en_US', 'de_DE', 'es_ES'])
        expect(metadata.twitter).toMatchObject({
            card: 'summary_large_image',
            title: 'Creer votre design',
            description: 'Generez votre design avec IA.',
            images: ['https://smartprintai.com/opengraph-image.png'],
        })
    })

    it('uses default social image and normalizes non-prefixed paths', () => {
        const metadata = buildLocalizedSocialMetadata({
            locale: 'en',
            path: 'products',
            title: 'All Products',
            description: 'Browse catalog',
        })

        expect(metadata.openGraph?.url).toBe('https://smartprintai.com/products')
        expect(metadata.openGraph?.images).toEqual(['https://smartprintai.com/opengraph-image.png'])
        expect(metadata.twitter?.images).toEqual(['https://smartprintai.com/opengraph-image.png'])
    })

    it('uses provided image list for OpenGraph and Twitter', () => {
        const metadata = buildLocalizedSocialMetadata({
            locale: 'de',
            path: '/products/prod_1',
            title: 'Produkt',
            description: 'Beschreibung',
            images: ['https://cdn.example.com/prod_1.png'],
        })

        expect(metadata.openGraph?.images).toEqual(['https://cdn.example.com/prod_1.png'])
        expect(metadata.twitter?.images).toEqual(['https://cdn.example.com/prod_1.png'])
    })
})

