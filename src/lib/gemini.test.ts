import { describe, expect, it } from 'vitest'
import { buildPrintReadyPrompt } from './gemini'

describe('buildPrintReadyPrompt', () => {
    it('enforces transparent background and anti-frame instructions', () => {
        const prompt = buildPrintReadyPrompt(
            'futuristic wolf emblem',
            'vibrant artistic illustration, bold colors, detailed artwork, suitable for print'
        )

        expect(prompt).toContain('futuristic wolf emblem')
        expect(prompt).toContain('Transparent background only with alpha')
        expect(prompt).toContain('No white box, no frame, no poster backdrop')
        expect(prompt).toContain('clean cutout edges for product mockups')
    })
})
