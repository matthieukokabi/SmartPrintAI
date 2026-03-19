import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { normalizeGeneratedDesignDataUrl } from './design-image'

const DATA_URL_IMAGE_REGEX = /^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/i

function toDataUrl(buffer: Buffer): string {
    return `data:image/png;base64,${buffer.toString('base64')}`
}

async function decodeDataUrl(dataUrl: string): Promise<{ data: Buffer; width: number; height: number }> {
    const match = DATA_URL_IMAGE_REGEX.exec(dataUrl)
    if (!match) {
        throw new Error('Invalid data URL')
    }
    const buffer = Buffer.from(match[2], 'base64')
    const raw = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    return {
        data: raw.data,
        width: raw.info.width,
        height: raw.info.height,
    }
}

function setPixel(
    pixels: Uint8ClampedArray,
    width: number,
    x: number,
    y: number,
    rgba: [number, number, number, number]
): void {
    const index = (y * width + x) * 4
    pixels[index] = rgba[0]
    pixels[index + 1] = rgba[1]
    pixels[index + 2] = rgba[2]
    pixels[index + 3] = rgba[3]
}

describe('normalizeGeneratedDesignDataUrl', () => {
    it('removes edge white matte and crops to content bounds', async () => {
        const width = 120
        const height = 120
        const pixels = new Uint8ClampedArray(width * height * 4)

        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                setPixel(pixels, width, x, y, [255, 255, 255, 255])
            }
        }
        for (let y = 28; y < 92; y += 1) {
            for (let x = 44; x < 76; x += 1) {
                setPixel(pixels, width, x, y, [220, 60, 80, 255])
            }
        }

        const sourceBuffer = await sharp(Buffer.from(pixels), {
            raw: {
                width,
                height,
                channels: 4,
            },
        }).png().toBuffer()

        const normalized = await normalizeGeneratedDesignDataUrl(toDataUrl(sourceBuffer))
        const decoded = await decodeDataUrl(normalized.dataUrl)

        expect(normalized.didRemoveBackground).toBe(true)
        expect(normalized.didCrop).toBe(true)
        expect(decoded.width).toBeLessThan(width)
        expect(decoded.height).toBeLessThan(height)
        expect(decoded.data[3]).toBe(0)
    })

    it('keeps non-white edge backgrounds intact', async () => {
        const width = 96
        const height = 96
        const pixels = new Uint8ClampedArray(width * height * 4)

        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                setPixel(pixels, width, x, y, [20, 80, 210, 255])
            }
        }
        for (let y = 26; y < 70; y += 1) {
            for (let x = 26; x < 70; x += 1) {
                setPixel(pixels, width, x, y, [250, 210, 30, 255])
            }
        }

        const sourceBuffer = await sharp(Buffer.from(pixels), {
            raw: {
                width,
                height,
                channels: 4,
            },
        }).png().toBuffer()

        const normalized = await normalizeGeneratedDesignDataUrl(toDataUrl(sourceBuffer))
        const decoded = await decodeDataUrl(normalized.dataUrl)

        expect(normalized.didRemoveBackground).toBe(false)
        expect(normalized.didCrop).toBe(false)
        expect(decoded.width).toBe(width)
        expect(decoded.height).toBe(height)
        expect(decoded.data[3]).toBe(255)
    })

    it('removes only edge-connected white while preserving internal white details', async () => {
        const width = 110
        const height = 110
        const pixels = new Uint8ClampedArray(width * height * 4)

        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                setPixel(pixels, width, x, y, [255, 255, 255, 255])
            }
        }
        for (let y = 24; y < 86; y += 1) {
            for (let x = 24; x < 86; x += 1) {
                setPixel(pixels, width, x, y, [18, 18, 18, 255])
            }
        }
        for (let y = 46; y < 64; y += 1) {
            for (let x = 46; x < 64; x += 1) {
                setPixel(pixels, width, x, y, [255, 255, 255, 255])
            }
        }

        const sourceBuffer = await sharp(Buffer.from(pixels), {
            raw: {
                width,
                height,
                channels: 4,
            },
        }).png().toBuffer()

        const normalized = await normalizeGeneratedDesignDataUrl(toDataUrl(sourceBuffer))
        const decoded = await decodeDataUrl(normalized.dataUrl)

        let internalWhiteOpaqueCount = 0
        for (let index = 0; index < decoded.data.length; index += 4) {
            const r = decoded.data[index]
            const g = decoded.data[index + 1]
            const b = decoded.data[index + 2]
            const a = decoded.data[index + 3]
            if (r >= 250 && g >= 250 && b >= 250 && a >= 240) {
                internalWhiteOpaqueCount += 1
            }
        }

        expect(normalized.didRemoveBackground).toBe(true)
        expect(normalized.didCrop).toBe(true)
        expect(internalWhiteOpaqueCount).toBeGreaterThan(0)
    })

    it('removes checkerboard matte islands surrounded by transparent frame', async () => {
        const width = 128
        const height = 128
        const pixels = new Uint8ClampedArray(width * height * 4)

        for (let y = 20; y < 108; y += 1) {
            for (let x = 20; x < 108; x += 1) {
                const isLight = (x + y) % 2 === 0
                const value = isLight ? 236 : 206
                setPixel(pixels, width, x, y, [value, value, value, 255])
            }
        }

        for (let y = 36; y < 94; y += 1) {
            for (let x = 44; x < 84; x += 1) {
                setPixel(pixels, width, x, y, [198, 48, 62, 255])
            }
        }

        for (let y = 52; y < 76; y += 1) {
            for (let x = 56; x < 72; x += 1) {
                setPixel(pixels, width, x, y, [248, 248, 248, 255])
            }
        }

        const sourceBuffer = await sharp(Buffer.from(pixels), {
            raw: {
                width,
                height,
                channels: 4,
            },
        }).png().toBuffer()

        const normalized = await normalizeGeneratedDesignDataUrl(toDataUrl(sourceBuffer))
        const decoded = await decodeDataUrl(normalized.dataUrl)

        let opaqueCheckerboardPixels = 0
        let opaqueSubjectPixels = 0

        for (let index = 0; index < decoded.data.length; index += 4) {
            const r = decoded.data[index]
            const g = decoded.data[index + 1]
            const b = decoded.data[index + 2]
            const a = decoded.data[index + 3]
            if (a < 240) {
                continue
            }
            const maxDelta = Math.max(r, g, b) - Math.min(r, g, b)
            if (maxDelta <= 8 && r >= 185 && r <= 245) {
                opaqueCheckerboardPixels += 1
            }
            if (r >= 160 && g <= 95 && b <= 95) {
                opaqueSubjectPixels += 1
            }
        }

        expect(normalized.didRemoveBackground).toBe(true)
        expect(normalized.didCrop).toBe(true)
        expect(decoded.width).toBeLessThan(width)
        expect(decoded.height).toBeLessThan(height)
        expect(opaqueSubjectPixels).toBeGreaterThan(0)
        expect(opaqueCheckerboardPixels).toBe(0)
    })

    it('removes full-frame neutral checkerboard matte behind subject', async () => {
        const width = 128
        const height = 128
        const pixels = new Uint8ClampedArray(width * height * 4)

        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                const block = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0
                const value = block ? 236 : 150
                setPixel(pixels, width, x, y, [value, value, value, 255])
            }
        }

        for (let y = 24; y < 114; y += 1) {
            for (let x = 30; x < 98; x += 1) {
                setPixel(pixels, width, x, y, [205, 76, 42, 255])
            }
        }

        for (let y = 40; y < 104; y += 1) {
            for (let x = 46; x < 84; x += 1) {
                setPixel(pixels, width, x, y, [32, 126, 188, 255])
            }
        }

        const sourceBuffer = await sharp(Buffer.from(pixels), {
            raw: {
                width,
                height,
                channels: 4,
            },
        }).png().toBuffer()

        const normalized = await normalizeGeneratedDesignDataUrl(toDataUrl(sourceBuffer))
        const decoded = await decodeDataUrl(normalized.dataUrl)

        let remainingNeutralCheckerboardPixels = 0
        let opaqueSubjectPixels = 0

        for (let index = 0; index < decoded.data.length; index += 4) {
            const r = decoded.data[index]
            const g = decoded.data[index + 1]
            const b = decoded.data[index + 2]
            const a = decoded.data[index + 3]
            if (a < 240) {
                continue
            }

            const maxDelta = Math.max(r, g, b) - Math.min(r, g, b)
            if (maxDelta <= 8 && r >= 140 && r <= 240) {
                remainingNeutralCheckerboardPixels += 1
            }
            if ((r >= 180 && g >= 60 && b <= 60) || (b >= 150 && g >= 80 && r <= 90)) {
                opaqueSubjectPixels += 1
            }
        }

        expect(normalized.didRemoveBackground).toBe(true)
        expect(normalized.didCrop).toBe(true)
        expect(decoded.width).toBeLessThan(width)
        expect(decoded.height).toBeLessThan(height)
        expect(opaqueSubjectPixels).toBeGreaterThan(0)
        expect(remainingNeutralCheckerboardPixels).toBe(0)
    })

    it('keeps intentional white artwork on transparent background', async () => {
        const width = 112
        const height = 112
        const pixels = new Uint8ClampedArray(width * height * 4)

        for (let y = 32; y < 80; y += 1) {
            for (let x = 38; x < 74; x += 1) {
                setPixel(pixels, width, x, y, [255, 255, 255, 255])
            }
        }

        for (let y = 44; y < 68; y += 1) {
            for (let x = 48; x < 64; x += 1) {
                setPixel(pixels, width, x, y, [12, 12, 12, 255])
            }
        }

        const sourceBuffer = await sharp(Buffer.from(pixels), {
            raw: {
                width,
                height,
                channels: 4,
            },
        }).png().toBuffer()

        const normalized = await normalizeGeneratedDesignDataUrl(toDataUrl(sourceBuffer))
        const decoded = await decodeDataUrl(normalized.dataUrl)

        let whiteOpaquePixels = 0
        for (let index = 0; index < decoded.data.length; index += 4) {
            const r = decoded.data[index]
            const g = decoded.data[index + 1]
            const b = decoded.data[index + 2]
            const a = decoded.data[index + 3]
            if (r >= 250 && g >= 250 && b >= 250 && a >= 240) {
                whiteOpaquePixels += 1
            }
        }

        expect(normalized.didRemoveBackground).toBe(false)
        expect(normalized.didCrop).toBe(true)
        expect(decoded.width).toBeLessThan(width)
        expect(decoded.height).toBeLessThan(height)
        expect(whiteOpaquePixels).toBeGreaterThan(0)
    })
})
