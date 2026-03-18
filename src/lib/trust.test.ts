import { describe, expect, it } from 'vitest'
import { getTrustSignalModel } from './trust'

describe('getTrustSignalModel', () => {
    it('keeps default locale links unprefixed for canonical routing', () => {
        const trust = getTrustSignalModel('en')

        expect(trust.supportPath).toBe('/support')
        expect(trust.termsPath).toBe('/terms')
    })

    it('keeps localized support links and canonical terms links for non-default locales', () => {
        const trust = getTrustSignalModel('fr')

        expect(trust.supportPath).toBe('/fr/support')
        expect(trust.termsPath).toBe('/terms')
    })

    it('returns localized trust snippets', () => {
        const trust = getTrustSignalModel('es')

        expect(trust.deliveryLabel).toBe('Plazo de entrega')
        expect(trust.supportLinkLabel).toBe('Contactar soporte')
        expect(trust.termsLinkLabel).toBe('Revisar terminos')
    })
})
