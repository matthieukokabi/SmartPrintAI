import sharp from 'sharp'
import { uploadBuffer } from '@/lib/storage'
import { printful } from '@/lib/printful'
import { prisma } from '@/lib/prisma'

export type PrintFileResult = {
    url: string
    widthPx: number
    heightPx: number
    dpi: number
    placement: string
}

type Dims = {
    placement: string
    width: number
    height: number
    dpi: number
}

const cache = new Map<number, Dims>()

async function dimsForProduct(printfulProductId: number): Promise<Dims> {
    const hit = cache.get(printfulProductId)
    if (hit) return hit

    const live = await printful.getPrintfileDimensions(printfulProductId)
    const dims: Dims = {
        placement: live.placement,
        width: live.width,
        height: live.height,
        dpi: live.dpi,
    }
    cache.set(printfulProductId, dims)

    // Best-effort persist on the Product row so other lanes (backfill, future
    // requests) see the same numbers without paying for the API call.
    await prisma.product
        .updateMany({
            where: { printfulId: String(printfulProductId) },
            data: {
                printArea: {
                    dpi: dims.dpi,
                    width: dims.width,
                    height: dims.height,
                    placement: dims.placement,
                    source: 'printful-api',
                    fetchedAt: new Date().toISOString(),
                },
            },
        })
        .catch(() => {})

    return dims
}

/**
 * Build a print-ready PNG that exactly matches the variant's print area.
 * Source can be any aspect ratio; we fit-on-longest-edge into the print area,
 * pad transparent to exact pixel dims, and upload as RGBA PNG.
 *
 * Why upscale is allowed: Printful prints at 300 DPI. A 925x336 source MUST
 * be drawn at print-area dims; sending the raw source would print a smudged
 * miniature in the corner.
 */
export async function buildPrintFile(args: {
    sourceUrl: string
    printfulProductId: number
}): Promise<PrintFileResult> {
    const { width, height, dpi, placement } = await dimsForProduct(args.printfulProductId)

    const res = await fetch(args.sourceUrl)
    if (!res.ok) {
        throw new Error(`[print-file] fetch failed ${res.status} ${args.sourceUrl}`)
    }
    const srcBuf = Buffer.from(await res.arrayBuffer())

    const resized = await sharp(srcBuf, { failOn: 'none' })
        .ensureAlpha()
        .resize({
            width,
            height,
            fit: 'inside',
            withoutEnlargement: false,
        })
        .png({ compressionLevel: 9 })
        .toBuffer()

    const finalBuf = await sharp({
        create: {
            width,
            height,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    })
        .composite([{ input: resized, gravity: 'center' }])
        .png({ compressionLevel: 9 })
        .toBuffer()

    const meta = await sharp(finalBuf).metadata()
    if (meta.width !== width || meta.height !== height) {
        throw new Error(
            `[print-file] dim mismatch ${meta.width}x${meta.height} expected ${width}x${height}`,
        )
    }

    const url = await uploadBuffer(finalBuf, 'png', 'printfiles')
    return { url, widthPx: width, heightPx: height, dpi, placement }
}
