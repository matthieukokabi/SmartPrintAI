import sharp from 'sharp'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
    ASPECT_DIVERGENCE_THRESHOLD,
    checkAspectRatio,
} from './aspect-guard'

async function pngBuffer(width: number, height: number): Promise<Buffer> {
    // Solid-color PNG that won't be trimmed away by sharp.trim against a
    // white background — the guard's trim step strips white edges, so we
    // fill with a non-white color to preserve the canvas dimensions.
    return sharp({
        create: {
            width,
            height,
            channels: 4,
            background: { r: 30, g: 60, b: 90, alpha: 1 },
        },
    })
        .png()
        .toBuffer()
}

function stubFetchWith(buffer: Buffer): void {
    vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({
            ok: true,
            status: 200,
            arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
        })),
    )
}

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('checkAspectRatio', () => {
    it('skips when printArea is missing (freshly-onboarded product)', async () => {
        const result = await checkAspectRatio({
            designImageUrl: 'https://example.test/x.png',
            printArea: null,
            productName: 'Test',
        })
        expect(result).toEqual({ ok: true, skipped: true })
    })

    it('skips when printArea dimensions are zero or negative', async () => {
        const result = await checkAspectRatio({
            designImageUrl: 'https://example.test/x.png',
            printArea: { width: 0, height: 100 },
            productName: 'Test',
        })
        expect(result).toEqual({ ok: true, skipped: true })
    })

    it('returns ok when divergence is within threshold (square design, square print area)', async () => {
        const buf = await pngBuffer(800, 800)
        stubFetchWith(buf)
        const result = await checkAspectRatio({
            designImageUrl: 'https://example.test/sq.png',
            printArea: { width: 1000, height: 1000 },
            productName: 'Square Tee',
        })
        expect(result.ok).toBe(true)
        if (result.ok && !result.skipped) {
            expect(result.divergence).toBeCloseTo(1.0, 2)
            expect(result.srcWidth).toBe(800)
            expect(result.srcHeight).toBe(800)
        }
    })

    it('returns ok when divergence is just below threshold', async () => {
        // 1.9x divergence: 950x500 design vs 500x500 print area
        const buf = await pngBuffer(950, 500)
        stubFetchWith(buf)
        const result = await checkAspectRatio({
            designImageUrl: 'https://example.test/wide.png',
            printArea: { width: 500, height: 500 },
            productName: 'Wide Tee',
        })
        expect(result.ok).toBe(true)
        if (result.ok && !result.skipped) {
            expect(result.divergence).toBeLessThan(ASPECT_DIVERGENCE_THRESHOLD)
        }
    })

    it('returns ok:false with diagnostic info when divergence exceeds threshold', async () => {
        // Anthony-style failure: ~2.75x horizontal design on vertical luggage-tag print area
        const buf = await pngBuffer(925, 336)
        stubFetchWith(buf)
        const result = await checkAspectRatio({
            designImageUrl: 'https://example.test/horiz.png',
            printArea: { width: 750, height: 1237 },
            productName: 'Luggage Tag',
        })
        expect(result.ok).toBe(false)
        if (!result.ok) {
            expect(result.divergence).toBeGreaterThan(ASPECT_DIVERGENCE_THRESHOLD)
            expect(result.srcWidth).toBe(925)
            expect(result.srcHeight).toBe(336)
            expect(result.reason).toContain('Aspect-ratio mismatch')
            expect(result.reason).toContain('exceeds')
        }
    })

    it('throws when the fetch fails (caller decides whether to abort or continue)', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                ok: false,
                status: 503,
                arrayBuffer: async () => new ArrayBuffer(0),
            })),
        )
        await expect(
            checkAspectRatio({
                designImageUrl: 'https://example.test/down.png',
                printArea: { width: 1000, height: 1000 },
                productName: 'Test',
            }),
        ).rejects.toThrow(/fetch failed 503/)
    })
})
