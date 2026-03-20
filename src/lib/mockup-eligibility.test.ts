import { describe, expect, it } from 'vitest'
import { isMockupEligibleProduct } from './mockup-eligibility'

describe('isMockupEligibleProduct', () => {
    it('returns true for valid numeric Printful IDs', () => {
        expect(isMockupEligibleProduct({ name: 'T-shirt', printfulId: '123' })).toBe(true)
    })

    it('returns false for unsupported Printful IDs', () => {
        expect(isMockupEligibleProduct({ name: 'Biker Shorts', printfulId: '507' })).toBe(false)
    })

    it('returns false for Adidas products', () => {
        expect(isMockupEligibleProduct({ name: 'Adidas T-shirt', printfulId: '123' })).toBe(false)
    })

    it('returns true for Gelato-prefixed IDs with validated template mapping', () => {
        expect(
            isMockupEligibleProduct({
                name: 'Gelato T-shirt',
                printfulId: 'gelato:uid_123',
                printArea: {
                    providerTemplateId: 'template_1',
                    providerTemplateValidated: true,
                    providerTemplateHasPlaceholders: true,
                },
            })
        ).toBe(true)
    })

    it('returns false for Gelato-prefixed IDs without a validated template mapping', () => {
        expect(
            isMockupEligibleProduct({
                name: 'Gelato T-shirt',
                printfulId: 'gelato:uid_123',
                printArea: {
                    providerTemplateId: 'template_1',
                    providerTemplateValidated: false,
                    providerTemplateHasPlaceholders: true,
                },
            })
        ).toBe(false)
    })

    it('returns false for Gelato-prefixed IDs when template has no placeholders', () => {
        expect(
            isMockupEligibleProduct({
                name: 'Gelato T-shirt',
                printfulId: 'gelato:uid_123',
                printArea: {
                    providerTemplateId: 'template_1',
                    providerTemplateValidated: true,
                    providerTemplateHasPlaceholders: false,
                },
            })
        ).toBe(false)
    })

    it('returns true for Gelato-prefixed IDs when print area is not provided', () => {
        expect(isMockupEligibleProduct({ name: 'Gelato T-shirt', printfulId: 'gelato:uid_123' })).toBe(true)
    })

    it('returns true for Gooten-prefixed IDs with product + SKU mapping metadata', () => {
        expect(
            isMockupEligibleProduct({
                name: 'Gooten Hoodie',
                printfulId: 'gooten:hoodie_1',
                printArea: {
                    providerProductId: 'hoodie_1',
                    providerDefaultSku: 'sku_white_m',
                    variantMapping: {
                        white: 'sku_white_m',
                    },
                },
            })
        ).toBe(true)
    })

    it('returns false for Gooten drinkware SKUs flagged as unsupported for AI mockups', () => {
        expect(
            isMockupEligibleProduct({
                name: 'Insulated Stainless Steel Mugs',
                printfulId: 'gooten:311',
                printArea: {
                    providerProductId: '311',
                    providerDefaultSku: 'StainlessSteelMug-10oz',
                    variantMapping: {
                        default: 'StainlessSteelMug-10oz',
                    },
                },
            })
        ).toBe(false)
    })

    it('returns false for Gooten stainless steel can holders flagged as unsupported for AI mockups', () => {
        expect(
            isMockupEligibleProduct({
                name: 'Stainless Steel Can Holders',
                printfulId: 'gooten:372',
                printArea: {
                    providerProductId: '372',
                    providerDefaultSku: 'SteelCanHolder-White-12oz',
                    variantMapping: {
                        default: 'SteelCanHolder-White-12oz',
                    },
                },
            })
        ).toBe(false)
    })

    it('returns false for Gooten all-over apparel SKUs flagged as unsupported for AI mockups', () => {
        expect(
            isMockupEligibleProduct({
                name: 'All-Over Print Zip-Up Hoodies',
                printfulId: 'gooten:282',
                printArea: {
                    providerProductId: '282',
                    providerDefaultSku: 'AllOverPrintZipUpHoodies-FM-BL-S',
                    variantMapping: {
                        's:black': 'AllOverPrintZipUpHoodies-FM-BL-S',
                    },
                },
            })
        ).toBe(false)
    })

    it('returns false for Gooten-prefixed IDs when provider SKU mapping metadata is missing', () => {
        expect(
            isMockupEligibleProduct({
                name: 'Gooten Hoodie',
                printfulId: 'gooten:hoodie_1',
                printArea: {
                    providerProductId: 'hoodie_1',
                },
            })
        ).toBe(false)
    })

    it('returns false for empty name or ID', () => {
        expect(isMockupEligibleProduct({ name: '', printfulId: '123' })).toBe(false)
        expect(isMockupEligibleProduct({ name: 'T-shirt', printfulId: '' })).toBe(false)
    })

    it('returns false for non-numeric non-gelato IDs', () => {
        expect(isMockupEligibleProduct({ name: 'T-shirt', printfulId: 'abc' })).toBe(false)
    })
})
