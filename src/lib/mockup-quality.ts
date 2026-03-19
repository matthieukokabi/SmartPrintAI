import sharp from 'sharp'

const OPAQUE_ALPHA_MIN = 230
const NEUTRAL_SATURATION_MAX = 0.08
const NEUTRAL_BRIGHTNESS_MIN = 145
const NEUTRAL_BRIGHTNESS_MAX = 255
const COMPONENT_MIN_AREA_RATIO = 0.015
const COMPONENT_FILL_RATIO_MIN = 0.83
const COMPONENT_ASPECT_RATIO_MIN = 0.55
const COMPONENT_ASPECT_RATIO_MAX = 1.8
const COMPONENT_CENTER_MIN = 0.3
const COMPONENT_CENTER_MAX = 0.7

function pixelOffset(index: number): number {
    return index * 4
}

function colorSaturation(r: number, g: number, b: number): number {
    const max = Math.max(r, g, b)
    if (max <= 0) {
        return 0
    }
    const min = Math.min(r, g, b)
    return (max - min) / max
}

function colorBrightness(r: number, g: number, b: number): number {
    return (r + g + b) / 3
}

function isNeutralOpaquePixel(
    pixels: Uint8ClampedArray,
    index: number
): boolean {
    const offset = pixelOffset(index)
    const alpha = pixels[offset + 3]
    if (alpha < OPAQUE_ALPHA_MIN) {
        return false
    }

    const r = pixels[offset]
    const g = pixels[offset + 1]
    const b = pixels[offset + 2]
    const saturation = colorSaturation(r, g, b)
    const brightness = colorBrightness(r, g, b)

    return (
        saturation <= NEUTRAL_SATURATION_MAX &&
        brightness >= NEUTRAL_BRIGHTNESS_MIN &&
        brightness <= NEUTRAL_BRIGHTNESS_MAX
    )
}

function isCenteredComponent(
    centerXRatio: number,
    centerYRatio: number
): boolean {
    return (
        centerXRatio >= COMPONENT_CENTER_MIN &&
        centerXRatio <= COMPONENT_CENTER_MAX &&
        centerYRatio >= COMPONENT_CENTER_MIN &&
        centerYRatio <= COMPONENT_CENTER_MAX
    )
}

export type SuspiciousMatteComponent = {
    area: number
    areaRatio: number
    fillRatio: number
    aspectRatio: number
    centerXRatio: number
    centerYRatio: number
}

export type MockupArtifactAnalysis = {
    width: number
    height: number
    suspiciousMatte: boolean
    suspiciousComponents: SuspiciousMatteComponent[]
}

export async function analyzeMockupArtifactRisk(imageBuffer: Buffer): Promise<MockupArtifactAnalysis> {
    const raw = await sharp(imageBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const pixels = new Uint8ClampedArray(raw.data)
    const width = raw.info.width
    const height = raw.info.height
    const totalPixels = width * height
    const visited = new Uint8Array(totalPixels)
    const suspiciousComponents: SuspiciousMatteComponent[] = []

    for (let start = 0; start < totalPixels; start += 1) {
        if (visited[start]) {
            continue
        }

        visited[start] = 1
        if (!isNeutralOpaquePixel(pixels, start)) {
            continue
        }

        const queue: number[] = [start]
        let head = 0
        let area = 0
        let minX = width
        let maxX = -1
        let minY = height
        let maxY = -1
        let sumX = 0
        let sumY = 0

        while (head < queue.length) {
            const index = queue[head]
            head += 1
            if (!isNeutralOpaquePixel(pixels, index)) {
                continue
            }

            area += 1
            const x = index % width
            const y = Math.floor(index / width)
            sumX += x
            sumY += y
            if (x < minX) minX = x
            if (x > maxX) maxX = x
            if (y < minY) minY = y
            if (y > maxY) maxY = y

            const neighbors = [
                x > 0 ? index - 1 : -1,
                x < width - 1 ? index + 1 : -1,
                y > 0 ? index - width : -1,
                y < height - 1 ? index + width : -1,
            ]

            for (const neighbor of neighbors) {
                if (neighbor < 0 || visited[neighbor]) {
                    continue
                }
                visited[neighbor] = 1
                if (isNeutralOpaquePixel(pixels, neighbor)) {
                    queue.push(neighbor)
                }
            }
        }

        if (!area || maxX < minX || maxY < minY) {
            continue
        }

        const boxWidth = maxX - minX + 1
        const boxHeight = maxY - minY + 1
        const boxArea = boxWidth * boxHeight
        const areaRatio = area / totalPixels
        const fillRatio = boxArea ? area / boxArea : 0
        const aspectRatio = boxHeight ? boxWidth / boxHeight : 0
        const centerXRatio = area ? (sumX / area) / width : 0
        const centerYRatio = area ? (sumY / area) / height : 0

        const suspicious =
            areaRatio >= COMPONENT_MIN_AREA_RATIO &&
            fillRatio >= COMPONENT_FILL_RATIO_MIN &&
            aspectRatio >= COMPONENT_ASPECT_RATIO_MIN &&
            aspectRatio <= COMPONENT_ASPECT_RATIO_MAX &&
            isCenteredComponent(centerXRatio, centerYRatio)

        if (!suspicious) {
            continue
        }

        suspiciousComponents.push({
            area,
            areaRatio,
            fillRatio,
            aspectRatio,
            centerXRatio,
            centerYRatio,
        })
    }

    return {
        width,
        height,
        suspiciousMatte: suspiciousComponents.length > 0,
        suspiciousComponents,
    }
}
