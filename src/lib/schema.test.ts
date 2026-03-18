import { beforeEach, describe, expect, it } from 'vitest'
import { buildBreadcrumbList, buildLocalizedSchemaUrl, buildProductOfferSchema, getBreadcrumbLabel } from './schema'

describe('schema helpers', () => {
    beforeEach(() => {
        process.env.NEXT_PUBLIC_APP_URL = 'https://smartprintai.com'
    })

    it('builds BreadcrumbList with absolute item URLs and stable positions', () => {
        const schema = buildBreadcrumbList([
            { name: 'Home', path: '/' },
            { name: 'Products', path: '/products' },
            { name: 'Premium Tee', path: '/products/prod_1' },
        ])

        expect(schema['@type']).toBe('BreadcrumbList')
        expect(schema.itemListElement).toEqual([
            expect.objectContaining({
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://smartprintai.com/',
            }),
            expect.objectContaining({
                '@type': 'ListItem',
                position: 2,
                name: 'Products',
                item: 'https://smartprintai.com/products',
            }),
            expect.objectContaining({
                '@type': 'ListItem',
                position: 3,
                name: 'Premium Tee',
                item: 'https://smartprintai.com/products/prod_1',
            }),
        ])
    })

    it('builds enriched Offer schema with shipping and return policy fields', () => {
        const offer = buildProductOfferSchema({
            path: '/products/prod_1',
            sellPrice: 29.99,
            currency: 'usd',
        })

        expect(offer).toMatchObject({
            '@type': 'Offer',
            priceCurrency: 'USD',
            price: '29.99',
            availability: 'https://schema.org/InStock',
            url: 'https://smartprintai.com/products/prod_1',
            shippingDetails: {
                '@type': 'OfferShippingDetails',
            },
            hasMerchantReturnPolicy: {
                '@type': 'MerchantReturnPolicy',
                url: 'https://smartprintai.com/terms',
            },
        })
    })

    it('returns localized breadcrumb labels', () => {
        expect(getBreadcrumbLabel('fr', 'home')).toBe('Accueil')
        expect(getBreadcrumbLabel('de', 'products')).toBe('Produkte')
        expect(getBreadcrumbLabel('es', 'create')).toBe('Crear')
    })

    it('builds schema URLs that stay aligned with locale canonical policy', () => {
        expect(buildLocalizedSchemaUrl('en', '/products/prod_1')).toBe('https://smartprintai.com/products/prod_1')
        expect(buildLocalizedSchemaUrl('fr', '/products/prod_1')).toBe('https://smartprintai.com/fr/products/prod_1')
        expect(buildLocalizedSchemaUrl('en', '/blog/post-1')).toBe('https://smartprintai.com/blog/post-1')
        expect(buildLocalizedSchemaUrl('de', '/blog/post-1')).toBe('https://smartprintai.com/de/blog/post-1')
    })
})
