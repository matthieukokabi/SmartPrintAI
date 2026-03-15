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

    it('returns true for Gelato-prefixed IDs', () => {
        expect(isMockupEligibleProduct({ name: 'Gelato T-shirt', printfulId: 'gelato:uid_123' })).toBe(true)
    })

    it('returns false for empty name or ID', () => {
        expect(isMockupEligibleProduct({ name: '', printfulId: '123' })).toBe(false)
        expect(isMockupEligibleProduct({ name: 'T-shirt', printfulId: '' })).toBe(false)
    })

    it('returns false for non-numeric non-gelato IDs', () => {
        expect(isMockupEligibleProduct({ name: 'T-shirt', printfulId: 'abc' })).toBe(false)
    })
})
