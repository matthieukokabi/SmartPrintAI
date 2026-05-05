import sharp from 'sharp'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/printful', () => ({
    printful: {
        getPrintfileDimensions: vi.fn(),
    },
}))
vi.mock('@/lib/storage', () => ({
    uploadBuffer: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({
    prisma: {
        product: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
    },
}))

import { buildPrintFile } from './print-file'
import { printful } from '@/lib/printful'
import { uploadBuffer } from '@/lib/storage'

const mockedGetDims = vi.mocked(printful.getPrintfileDimensions)
const mockedUpload = vi.mocked(uploadBuffer)

describe('buildPrintFile', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('produces a buffer at exactly the variant print-area dims', async () => {
        const sourcePng = await sharp({
            create: {
                width: 925,
                height: 336,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 1 },
            },
        })
            .png()
            .toBuffer()

        mockedGetDims.mockResolvedValue({
            productId: 938,
            placement: 'default',
            width: 720,
            height: 1200,
            dpi: 300,
        })

        let captured: Buffer | null = null
        mockedUpload.mockImplementation(async (buf: Buffer) => {
            captured = buf
            return 'https://storage.example.com/printfiles/test.png'
        })

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(new Uint8Array(sourcePng), {
                status: 200,
                headers: { 'content-type': 'image/png' },
            }),
        )

        const result = await buildPrintFile({
            sourceUrl: 'https://example.com/design.png',
            printfulProductId: 938,
        })

        expect(result.widthPx).toBe(720)
        expect(result.heightPx).toBe(1200)
        expect(result.dpi).toBe(300)
        expect(result.url).toBe('https://storage.example.com/printfiles/test.png')

        expect(captured).not.toBeNull()
        const meta = await sharp(captured!).metadata()
        expect(meta.width).toBe(720)
        expect(meta.height).toBe(1200)
        expect(meta.channels).toBe(4)

        fetchSpy.mockRestore()
    })

    it('throws when dim mismatch is somehow detected (defensive)', async () => {
        mockedGetDims.mockResolvedValue({
            productId: 1,
            placement: 'default',
            width: 100,
            height: 100,
            dpi: 300,
        })

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response('not a png', { status: 200 }),
        )

        await expect(
            buildPrintFile({
                sourceUrl: 'https://example.com/bad.png',
                printfulProductId: 1,
            }),
        ).rejects.toThrow()

        fetchSpy.mockRestore()
    })

    it('throws when source fetch fails', async () => {
        mockedGetDims.mockResolvedValue({
            productId: 1,
            placement: 'default',
            width: 100,
            height: 100,
            dpi: 300,
        })

        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response('', { status: 404 }),
        )

        await expect(
            buildPrintFile({
                sourceUrl: 'https://example.com/missing.png',
                printfulProductId: 1,
            }),
        ).rejects.toThrow(/fetch failed/)

        fetchSpy.mockRestore()
    })
})
