import sharp from 'sharp'

const DATA_URL_IMAGE_REGEX = /^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/i
const EDGE_WHITE_CHANNEL_MIN = 244
const EDGE_WHITE_MAX_CHANNEL_DELTA = 18
const EDGE_BACKGROUND_ALPHA_MIN = 18
const EDGE_BACKGROUND_RATIO_MIN = 0.4
const EDGE_TRANSPARENT_RATIO_MIN = 0.55
const EDGE_NEUTRAL_BRIGHTNESS_MIN = 145
const EDGE_NEUTRAL_SATURATION_MAX = 0.22
const EDGE_ANCHOR_BUCKET_SIZE = 12
const EDGE_ANCHOR_MAX_COUNT = 2
const EDGE_ANCHOR_DISTANCE_MAX = 42
const EDGE_ANCHOR_BRIGHTNESS_MIN = 120
const EDGE_ANCHOR_SATURATION_MAX = 0.24
const INTERIOR_BACKGROUND_RATIO_MIN = 0.34
const INTERIOR_FOREGROUND_RATIO_MIN = 0.02
const INTERIOR_BACKGROUND_MIN_SEEDS = 24
const INTERIOR_ANCHOR_MIN_DISTANCE = 20
const OPAQUE_ALPHA_MIN = 18
const CROP_PADDING_RATIO = 0.04
const CROP_PADDING_MIN_PX = 8

type OpaqueBounds = {
    left: number
    top: number
    right: number
    bottom: number
}

export type NormalizeDesignImageResult = {
    dataUrl: string
    didRemoveBackground: boolean
    didCrop: boolean
}

type EdgeBackgroundAnalysis = {
    anchors: Array<{ r: number; g: number; b: number }>
    candidateRatio: number
}

type OpaquePixelStats = {
    opaqueCount: number
    candidateCount: number
    nonCandidateCount: number
}

function parseDataUrl(dataUrl: string): Buffer {
    const match = DATA_URL_IMAGE_REGEX.exec(dataUrl.trim())
    if (!match) {
        throw new Error('Invalid generated image format')
    }

    return Buffer.from(match[2], 'base64')
}

function maxChannelDelta(r: number, g: number, b: number): number {
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    return max - min
}

function colorBrightness(r: number, g: number, b: number): number {
    return (r + g + b) / 3
}

function colorSaturation(r: number, g: number, b: number): number {
    const max = Math.max(r, g, b)
    if (max <= 0) {
        return 0
    }
    return maxChannelDelta(r, g, b) / max
}

function isNearWhite(r: number, g: number, b: number): boolean {
    return (
        r >= EDGE_WHITE_CHANNEL_MIN &&
        g >= EDGE_WHITE_CHANNEL_MIN &&
        b >= EDGE_WHITE_CHANNEL_MIN &&
        maxChannelDelta(r, g, b) <= EDGE_WHITE_MAX_CHANNEL_DELTA
    )
}

function isNeutralLightBackground(r: number, g: number, b: number): boolean {
    return colorBrightness(r, g, b) >= EDGE_NEUTRAL_BRIGHTNESS_MIN && colorSaturation(r, g, b) <= EDGE_NEUTRAL_SATURATION_MAX
}

function isCandidateBackgroundColor(r: number, g: number, b: number): boolean {
    return isNearWhite(r, g, b) || isNeutralLightBackground(r, g, b)
}

function colorDistanceSquared(
    r: number,
    g: number,
    b: number,
    anchor: { r: number; g: number; b: number }
): number {
    const dr = r - anchor.r
    const dg = g - anchor.g
    const db = b - anchor.b
    return dr * dr + dg * dg + db * db
}

function hasDistinctAnchors(anchors: Array<{ r: number; g: number; b: number }>): boolean {
    if (anchors.length < 2) {
        return false
    }

    const minDistanceSquared = INTERIOR_ANCHOR_MIN_DISTANCE * INTERIOR_ANCHOR_MIN_DISTANCE
    for (let left = 0; left < anchors.length; left += 1) {
        for (let right = left + 1; right < anchors.length; right += 1) {
            if (colorDistanceSquared(anchors[left].r, anchors[left].g, anchors[left].b, anchors[right]) >= minDistanceSquared) {
                return true
            }
        }
    }

    return false
}

function quantizeChannel(value: number): number {
    return Math.min(255, Math.max(0, Math.round(value / EDGE_ANCHOR_BUCKET_SIZE) * EDGE_ANCHOR_BUCKET_SIZE))
}

function analyzeEdgeBackground(
    pixels: Uint8ClampedArray,
    indexes: number[]
): EdgeBackgroundAnalysis {
    if (indexes.length === 0) {
        return { anchors: [], candidateRatio: 0 }
    }

    const anchorHistogram = new Map<string, number>()
    let candidateEdgePixels = 0

    for (const index of indexes) {
        const offset = pixelOffset(index)
        const alpha = pixels[offset + 3]
        if (alpha < EDGE_BACKGROUND_ALPHA_MIN) {
            continue
        }

        const r = pixels[offset]
        const g = pixels[offset + 1]
        const b = pixels[offset + 2]
        const candidate = isCandidateBackgroundColor(r, g, b)
        if (!candidate) {
            continue
        }

        candidateEdgePixels += 1
        const key = `${quantizeChannel(r)},${quantizeChannel(g)},${quantizeChannel(b)}`
        anchorHistogram.set(key, (anchorHistogram.get(key) || 0) + 1)
    }

    const sortedAnchors = Array.from(anchorHistogram.entries())
        .sort((left, right) => right[1] - left[1])
        .slice(0, EDGE_ANCHOR_MAX_COUNT)
        .map(([key]) => {
            const [r, g, b] = key.split(',').map((entry) => Number(entry))
            return { r, g, b }
        })

    return {
        anchors: sortedAnchors,
        candidateRatio: candidateEdgePixels / indexes.length,
    }
}

function isBackgroundPixel(
    pixels: Uint8ClampedArray,
    offset: number,
    anchors: Array<{ r: number; g: number; b: number }>,
    allowUnanchoredCandidate: boolean
): boolean {
    const alpha = pixels[offset + 3]
    if (alpha < EDGE_BACKGROUND_ALPHA_MIN) {
        return false
    }

    const r = pixels[offset]
    const g = pixels[offset + 1]
    const b = pixels[offset + 2]
    if (allowUnanchoredCandidate && isCandidateBackgroundColor(r, g, b)) {
        return true
    }

    const saturation = colorSaturation(r, g, b)
    const brightness = colorBrightness(r, g, b)
    if (saturation > EDGE_ANCHOR_SATURATION_MAX || brightness < EDGE_ANCHOR_BRIGHTNESS_MIN) {
        return false
    }

    const distanceThresholdSquared = EDGE_ANCHOR_DISTANCE_MAX * EDGE_ANCHOR_DISTANCE_MAX
    for (const anchor of anchors) {
        if (colorDistanceSquared(r, g, b, anchor) <= distanceThresholdSquared) {
            return true
        }
    }

    if (anchors.length === 0) {
        return allowUnanchoredCandidate && isCandidateBackgroundColor(r, g, b)
    }

    return false
}

function pixelOffset(index: number): number {
    return index * 4
}

function edgePixelIndexes(width: number, height: number): number[] {
    const indexes: number[] = []
    if (width < 1 || height < 1) {
        return indexes
    }

    for (let x = 0; x < width; x += 1) {
        indexes.push(x)
    }
    for (let y = 1; y < height - 1; y += 1) {
        indexes.push(y * width)
        indexes.push(y * width + (width - 1))
    }
    if (height > 1) {
        const base = (height - 1) * width
        for (let x = 0; x < width; x += 1) {
            indexes.push(base + x)
        }
    }

    return indexes
}

function edgeTransparentRatio(pixels: Uint8ClampedArray, edgeIndexes: number[]): number {
    if (edgeIndexes.length === 0) {
        return 0
    }

    let transparentCount = 0
    for (const index of edgeIndexes) {
        const offset = pixelOffset(index)
        if (pixels[offset + 3] < EDGE_BACKGROUND_ALPHA_MIN) {
            transparentCount += 1
        }
    }

    return transparentCount / edgeIndexes.length
}

function collectOpaquePixelStats(
    pixels: Uint8ClampedArray,
    width: number,
    height: number
): OpaquePixelStats {
    let opaqueCount = 0
    let candidateCount = 0
    let nonCandidateCount = 0

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const offset = pixelOffset(y * width + x)
            if (pixels[offset + 3] < EDGE_BACKGROUND_ALPHA_MIN) {
                continue
            }

            opaqueCount += 1
            const r = pixels[offset]
            const g = pixels[offset + 1]
            const b = pixels[offset + 2]
            if (isCandidateBackgroundColor(r, g, b)) {
                candidateCount += 1
            } else {
                nonCandidateCount += 1
            }
        }
    }

    return { opaqueCount, candidateCount, nonCandidateCount }
}

function hasTransparentNeighbor(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
    index: number
): boolean {
    const x = index % width
    const y = Math.floor(index / width)
    const neighbors = [
        x > 0 ? index - 1 : -1,
        x < width - 1 ? index + 1 : -1,
        y > 0 ? index - width : -1,
        y < height - 1 ? index + width : -1,
    ]

    for (const neighbor of neighbors) {
        if (neighbor < 0) {
            continue
        }
        const neighborOffset = pixelOffset(neighbor)
        if (pixels[neighborOffset + 3] < EDGE_BACKGROUND_ALPHA_MIN) {
            return true
        }
    }

    return false
}

function collectTransparentNeighborBackgroundSeeds(
    pixels: Uint8ClampedArray,
    width: number,
    height: number
): number[] {
    const seeds: number[] = []
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const index = y * width + x
            const offset = pixelOffset(index)
            if (pixels[offset + 3] < EDGE_BACKGROUND_ALPHA_MIN) {
                continue
            }

            const r = pixels[offset]
            const g = pixels[offset + 1]
            const b = pixels[offset + 2]
            if (!isCandidateBackgroundColor(r, g, b)) {
                continue
            }

            if (!hasTransparentNeighbor(pixels, width, height, index)) {
                continue
            }

            seeds.push(index)
        }
    }

    return seeds
}

function floodFillBackgroundRemoval(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
    seedIndexes: number[],
    anchors: Array<{ r: number; g: number; b: number }>,
    allowUnanchoredCandidate: boolean
): number {
    if (seedIndexes.length === 0) {
        return 0
    }

    const visited = new Uint8Array(width * height)
    const queue: number[] = []
    let removed = 0

    for (const index of seedIndexes) {
        if (visited[index]) {
            continue
        }
        const offset = pixelOffset(index)
        if (!isBackgroundPixel(pixels, offset, anchors, allowUnanchoredCandidate)) {
            continue
        }
        visited[index] = 1
        queue.push(index)
    }

    let head = 0
    while (head < queue.length) {
        const index = queue[head]
        head += 1

        const offset = pixelOffset(index)
        if (!isBackgroundPixel(pixels, offset, anchors, allowUnanchoredCandidate)) {
            continue
        }

        if (pixels[offset + 3] !== 0) {
            pixels[offset + 3] = 0
            removed += 1
        }

        const x = index % width
        const y = Math.floor(index / width)
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
            const neighborOffset = pixelOffset(neighbor)
            if (!isBackgroundPixel(pixels, neighborOffset, anchors, allowUnanchoredCandidate)) {
                continue
            }
            visited[neighbor] = 1
            queue.push(neighbor)
        }
    }

    return removed
}

function removeEdgeConnectedBackground(
    pixels: Uint8ClampedArray,
    width: number,
    height: number
): number {
    const edgeIndexes = edgePixelIndexes(width, height)
    if (edgeIndexes.length === 0) {
        return 0
    }

    const edgeAnalysis = analyzeEdgeBackground(pixels, edgeIndexes)
    if (Number.isFinite(edgeAnalysis.candidateRatio) && edgeAnalysis.candidateRatio >= EDGE_BACKGROUND_RATIO_MIN) {
        const removed = floodFillBackgroundRemoval(
            pixels,
            width,
            height,
            edgeIndexes,
            edgeAnalysis.anchors,
            true
        )
        if (removed > 0) {
            return removed
        }
    }

    const transparentEdgeRatio = edgeTransparentRatio(pixels, edgeIndexes)
    if (transparentEdgeRatio < EDGE_TRANSPARENT_RATIO_MIN) {
        return 0
    }

    const stats = collectOpaquePixelStats(pixels, width, height)
    if (!stats.opaqueCount) {
        return 0
    }

    const candidateRatio = stats.candidateCount / stats.opaqueCount
    const foregroundRatio = stats.nonCandidateCount / stats.opaqueCount
    if (candidateRatio < INTERIOR_BACKGROUND_RATIO_MIN || foregroundRatio < INTERIOR_FOREGROUND_RATIO_MIN) {
        return 0
    }

    const interiorSeeds = collectTransparentNeighborBackgroundSeeds(pixels, width, height)
    if (interiorSeeds.length < INTERIOR_BACKGROUND_MIN_SEEDS) {
        return 0
    }

    const interiorAnalysis = analyzeEdgeBackground(pixels, interiorSeeds)
    if (!hasDistinctAnchors(interiorAnalysis.anchors)) {
        return 0
    }

    return floodFillBackgroundRemoval(
        pixels,
        width,
        height,
        interiorSeeds,
        interiorAnalysis.anchors,
        false
    )
}

function findOpaqueBounds(
    pixels: Uint8ClampedArray,
    width: number,
    height: number
): OpaqueBounds | null {
    let left = width
    let top = height
    let right = -1
    let bottom = -1

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const offset = pixelOffset(y * width + x)
            if (pixels[offset + 3] < OPAQUE_ALPHA_MIN) {
                continue
            }
            if (x < left) left = x
            if (x > right) right = x
            if (y < top) top = y
            if (y > bottom) bottom = y
        }
    }

    if (right < left || bottom < top) {
        return null
    }

    return { left, top, right, bottom }
}

function needsCrop(bounds: OpaqueBounds, width: number, height: number): boolean {
    return bounds.left > 1 || bounds.top > 1 || bounds.right < width - 2 || bounds.bottom < height - 2
}

export async function normalizeGeneratedDesignDataUrl(dataUrl: string): Promise<NormalizeDesignImageResult> {
    const inputBuffer = parseDataUrl(dataUrl)
    const raw = await sharp(inputBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const pixels = new Uint8ClampedArray(raw.data)
    const width = raw.info.width
    const height = raw.info.height

    const removedPixels = removeEdgeConnectedBackground(pixels, width, height)
    const bounds = findOpaqueBounds(pixels, width, height)

    if (!bounds) {
        return {
            dataUrl,
            didRemoveBackground: removedPixels > 0,
            didCrop: false,
        }
    }

    const crop = needsCrop(bounds, width, height)
    const source = sharp(Buffer.from(pixels), {
        raw: {
            width,
            height,
            channels: 4,
        },
    })

    let pipeline = source
    if (crop) {
        const contentWidth = bounds.right - bounds.left + 1
        const contentHeight = bounds.bottom - bounds.top + 1
        const padding = Math.max(
            CROP_PADDING_MIN_PX,
            Math.round(Math.max(contentWidth, contentHeight) * CROP_PADDING_RATIO)
        )
        const left = Math.max(0, bounds.left - padding)
        const top = Math.max(0, bounds.top - padding)
        const right = Math.min(width - 1, bounds.right + padding)
        const bottom = Math.min(height - 1, bounds.bottom + padding)

        pipeline = source.extract({
            left,
            top,
            width: right - left + 1,
            height: bottom - top + 1,
        })
    }

    const outputBuffer = await pipeline.png({ compressionLevel: 9 }).toBuffer()

    return {
        dataUrl: `data:image/png;base64,${outputBuffer.toString('base64')}`,
        didRemoveBackground: removedPixels > 0,
        didCrop: crop,
    }
}
