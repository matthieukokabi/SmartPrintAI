import { describe, expect, it } from 'vitest'
import { isBlockedGootenReadyToBuyProduct, splitBlockedGootenReadyToBuyProducts } from '@/lib/gooten-ready-to-buy-safety'

describe('gooten ready-to-buy safety gate', () => {
    it('blocks non-mockup-eligible gooten products', () => {
        expect(isBlockedGootenReadyToBuyProduct({
            name: 'Stainless Steel Travel Mug',
            printfulId: 'gooten:411',
            printArea: {
                providerProductId: '411',
                providerDefaultSku: 'StainlessSteelTravelMugsHandle-PolarCamel-20oz',
                variantMapping: {
                    white: 'StainlessSteelTravelMugsHandle-PolarCamel-20oz',
                },
            },
        })).toBe(true)
    })

    it('does not block mockup-eligible gooten products', () => {
        expect(isBlockedGootenReadyToBuyProduct({
            name: 'Gooten Hoodie',
            printfulId: 'gooten:12345',
            printArea: {
                providerProductId: '12345',
                providerDefaultSku: 'sku_white_m',
                variantMapping: {
                    white: 'sku_white_m',
                    black: 'sku_black_m',
                },
            },
        })).toBe(false)
    })

    it('does not block non-gooten products', () => {
        expect(isBlockedGootenReadyToBuyProduct({
            name: 'Classic Printful Tee',
            printfulId: '401',
            printArea: {
                width: 4500,
                height: 5400,
                dpi: 300,
            },
        })).toBe(false)
    })

    it('splits blocked and sellable products', () => {
        const result = splitBlockedGootenReadyToBuyProducts([
            {
                id: 'blocked-product',
                name: 'Stainless Steel Travel Mug',
                printfulId: 'gooten:411',
                printArea: {
                    providerProductId: '411',
                    providerDefaultSku: 'sku',
                    variantMapping: {
                        white: 'sku',
                    },
                },
            },
            {
                id: 'sellable-product',
                name: 'Premium Tee',
                printfulId: '401',
                printArea: { width: 4500, height: 5400, dpi: 300 },
            },
        ])

        expect(result.blocked.map((product) => (product as { id: string }).id)).toEqual(['blocked-product'])
        expect(result.sellable.map((product) => (product as { id: string }).id)).toEqual(['sellable-product'])
    })
})
