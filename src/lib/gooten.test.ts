import { describe, expect, it } from 'vitest'
import {
    extractGootenMinPrice,
    extractGootenProductColorNames,
    extractGootenProductId,
    extractGootenProductImageUrl,
    extractGootenProductName,
    extractGootenProductSizes,
    extractGootenProducts,
} from './gooten'

describe('Gooten payload extraction', () => {
    it('extracts products from top-level Products array', () => {
        const payload = {
            Products: [{ ProductId: 'TSHIRT_001' }, { ProductId: 'MUG_001' }],
        }

        expect(extractGootenProducts(payload)).toHaveLength(2)
    })

    it('extracts core product identity fields', () => {
        const productPayload = {
            ProductId: 'TSHIRT_001',
            Name: 'Premium Unisex T-Shirt',
        }

        expect(extractGootenProductId(productPayload)).toBe('TSHIRT_001')
        expect(extractGootenProductName(productPayload)).toBe('Premium Unisex T-Shirt')
    })

    it('extracts image URL from nested image arrays', () => {
        const productPayload = {
            Images: [{ Url: 'https://cdn.example.com/tshirt.jpg' }],
        }

        expect(extractGootenProductImageUrl(productPayload)).toBe('https://cdn.example.com/tshirt.jpg')
    })

    it('extracts sizes and colors from options', () => {
        const productPayload = {
            Options: [
                {
                    Name: 'Size',
                    Values: [{ Value: 'S' }, { Value: 'M' }, { Value: 'L' }],
                },
                {
                    Name: 'Color',
                    Values: [{ Value: 'Black' }, { Value: 'White' }],
                },
            ],
        }

        expect(extractGootenProductSizes(productPayload)).toEqual(['S', 'M', 'L'])
        expect(extractGootenProductColorNames(productPayload)).toEqual(['Black', 'White'])
    })

    it('extracts minimum price across direct and variant-level price fields', () => {
        const productPayload = {
            MinPrice: 24.99,
            Variants: [{ Price: 26.99 }, { UnitPrice: 21.5 }],
        }

        expect(extractGootenMinPrice(productPayload)).toBe(21.5)
    })
})
