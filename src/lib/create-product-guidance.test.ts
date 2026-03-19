import { describe, expect, it } from 'vitest'
import { getCreateProductPromptGuidance } from './create-product-guidance'

describe('getCreateProductPromptGuidance', () => {
    it('returns small-area guidance for cap-like products', () => {
        const guidance = getCreateProductPromptGuidance({
            name: 'Dad Caps',
            category: 'accessories',
            printfulId: 'gooten:244',
        })

        expect(guidance.title).toBe('Small print area tips')
        expect(guidance.checklist[0]).toContain('centered icon/logo')
    })

    it('returns all-over guidance for all-over print products', () => {
        const guidance = getCreateProductPromptGuidance({
            name: 'All-Over Print Backpack',
            category: 'accessories',
            printfulId: '279',
        })

        expect(guidance.title).toBe('All-over pattern tips')
        expect(guidance.checklist[0]).toContain('seamless edge-to-edge pattern')
    })

    it('returns drinkware guidance for drinkware products', () => {
        const guidance = getCreateProductPromptGuidance({
            name: 'Jumbo Mugs',
            category: 'drinkware',
            printfulId: 'gooten:412',
        })

        expect(guidance.title).toBe('Drinkware placement tips')
        expect(guidance.checklist[2]).toContain('white rectangle')
    })

    it('returns standard guidance for regular apparel products', () => {
        const guidance = getCreateProductPromptGuidance({
            name: 'Unisex Premium T-Shirt',
            category: 'apparel',
            printfulId: '71',
        })

        expect(guidance.title).toBe('Apparel mockup tips')
        expect(guidance.checklist[0]).toContain('main subject')
    })
})
