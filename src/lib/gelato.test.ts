import { describe, expect, it } from 'vitest'
import {
    extractGelatoColorName,
    extractGelatoMinUnitPrice,
    extractGelatoProductName,
    extractGelatoProductSizes,
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
