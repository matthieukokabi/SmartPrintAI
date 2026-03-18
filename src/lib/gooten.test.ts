import { describe, expect, it } from 'vitest'
import {
    extractGootenLayerIdOptionsFromError,
    extractGootenMinPrice,
    extractGootenProductColorNames,
    extractGootenProductId,
    extractGootenProductImageUrl,
    extractGootenProductName,
    extractGootenSpaceIdOptionsFromError,
    extractGootenProductSizes,
    extractGootenProducts,
    extractGootenPreviewUrl,
    extractGootenVariantMapping,
    extractGootenVariants,
} from './gooten'

describe('Gooten payload extraction', () => {
    it('extracts products from top-level Products array', () => {
        const payload = {
            Products: [{ ProductId: 'TSHIRT_001' }, { ProductId: 'MUG_001' }],
        }

        expect(extractGootenProducts(payload)).toHaveLength(2)
    })

    it('extracts products from gooten catalog feed payload', () => {
        const payload = {
            'product-catalog': [
                {
                    name: 'Bestsellers',
                    items: [
                        {
                            product_id: 352,
                            name: 'Woven Pillows',
                            url: 'https://appassets.azureedge.net/product-throwpillows/Preview/Latest/Pillow_Woven_Catalog_Photo_01.png',
                            cheapest_price: '$22.40',
                        },
                    ],
                },
            ],
        }

        expect(extractGootenProducts(payload)).toEqual([
            expect.objectContaining({
                ProductId: '352',
                name: 'Woven Pillows',
                ImageUrl:
                    'https://appassets.azureedge.net/product-throwpillows/Preview/Latest/Pillow_Woven_Catalog_Photo_01.png',
                MinPrice: 22.4,
            }),
        ])
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
            Images: [{ Url: 'https://az412349.cdn.gooten.com/product-tshirts/Preview/New/TShirt_Catalog_1.jpg' }],
        }

        expect(extractGootenProductImageUrl(productPayload)).toBe(
            'https://az412349.cdn.gooten.com/product-tshirts/Preview/New/TShirt_Catalog_1.jpg'
        )
    })

    it('normalizes malformed nested gooten image URLs', () => {
        const malformed =
            'https://appassets.azureedge.net/https://appassets.azureedge.net/product-wineglasses/Preview/Stemmed_Wine_Glass_Catalog_Photo_01.png'

        expect(extractGootenProductImageUrl({ url: malformed })).toBe(
            'https://appassets.azureedge.net/product-wineglasses/Preview/Stemmed_Wine_Glass_Catalog_Photo_01.png'
        )
    })

    it('suppresses unsupported media hosts when extracting product images', () => {
        const productPayload = {
            ImageUrl: 'https://printmeeappassets.blob.core.windows.net/product-preview.png',
            Images: [{ Url: 'https://appassets.azureedge.net/product-mugs/Preview/Mug_Catalog_01.jpg' }],
        }

        expect(extractGootenProductImageUrl(productPayload)).toBe(
            'https://appassets.azureedge.net/product-mugs/Preview/Mug_Catalog_01.jpg'
        )
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

    it('parses minimum price from currency string fields', () => {
        const productPayload = {
            cheapest_price: '$19.95',
            Price: '$24.10',
        }

        expect(extractGootenMinPrice(productPayload)).toBe(19.95)
    })

    it('extracts variants from product variant payload arrays', () => {
        const payload = {
            ProductVariants: [{ SKU: 'sku_1' }, { SKU: 'sku_2' }],
        }

        expect(extractGootenVariants(payload)).toHaveLength(2)
    })

    it('builds size/color variant mapping for gooten preview requests', () => {
        const payload = {
            ProductVariants: [
                {
                    SKU: 'sku_black_m',
                    ColorName: 'Black',
                    Size: 'M',
                },
                {
                    SKU: 'sku_white_l',
                    ColorName: 'White',
                    Size: 'L',
                },
            ],
        }

        expect(extractGootenVariantMapping(payload)).toEqual({
            defaultSku: 'sku_black_m',
            variantMapping: {
                black: 'sku_black_m',
                m: 'sku_black_m',
                'm:black': 'sku_black_m',
                white: 'sku_white_l',
                l: 'sku_white_l',
                'l:white': 'sku_white_l',
            },
            colors: ['Black', 'White'],
            sizes: ['M', 'L'],
            colorPreviewUrls: {},
        })
    })

    it('maps variant preview image URLs by color when available', () => {
        const payload = {
            ProductVariants: [
                {
                    SKU: 'sku_black_m',
                    ColorName: 'Black',
                    Size: 'M',
                    PreviewUrl: 'https://az412349.cdn.gooten.com/product-tshirts/Preview/New/Black.jpg',
                },
                {
                    SKU: 'sku_white_l',
                    ColorName: 'White',
                    Size: 'L',
                    Images: [{ Url: 'https://appassets.azureedge.net/product-tshirts/Preview/New/White.jpg' }],
                },
            ],
        }

        expect(extractGootenVariantMapping(payload).colorPreviewUrls).toEqual({
            black: 'https://az412349.cdn.gooten.com/product-tshirts/Preview/New/Black.jpg',
            white: 'https://appassets.azureedge.net/product-tshirts/Preview/New/White.jpg',
        })
    })

    it('extracts preview URL from nested image payload', () => {
        const payload = {
            Result: {
                Images: [{ Url: 'https://appassets.azureedge.net/product-mugs/Preview/New/Mug_Preview_01.jpg' }],
            },
        }

        expect(extractGootenPreviewUrl(payload)).toBe(
            'https://appassets.azureedge.net/product-mugs/Preview/New/Mug_Preview_01.jpg'
        )
    })

    it('ignores unsupported variant preview media hosts', () => {
        const payload = {
            ProductVariants: [
                {
                    SKU: 'sku_black_m',
                    ColorName: 'Black',
                    Size: 'M',
                    PreviewUrl: 'https://printmeeappassets.blob.core.windows.net/product-black.jpg',
                },
                {
                    SKU: 'sku_white_l',
                    ColorName: 'White',
                    Size: 'L',
                    PreviewUrl: 'https://az412349.cdn.gooten.com/product-tshirts/Preview/New/White.jpg',
                },
            ],
        }

        expect(extractGootenVariantMapping(payload).colorPreviewUrls).toEqual({
            white: 'https://az412349.cdn.gooten.com/product-tshirts/Preview/New/White.jpg',
        })
    })

    it('extracts SpaceId options from Gooten API validation errors', () => {
        const error = new Error(
            'Gooten API error 400 for /v/201608/productpreview/: {"Errors":[{"PropertyName":"Images[0].SpaceId","ErrorMessage":"Must not be null or empty. Valid options are 3B9A7,FC3DB,89946,9A317"}],"HadError":true}'
        )

        expect(extractGootenSpaceIdOptionsFromError(error)).toEqual(['3B9A7', 'FC3DB', '89946', '9A317'])
    })

    it('extracts LayerId options from Gooten API validation errors', () => {
        const error = new Error(
            'Gooten API error 400 for /v/201608/productpreview/: {"Errors":[{"PropertyName":"Images[0].LayerId","ErrorMessage":"Invalid LayerId. Valid options are DF149,AB12C"}],"HadError":true}'
        )

        expect(extractGootenLayerIdOptionsFromError(error)).toEqual(['DF149', 'AB12C'])
    })

    it('does not mix LayerId options into SpaceId extraction', () => {
        const error = new Error(
            'Gooten API error 400 for /v/201608/productpreview/: {"Errors":[{"PropertyName":"Images[0].SpaceId","ErrorMessage":"Must not be null or empty. Valid options are 3B9A7,FC3DB"},{"PropertyName":"Images[0].LayerId","ErrorMessage":"Invalid LayerId. Valid options are DF149"}],"HadError":true}'
        )

        expect(extractGootenSpaceIdOptionsFromError(error)).toEqual(['3B9A7', 'FC3DB'])
        expect(extractGootenLayerIdOptionsFromError(error)).toEqual(['DF149'])
    })
})
