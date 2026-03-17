import { describe, expect, it } from 'vitest'
import { buildCuratedColorPayloads, pickCoreColorSubset, resolveColorHexFromName } from './product-colors'

describe('resolveColorHexFromName', () => {
    it('maps core colors to deterministic hex values', () => {
        expect(resolveColorHexFromName('Jet Black')).toBe('#111827')
        expect(resolveColorHexFromName('Arctic White')).toBe('#FFFFFF')
        expect(resolveColorHexFromName('Royal Blue')).toBe('#1D4ED8')
        expect(resolveColorHexFromName('Sport Grey')).toBe('#6B7280')
    })
})

describe('pickCoreColorSubset', () => {
    it('prioritizes core colors and limits result size', () => {
        const input = [
            { name: 'Gold' },
            { name: 'Navy' },
            { name: 'White' },
            { name: 'Black' },
            { name: 'Sport Grey' },
            { name: 'Red' },
        ]

        expect(pickCoreColorSubset(input, 4).map((color) => color.name)).toEqual([
            'Black',
            'White',
            'Navy',
            'Sport Grey',
        ])
    })
})

describe('buildCuratedColorPayloads', () => {
    it('builds curated payloads with optional preview URLs', () => {
        const colors = buildCuratedColorPayloads(['Black', 'White', 'Navy', 'Red'], {
            previewByName: {
                black: 'https://cdn.example.com/black.jpg',
                navy: 'https://cdn.example.com/navy.jpg',
            },
        })

        expect(colors).toEqual([
            {
                name: 'Black',
                hex: '#111827',
                printfulVariantId: 0,
                previewImageUrl: 'https://cdn.example.com/black.jpg',
            },
            {
                name: 'White',
                hex: '#FFFFFF',
                printfulVariantId: 0,
            },
            {
                name: 'Navy',
                hex: '#1D4ED8',
                printfulVariantId: 0,
                previewImageUrl: 'https://cdn.example.com/navy.jpg',
            },
            {
                name: 'Red',
                hex: '#FFFFFF',
                printfulVariantId: 0,
            },
        ])
    })
})

