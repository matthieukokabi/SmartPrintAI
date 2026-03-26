import { describe, expect, it } from 'vitest'

import {
    BASE_CHECKOUT_ALLOWED_COUNTRIES,
    findUnsupportedProductsForDestination,
    getAllowedCountriesForCart,
    getAllowedCountriesForProduct,
} from './product-destination-safety'

describe('product destination safety', () => {
    it('keeps base checkout countries for unrestricted products', () => {
        const allowed = getAllowedCountriesForProduct({
            id: 'prod-1',
            name: 'Premium Tee',
            printfulId: '401',
        })

        expect(allowed).toEqual([...BASE_CHECKOUT_ALLOWED_COUNTRIES])
    })

    it('reduces known us-only printful products to US only', () => {
        const allowed = getAllowedCountriesForProduct({
            id: 'prod-us-only',
            name: 'Acrylic Ornaments',
            printfulId: '793',
        })

        expect(allowed).toEqual(['US'])
    })

    it('intersects cart countries across restricted and unrestricted products', () => {
        const allowed = getAllowedCountriesForCart([
            { id: 'prod-us-only', name: 'Acrylic Ornaments', printfulId: '793' },
            { id: 'prod-global', name: 'Backpack', printfulId: '279' },
        ])

        expect(allowed).toEqual(['US'])
    })

    it('finds unsupported products for a non-us destination', () => {
        const blocked = findUnsupportedProductsForDestination(
            [
                { id: 'prod-us-only', name: 'Acrylic Ornaments', printfulId: '793' },
                { id: 'prod-global', name: 'Backpack', printfulId: '279' },
            ],
            'CH'
        )

        expect(blocked).toHaveLength(1)
        expect(blocked[0]).toEqual(
            expect.objectContaining({
                productId: 'prod-us-only',
                printfulId: '793',
                reason: 'printful_us_only_shipping',
                allowedCountries: ['US'],
            })
        )
    })

    it('returns no unsupported products for US destination', () => {
        const blocked = findUnsupportedProductsForDestination(
            [
                { id: 'prod-us-only', name: 'Acrylic Ornaments', printfulId: '793' },
                { id: 'prod-global', name: 'Backpack', printfulId: '279' },
            ],
            'us'
        )

        expect(blocked).toEqual([])
    })
})

