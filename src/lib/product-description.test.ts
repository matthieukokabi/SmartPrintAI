import { describe, expect, it } from 'vitest'
import { normalizeProductDescription } from './product-description'

describe('normalizeProductDescription', () => {
    it('returns fallback when value is empty', () => {
        expect(normalizeProductDescription('', 'Fallback')).toBe('Fallback')
        expect(normalizeProductDescription(undefined, 'Fallback')).toBe('Fallback')
    })

    it('decodes encoded html and strips tags', () => {
        const raw = '&lt;ul&gt;&lt;li&gt;Soft cotton&lt;/li&gt;&lt;li&gt;Front pocket&lt;/li&gt;&lt;/ul&gt;'
        expect(normalizeProductDescription(raw, 'Fallback')).toBe('Soft cotton Front pocket')
    })

    it('strips direct html tags and normalizes whitespace', () => {
        const raw = '<p>Premium mug</p><p>Dishwasher safe</p>'
        expect(normalizeProductDescription(raw, 'Fallback')).toBe('Premium mug Dishwasher safe')
    })

    it('truncates noisy markup-heavy descriptions', () => {
        const raw = `${'&lt;td&gt;data&lt;/td&gt; '.repeat(200)}`
        const normalized = normalizeProductDescription(raw, 'Fallback', 120)
        expect(normalized.length).toBeLessThanOrEqual(121)
    })
})
