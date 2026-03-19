import sharp from 'sharp'

const DATA_URL_IMAGE_REGEX = /^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/i
const EDGE_WHITE_CHANNEL_MIN = 244
const EDGE_WHITE_MAX_CHANNEL_DELTA = 18
const EDGE_WHITE_ALPHA_MIN = 18
const EDGE_WHITE_RATIO_MIN = 0.52
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

function isEdgeWhitePixel(pixels: Uint8ClampedArray, offset: number): boolean {
    const r = pixels[offset]
    const g = pixels[offset + 1]
    const b = pixels[offset + 2]
    const alpha = pixels[offset + 3]

    if (alpha < EDGE_WHITE_ALPHA_MIN) {
        return false
    }
    if (r < EDGE_WHITE_CHANNEL_MIN || g < EDGE_WHITE_CHANNEL_MIN || b < EDGE_WHITE_CHANNEL_MIN) {
        return false
    }
    if (maxChannelDelta(r, g, b) > EDGE_WHITE_MAX_CHANNEL_DELTA) {
        return false
    }
    return true
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

function removeEdgeConnectedWhiteBackground(
    pixels: Uint8ClampedArray,
    width: number,
    height: number
): number {
    const edgeIndexes = edgePixelIndexes(width, height)
    if (edgeIndexes.length === 0) {
        return 0
    }

    let whiteEdgePixels = 0
    for (const index of edgeIndexes) {
        if (isEdgeWhitePixel(pixels, pixelOffset(index))) {
            whiteEdgePixels += 1
        }
    }

    const whiteEdgeRatio = whiteEdgePixels / edgeIndexes.length
    if (!Number.isFinite(whiteEdgeRatio) || whiteEdgeRatio < EDGE_WHITE_RATIO_MIN) {
        return 0
    }

    const visited = new Uint8Array(width * height)
    const queue: number[] = []
    let removed = 0

    for (const index of edgeIndexes) {
        if (visited[index]) {
            continue
        }
        const offset = pixelOffset(index)
        if (!isEdgeWhitePixel(pixels, offset)) {
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
        if (!isEdgeWhitePixel(pixels, offset)) {
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
            if (!isEdgeWhitePixel(pixels, neighborOffset)) {
                continue
            }
            visited[neighbor] = 1
            queue.push(neighbor)
        }
    }

    return removed
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

    const removedPixels = removeEdgeConnectedWhiteBackground(pixels, width, height)
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
