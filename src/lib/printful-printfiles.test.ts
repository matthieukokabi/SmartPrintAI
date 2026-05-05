import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { printful } from './printful'

const samplePayload = {
    code: 200,
    result: {
        product_id: 938,
        printfiles: [
            {
                placement: 'default',
                width: 720,
                height: 1200,
                dpi: 300,
            },
            {
                placement: 'back',
                width: 1500,
                height: 1500,
                dpi: 300,
            },
        ],
        variant_printfiles: [],
    },
}

describe('printful.getPrintfileDimensions', () => {
    beforeEach(() => {
        process.env.PRINTFUL_API_KEY = 'test-key'
        process.env.PRINTFUL_STORE_ID = '12345'
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('returns the default placement dims for a product', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify(samplePayload), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            }),
        )

        const dims = await printful.getPrintfileDimensions(938)
        expect(dims.width).toBe(720)
        expect(dims.height).toBe(1200)
        expect(dims.dpi).toBe(300)
        expect(dims.placement).toBe('default')

        fetchSpy.mockRestore()
    })

    it('honours preferredPlacement when given', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify(samplePayload), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            }),
        )

        const dims = await printful.getPrintfileDimensions(938, 'back')
        expect(dims.width).toBe(1500)
        expect(dims.height).toBe(1500)
        expect(dims.placement).toBe('back')

        fetchSpy.mockRestore()
    })

    it('throws when no printfiles are returned', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ result: { printfiles: [] } }), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            }),
        )

        await expect(printful.getPrintfileDimensions(999)).rejects.toThrow(
            /no printfiles for product/,
        )

        fetchSpy.mockRestore()
    })
})
