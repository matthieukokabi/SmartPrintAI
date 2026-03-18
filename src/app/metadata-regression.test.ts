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
import { buildLocalizedSchemaUrl } from '@/lib/schema'

function toLocalizedPath(locale: 'en' | 'fr' | 'de' | 'es', path: string) {
    if (locale === 'en') {
        return path
    }
    if (path === '/') {
        return `/${locale}`
    }
    return `/${locale}${path}`
}

function expectLocaleAlternates(languages: Record<string, string> | undefined, path: string) {
    expect(languages).toBeTruthy()
    expect(languages?.['x-default']).toBe(path)
    expect(languages?.en).toBe(path)
    expect(languages?.fr).toBe(toLocalizedPath('fr', path))
    expect(languages?.de).toBe(toLocalizedPath('de', path))
    expect(languages?.es).toBe(toLocalizedPath('es', path))
}

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
            expect(template.title).toBeTruthy()
            expect(template.description).toBeTruthy()
            expect(String(template.description || '').length).toBeGreaterThanOrEqual(50)
            expect(String(template.description || '').length).toBeLessThanOrEqual(200)
        }

        expectLocaleAlternates(homeMetadata.alternates?.languages as Record<string, string> | undefined, '/')
        expectLocaleAlternates(createMetadata.alternates?.languages as Record<string, string> | undefined, '/create')
        expectLocaleAlternates(productsMetadata.alternates?.languages as Record<string, string> | undefined, '/products')
        expectLocaleAlternates(blogMetadata.alternates?.languages as Record<string, string> | undefined, '/blog')
        expectLocaleAlternates(supportMetadata.alternates?.languages as Record<string, string> | undefined, '/support')
    })

    it('uses locale-aware OpenGraph metadata and keeps en canonical collapse for localized routes', () => {
        const localizedHome = generateLocalizedHomeMetadata({ params: { locale: 'fr' } })
        expect(localizedHome.openGraph?.locale).toBe('fr_FR')
        expect(localizedHome.openGraph?.url).toBe('https://smartprintai.com/fr')
        expectLocaleAlternates(localizedHome.alternates?.languages as Record<string, string> | undefined, '/')

        const localizedCreateEn = generateLocalizedCreateMetadata({ params: { locale: 'en' } })
        expect(localizedCreateEn.alternates?.canonical).toBe('/create')
        expect(localizedCreateEn.openGraph?.url).toBe('https://smartprintai.com/create')
        expect(localizedCreateEn.openGraph?.locale).toBe('en_US')
        expectLocaleAlternates(localizedCreateEn.alternates?.languages as Record<string, string> | undefined, '/create')

        const localizedProducts = generateLocalizedProductsMetadata({ params: { locale: 'de' } })
        expect(localizedProducts.openGraph?.locale).toBe('de_DE')
        expect(localizedProducts.openGraph?.url).toBe('https://smartprintai.com/de/products')
        expectLocaleAlternates(localizedProducts.alternates?.languages as Record<string, string> | undefined, '/products')

        const localizedBlog = generateLocalizedBlogMetadata({ params: { locale: 'es' } })
        expect(localizedBlog.openGraph?.locale).toBe('es_ES')
        expect(localizedBlog.openGraph?.url).toBe('https://smartprintai.com/es/blog')
        expectLocaleAlternates(localizedBlog.alternates?.languages as Record<string, string> | undefined, '/blog')

        const localizedSupport = generateLocalizedSupportMetadata({ params: { locale: 'fr' } })
        expect(localizedSupport.openGraph?.locale).toBe('fr_FR')
        expect(localizedSupport.openGraph?.url).toBe('https://smartprintai.com/fr/support')
        expectLocaleAlternates(localizedSupport.alternates?.languages as Record<string, string> | undefined, '/support')
    })

    it('keeps blog detail OpenGraph urls aligned with locale canonical paths', async () => {
        const slug = 'creative-ai-tshirt-ideas-for-dog-lovers'

        const defaultMeta = await generateBlogPostMetadata({ params: { slug } })
        expect(defaultMeta.openGraph?.url).toBe(`https://smartprintai.com/blog/${slug}`)
        expect(defaultMeta.openGraph?.locale).toBe('en_US')
        expect(defaultMeta.twitter?.title).toBeTruthy()
        expectLocaleAlternates(defaultMeta.alternates?.languages as Record<string, string> | undefined, `/blog/${slug}`)

        const localizedMetaEn = await generateLocalizedBlogPostMetadata({ params: { locale: 'en', slug } })
        expect(localizedMetaEn.alternates?.canonical).toBe(`/blog/${slug}`)
        expect(localizedMetaEn.openGraph?.url).toBe(`https://smartprintai.com/blog/${slug}`)
        expect(localizedMetaEn.openGraph?.locale).toBe('en_US')
        expectLocaleAlternates(localizedMetaEn.alternates?.languages as Record<string, string> | undefined, `/blog/${slug}`)

        const localizedMetaFr = await generateLocalizedBlogPostMetadata({ params: { locale: 'fr', slug } })
        expect(localizedMetaFr.openGraph?.url).toBe(`https://smartprintai.com/fr/blog/${slug}`)
        expect(localizedMetaFr.openGraph?.locale).toBe('fr_FR')
        expectLocaleAlternates(localizedMetaFr.alternates?.languages as Record<string, string> | undefined, `/blog/${slug}`)
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
        expectLocaleAlternates(defaultMeta.alternates?.languages as Record<string, string> | undefined, '/products/prod_1')

        const localizedMetaEn = await generateLocalizedProductMetadata({ params: { locale: 'en', id: 'prod_1' } })
        expect(localizedMetaEn.alternates?.canonical).toBe('/products/prod_1')
        expect(localizedMetaEn.openGraph?.url).toBe('https://smartprintai.com/products/prod_1')
        expect(localizedMetaEn.openGraph?.locale).toBe('en_US')
        expectLocaleAlternates(localizedMetaEn.alternates?.languages as Record<string, string> | undefined, '/products/prod_1')

        const localizedMetaDe = await generateLocalizedProductMetadata({ params: { locale: 'de', id: 'prod_1' } })
        expect(localizedMetaDe.alternates?.canonical).toBe('/de/products/prod_1')
        expect(localizedMetaDe.openGraph?.url).toBe('https://smartprintai.com/de/products/prod_1')
        expect(localizedMetaDe.openGraph?.locale).toBe('de_DE')
        expectLocaleAlternates(localizedMetaDe.alternates?.languages as Record<string, string> | undefined, '/products/prod_1')
    })

    it('keeps localized schema URLs aligned with canonical + hreflang metadata paths', async () => {
        const slug = 'creative-ai-tshirt-ideas-for-dog-lovers'
        const productPath = '/products/prod_1'
        const blogPath = `/blog/${slug}`

        mocks.findUnique.mockResolvedValue({
            id: 'prod_1',
            name: 'Premium Tee',
            description: 'Product description',
            imageUrl: '/images/prod_1.png',
        })

        const productEn = await generateLocalizedProductMetadata({ params: { locale: 'en', id: 'prod_1' } })
        expect(productEn.alternates?.canonical).toBe(productPath)
        expect(productEn.openGraph?.url).toBe(buildLocalizedSchemaUrl('en', productPath))

        const productDe = await generateLocalizedProductMetadata({ params: { locale: 'de', id: 'prod_1' } })
        expect(productDe.alternates?.canonical).toBe('/de/products/prod_1')
        expect(productDe.openGraph?.url).toBe(buildLocalizedSchemaUrl('de', productPath))

        const blogEn = await generateLocalizedBlogPostMetadata({ params: { locale: 'en', slug } })
        expect(blogEn.alternates?.canonical).toBe(blogPath)
        expect(blogEn.openGraph?.url).toBe(buildLocalizedSchemaUrl('en', blogPath))

        const blogFr = await generateLocalizedBlogPostMetadata({ params: { locale: 'fr', slug } })
        expect(blogFr.alternates?.canonical).toBe(`/fr/blog/${slug}`)
        expect(blogFr.openGraph?.url).toBe(buildLocalizedSchemaUrl('fr', blogPath))
    })
})
