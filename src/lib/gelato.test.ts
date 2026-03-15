import { describe, expect, it } from 'vitest'
import {
    extractGelatoCreatedStoreProductUid,
    extractGelatoColorName,
    extractGelatoMinUnitPrice,
    extractGelatoProductName,
    extractGelatoProductSizes,
    extractGelatoStoreProductColorNames,
    extractGelatoStoreProductSizes,
    extractGelatoStoreProducts,
    extractGelatoStoreProductVariantUids,
    extractGelatoTemplatePlaceholderName,
    extractGelatoTemplateProductUids,
} from './gelato'

describe('extractGelatoMinUnitPrice', () => {
    it('reads minimum price from array payload shape', () => {
        const payload = [
            { country: 'US', currency: 'USD', price: 12.5 },
            { country: 'US', currency: 'USD', price: 9.75 },
        ]

        expect(extractGelatoMinUnitPrice(payload)).toBe(9.75)
    })

    it('reads minimum price from object candidates', () => {
        const payload = {
            prices: [
                { amount: 14.2 },
                { unitPrice: 11.99 },
            ],
        }

        expect(extractGelatoMinUnitPrice(payload)).toBe(11.99)
    })
})

describe('Gelato payload extraction', () => {
    const apparelPayload = {
        attributes: {
            GarmentCategory: 't-shirt',
            GarmentSubcategory: 'crewneck',
            GarmentCut: 'mens',
            GarmentQuality: 'prm',
            ApparelManufacturer: 'gildan',
            GarmentSize: '2XL',
            GarmentColor: 'black-heather',
        },
    }

    it('builds readable product name from attribute map payloads', () => {
        expect(extractGelatoProductName(apparelPayload)).toBe('Premium Mens Crewneck T Shirt (Gildan)')
    })

    it('extracts sizes from object-based attributes payloads', () => {
        expect(extractGelatoProductSizes(apparelPayload)).toEqual(['2XL'])
    })

    it('extracts color names from object-based attributes payloads', () => {
        expect(extractGelatoColorName(apparelPayload)).toBe('Black Heather')
    })
})

describe('Gelato ecommerce payload extraction', () => {
    const storeProductPayload = {
        products: [
            {
                id: 'store-product-1',
                title: 'SPAI T-Shirt Template',
                productVariantOptions: [
                    {
                        name: 'Color',
                        values: [{ value: 'white' }, { value: 'black' }],
                    },
                    {
                        name: 'Size',
                        values: [{ value: 'S' }, { value: '2XL' }],
                    },
                ],
                variants: [
                    { productUid: 'apparel_product_uid_1' },
                    { productUid: 'apparel_product_uid_2' },
                ],
            },
        ],
    }

    it('reads store product rows from ecommerce list payload', () => {
        expect(extractGelatoStoreProducts(storeProductPayload)).toHaveLength(1)
    })

    it('extracts variant product uids from store product payload', () => {
        const [storeProduct] = extractGelatoStoreProducts(storeProductPayload)
        expect(extractGelatoStoreProductVariantUids(storeProduct)).toEqual([
            'apparel_product_uid_1',
            'apparel_product_uid_2',
        ])
    })

    it('extracts readable size and color values from store product options', () => {
        const [storeProduct] = extractGelatoStoreProducts(storeProductPayload)
        expect(extractGelatoStoreProductSizes(storeProduct)).toEqual(['S', '2XL'])
        expect(extractGelatoStoreProductColorNames(storeProduct)).toEqual(['White', 'Black'])
    })

    it('extracts template product uids from template payload', () => {
        const payload = {
            variants: [
                { productUid: 'uid_1' },
                { productUid: 'uid_2' },
            ],
        }

        expect(extractGelatoTemplateProductUids(payload)).toEqual(['uid_1', 'uid_2'])
    })

    it('extracts template placeholder by print area and falls back to first placeholder', () => {
        const payload = {
            variants: [
                {
                    imagePlaceholders: [
                        { name: 'FrontImage.png', printArea: 'front' },
                        { name: 'BackImage.png', printArea: 'back' },
                    ],
                },
            ],
        }

        expect(extractGelatoTemplatePlaceholderName(payload, 'front')).toBe('FrontImage.png')
        expect(extractGelatoTemplatePlaceholderName(payload, 'sleeve')).toBe('FrontImage.png')
    })

    it('extracts created store product uid from create-from-template payload', () => {
        expect(extractGelatoCreatedStoreProductUid({ id: 'store_prod_1' })).toBe('store_prod_1')
        expect(extractGelatoCreatedStoreProductUid({ product: { id: 'store_prod_2' } })).toBe('store_prod_2')
        expect(extractGelatoCreatedStoreProductUid({})).toBeNull()
    })
})
