import { describe, expect, it } from 'vitest'
import {
    type MarginAssumptions,
    summarizeByProvider,
    toMarginRow,
} from './margin-cheatsheet'

const assumptions: MarginAssumptions = {
    stripePercent: 0.029,
    stripeFixed: 0.3,
    customerShippingCharge: 5.99,
    aiGenerationCostPerOrder: 0.04,
    providerShippingCostByProvider: {
        printful: 4.5,
        gooten: 5.25,
        gelato: 5.75,
        unknown: 5.99,
    },
}

describe('margin-cheatsheet', () => {
    it('computes total revenue, total cost, and net earnings for AI-customizable printful products', () => {
        const row = toMarginRow(
            {
                id: 'prod_1',
                name: 'Classic Tee',
                printfulId: '123',
                printArea: { width: 4200, height: 4800, dpi: 300 },
                category: 'apparel',
                basePrice: 12,
                sellPrice: 30,
            },
            assumptions
        )

        expect(row.provider).toBe('printful')
        expect(row.catalogType).toBe('ai_customizable')
        expect(row.aiGenerationCost).toBe(0.04)
        expect(row.totalRevenue).toBe(35.99)
        expect(row.stripeFeeEstimate).toBe(1.34)
        expect(row.totalCost).toBe(17.88)
        expect(row.netEarnings).toBe(18.11)
        expect(row.netEarningsPct).toBe(50.32)
    })

    it('sets AI generation cost to zero for ready-to-buy products', () => {
        const row = toMarginRow(
            {
                id: 'prod_2',
                name: 'All-Over Print Hoodie',
                printfulId: 'gooten:282',
                printArea: { provider: 'gooten', providerProductId: '282' },
                category: 'apparel',
                basePrice: 28,
                sellPrice: 72,
            },
            assumptions
        )

        expect(row.provider).toBe('gooten')
        expect(row.catalogType).toBe('ready_to_buy')
        expect(row.aiGenerationCost).toBe(0)
        expect(row.providerShippingCost).toBe(5.25)
    })

    it('summarizes margin rows by provider', () => {
        const rowA = toMarginRow(
            {
                id: 'prod_a',
                name: 'Tee',
                printfulId: '111',
                printArea: { width: 4200, height: 4800, dpi: 300 },
                category: 'apparel',
                basePrice: 10,
                sellPrice: 25,
            },
            assumptions
        )
        const rowB = toMarginRow(
            {
                id: 'prod_b',
                name: 'Mug',
                printfulId: 'gooten:244',
                printArea: { provider: 'gooten', providerProductId: '244' },
                category: 'drinkware',
                basePrice: 9,
                sellPrice: 30,
            },
            assumptions
        )

        const summary = summarizeByProvider([rowA, rowB])
        expect(summary.printful?.count).toBe(1)
        expect(summary.gooten?.count).toBe(1)
        expect(summary.printful?.avgNetEarnings).toBe(rowA.netEarnings)
        expect(summary.gooten?.avgNetEarnings).toBe(rowB.netEarnings)
    })
})
