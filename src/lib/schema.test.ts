import { beforeEach, describe, expect, it } from 'vitest'
import { buildBreadcrumbList, buildLocalizedSchemaUrl, buildProductOfferSchema, getBreadcrumbLabel } from './schema'

describe('schema helpers', () => {
    beforeEach(() => {
        process.env.NEXT_PUBLIC_APP_URL = 'https://print.zuerifix.tech'
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
                item: 'https://print.zuerifix.tech/',
            }),
            expect.objectContaining({
                '@type': 'ListItem',
                position: 2,
                name: 'Products',
                item: 'https://print.zuerifix.tech/products',
            }),
            expect.objectContaining({
                '@type': 'ListItem',
                position: 3,
                name: 'Premium Tee',
                item: 'https://print.zuerifix.tech/products/prod_1',
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
            url: 'https://print.zuerifix.tech/products/prod_1',
            hasMerchantReturnPolicy: {
                '@type': 'MerchantReturnPolicy',
                url: 'https://print.zuerifix.tech/returns',
            },
        })

        // One OfferShippingDetails per checkout service, each covering the
        // nine countries checkout accepts, with the rates the feed publishes.
        const shipping = offer.shippingDetails
        expect(shipping).toHaveLength(2)
        expect(shipping.map((d) => d.name)).toEqual(['Standard Shipping', 'Express Shipping'])
        expect(shipping.map((d) => d.shippingRate.value)).toEqual(['5.99', '12.99'])
        for (const d of shipping) {
            expect(d['@type']).toBe('OfferShippingDetails')
            expect(d.shippingRate.currency).toBe('USD')
            expect(d.shippingDestination.map((r) => r.addressCountry)).toEqual(['US', 'CA', 'GB', 'DE', 'FR', 'AU', 'NL', 'BE', 'CH'])
        }
    })

    it('returns localized breadcrumb labels', () => {
        expect(getBreadcrumbLabel('fr', 'home')).toBe('Accueil')
        expect(getBreadcrumbLabel('de', 'products')).toBe('Produkte')
        expect(getBreadcrumbLabel('es', 'create')).toBe('Crear')
    })

    it('builds schema URLs that stay aligned with locale canonical policy', () => {
        expect(buildLocalizedSchemaUrl('en', '/products/prod_1')).toBe('https://print.zuerifix.tech/products/prod_1')
        expect(buildLocalizedSchemaUrl('fr', '/products/prod_1')).toBe('https://print.zuerifix.tech/fr/products/prod_1')
        expect(buildLocalizedSchemaUrl('en', '/blog/post-1')).toBe('https://print.zuerifix.tech/blog/post-1')
        expect(buildLocalizedSchemaUrl('de', '/blog/post-1')).toBe('https://print.zuerifix.tech/de/blog/post-1')
    })
})
