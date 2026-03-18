import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    findUnique: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
    prisma: {
        product: {
            findUnique: mocks.findUnique,
        },
    },
}))

import { metadata as homeMetadata } from '@/app/page'
import { metadata as createMetadata } from '@/app/create/layout'
import { metadata as productsMetadata } from '@/app/products/page'
import { metadata as blogMetadata } from '@/app/blog/page'
import { metadata as supportMetadata } from '@/app/support/layout'
import { generateMetadata as generateLocalizedHomeMetadata } from '@/app/[locale]/page'
import { generateMetadata as generateLocalizedCreateMetadata } from '@/app/[locale]/create/page'
import { generateMetadata as generateLocalizedProductsMetadata } from '@/app/[locale]/products/page'
import { generateMetadata as generateLocalizedBlogMetadata } from '@/app/[locale]/blog/page'
import { generateMetadata as generateLocalizedSupportMetadata } from '@/app/[locale]/support/page'
import { generateMetadata as generateProductMetadata } from '@/app/products/[id]/page'
import { generateMetadata as generateLocalizedProductMetadata } from '@/app/[locale]/products/[id]/page'
import { generateMetadata as generateBlogPostMetadata } from '@/app/blog/[slug]/page'
import { generateMetadata as generateLocalizedBlogPostMetadata } from '@/app/[locale]/blog/[slug]/page'

describe('Wave 2 metadata regression coverage', () => {
    beforeEach(() => {
        process.env.NEXT_PUBLIC_APP_URL = 'https://smartprintai.com'
        mocks.findUnique.mockReset()
    })

    it('keeps social metadata present on key default templates', () => {
        const templates = [homeMetadata, createMetadata, productsMetadata, blogMetadata, supportMetadata]

        for (const template of templates) {
            expect(template.openGraph?.title).toBeTruthy()
            expect(template.openGraph?.description).toBeTruthy()
            expect(template.openGraph?.url).toBeTruthy()
            expect(template.twitter?.title).toBeTruthy()
            expect(template.twitter?.description).toBeTruthy()
        }
    })

    it('uses locale-aware OpenGraph metadata and keeps en canonical collapse for localized routes', () => {
        const localizedHome = generateLocalizedHomeMetadata({ params: { locale: 'fr' } })
        expect(localizedHome.openGraph?.locale).toBe('fr_FR')
        expect(localizedHome.openGraph?.url).toBe('https://smartprintai.com/fr')

        const localizedCreateEn = generateLocalizedCreateMetadata({ params: { locale: 'en' } })
        expect(localizedCreateEn.alternates?.canonical).toBe('/create')
        expect(localizedCreateEn.openGraph?.url).toBe('https://smartprintai.com/create')
        expect(localizedCreateEn.openGraph?.locale).toBe('en_US')

        const localizedProducts = generateLocalizedProductsMetadata({ params: { locale: 'de' } })
        expect(localizedProducts.openGraph?.locale).toBe('de_DE')
        expect(localizedProducts.openGraph?.url).toBe('https://smartprintai.com/de/products')

        const localizedBlog = generateLocalizedBlogMetadata({ params: { locale: 'es' } })
        expect(localizedBlog.openGraph?.locale).toBe('es_ES')
        expect(localizedBlog.openGraph?.url).toBe('https://smartprintai.com/es/blog')

        const localizedSupport = generateLocalizedSupportMetadata({ params: { locale: 'fr' } })
        expect(localizedSupport.openGraph?.locale).toBe('fr_FR')
        expect(localizedSupport.openGraph?.url).toBe('https://smartprintai.com/fr/support')
    })

    it('keeps blog detail OpenGraph urls aligned with locale canonical paths', async () => {
        const slug = 'creative-ai-tshirt-ideas-for-dog-lovers'

        const defaultMeta = await generateBlogPostMetadata({ params: { slug } })
        expect(defaultMeta.openGraph?.url).toBe(`https://smartprintai.com/blog/${slug}`)
        expect(defaultMeta.openGraph?.locale).toBe('en_US')
        expect(defaultMeta.twitter?.title).toBeTruthy()

        const localizedMetaEn = await generateLocalizedBlogPostMetadata({ params: { locale: 'en', slug } })
        expect(localizedMetaEn.alternates?.canonical).toBe(`/blog/${slug}`)
        expect(localizedMetaEn.openGraph?.url).toBe(`https://smartprintai.com/blog/${slug}`)
        expect(localizedMetaEn.openGraph?.locale).toBe('en_US')

        const localizedMetaFr = await generateLocalizedBlogPostMetadata({ params: { locale: 'fr', slug } })
        expect(localizedMetaFr.openGraph?.url).toBe(`https://smartprintai.com/fr/blog/${slug}`)
        expect(localizedMetaFr.openGraph?.locale).toBe('fr_FR')
    })

    it('keeps product detail social metadata localized and canonical-safe', async () => {
        mocks.findUnique.mockResolvedValue({
            id: 'prod_1',
            name: 'Premium Tee',
            description: 'Product description',
            imageUrl: '/images/prod_1.png',
        })

        const defaultMeta = await generateProductMetadata({ params: { id: 'prod_1' } })
        expect(defaultMeta.openGraph?.url).toBe('https://smartprintai.com/products/prod_1')
        expect(defaultMeta.openGraph?.locale).toBe('en_US')
        expect(defaultMeta.twitter?.images).toEqual(['https://smartprintai.com/images/prod_1.png'])

        const localizedMetaEn = await generateLocalizedProductMetadata({ params: { locale: 'en', id: 'prod_1' } })
        expect(localizedMetaEn.alternates?.canonical).toBe('/products/prod_1')
        expect(localizedMetaEn.openGraph?.url).toBe('https://smartprintai.com/products/prod_1')
        expect(localizedMetaEn.openGraph?.locale).toBe('en_US')

        const localizedMetaDe = await generateLocalizedProductMetadata({ params: { locale: 'de', id: 'prod_1' } })
        expect(localizedMetaDe.alternates?.canonical).toBe('/de/products/prod_1')
        expect(localizedMetaDe.openGraph?.url).toBe('https://smartprintai.com/de/products/prod_1')
        expect(localizedMetaDe.openGraph?.locale).toBe('de_DE')
    })
})

