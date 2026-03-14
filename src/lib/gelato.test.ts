import { describe, expect, it } from 'vitest'
import { extractGelatoMinUnitPrice } from './gelato'

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
