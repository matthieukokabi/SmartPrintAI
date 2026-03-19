import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { analyzeMockupArtifactRisk } from './mockup-quality'

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

async function buildPngBuffer(
    width: number,
    height: number,
    painter: (pixels: Uint8ClampedArray) => void
): Promise<Buffer> {
    const pixels = new Uint8ClampedArray(width * height * 4)
    painter(pixels)
    return sharp(Buffer.from(pixels), {
        raw: {
            width,
            height,
            channels: 4,
        },
    }).png().toBuffer()
}

describe('analyzeMockupArtifactRisk', () => {
    it('flags a centered neutral matte square artifact', async () => {
        const width = 320
        const height = 320
        const image = await buildPngBuffer(width, height, (pixels) => {
            for (let y = 0; y < height; y += 1) {
                for (let x = 0; x < width; x += 1) {
                    setPixel(pixels, width, x, y, [16, 16, 16, 255])
                }
            }

            for (let y = 112; y < 232; y += 1) {
                for (let x = 112; x < 232; x += 1) {
                    setPixel(pixels, width, x, y, [246, 246, 246, 255])
                }
            }
        })

        const analysis = await analyzeMockupArtifactRisk(image)
        expect(analysis.suspiciousMatte).toBe(true)
        expect(analysis.suspiciousComponents.length).toBeGreaterThan(0)
        expect(analysis.suspiciousComponents[0].areaRatio).toBeGreaterThan(0.03)
    })

    it('ignores neutral blocks that are outside center printing area', async () => {
        const width = 320
        const height = 320
        const image = await buildPngBuffer(width, height, (pixels) => {
            for (let y = 0; y < height; y += 1) {
                for (let x = 0; x < width; x += 1) {
                    setPixel(pixels, width, x, y, [20, 20, 20, 255])
                }
            }

            for (let y = 18; y < 132; y += 1) {
                for (let x = 22; x < 136; x += 1) {
                    setPixel(pixels, width, x, y, [248, 248, 248, 255])
                }
            }
        })

        const analysis = await analyzeMockupArtifactRisk(image)
        expect(analysis.suspiciousMatte).toBe(false)
        expect(analysis.suspiciousComponents).toHaveLength(0)
    })

    it('ignores colorful logo-style artwork on dark garment', async () => {
        const width = 320
        const height = 320
        const image = await buildPngBuffer(width, height, (pixels) => {
            for (let y = 0; y < height; y += 1) {
                for (let x = 0; x < width; x += 1) {
                    setPixel(pixels, width, x, y, [18, 18, 18, 255])
                }
            }

            for (let y = 120; y < 220; y += 1) {
                for (let x = 132; x < 188; x += 1) {
                    setPixel(pixels, width, x, y, [30, 146, 246, 255])
                }
            }
            for (let y = 140; y < 208; y += 1) {
                for (let x = 108; x < 220; x += 1) {
                    setPixel(pixels, width, x, y, [230, 96, 20, 255])
                }
            }
        })

        const analysis = await analyzeMockupArtifactRisk(image)
        expect(analysis.suspiciousMatte).toBe(false)
    })
})
