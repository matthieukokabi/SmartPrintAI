import sharp from 'sharp'

export const ASPECT_DIVERGENCE_THRESHOLD = 2.0

export type AspectGuardCheck =
    | { ok: true; skipped: true }
    | {
          ok: true
          skipped: false
          srcWidth: number
          srcHeight: number
          srcAR: number
          printAR: number
          divergence: number
      }
    | {
          ok: false
          skipped: false
          srcWidth: number
          srcHeight: number
          srcAR: number
          printAR: number
          divergence: number
          reason: string
      }

export async function checkAspectRatio(args: {
    designImageUrl: string
    printArea: { width?: number; height?: number } | null | undefined
    productName: string
}): Promise<AspectGuardCheck> {
    const paW = args.printArea?.width
    const paH = args.printArea?.height
    if (typeof paW !== 'number' || typeof paH !== 'number' || paW <= 0 || paH <= 0) {
        return { ok: true, skipped: true }
    }
    const res = await fetch(args.designImageUrl)
    if (!res.ok) {
        throw new Error(`[aspect-guard] fetch failed ${res.status} ${args.designImageUrl}`)
    }
    const srcBuf = Buffer.from(await res.arrayBuffer())
    const trimmed = await sharp(srcBuf)
        .trim({ background: { r: 255, g: 255, b: 255 }, threshold: 30 })
        .toBuffer({ resolveWithObject: true })
    const srcWidth = trimmed.info.width
    const srcHeight = trimmed.info.height
    const srcAR = srcWidth / srcHeight
    const printAR = paW / paH
    const divergence = Math.max(srcAR, printAR) / Math.min(srcAR, printAR)
    if (divergence > ASPECT_DIVERGENCE_THRESHOLD) {
        const reason =
            `Aspect-ratio mismatch: trimmed source ${srcWidth}x${srcHeight} ` +
            `(AR ${srcAR.toFixed(2)}) vs print area ${paW}x${paH} ` +
            `(AR ${printAR.toFixed(2)}). Divergence ${divergence.toFixed(2)}x ` +
            `exceeds ${ASPECT_DIVERGENCE_THRESHOLD}x guard — would likely produce thin-strip ` +
            `or off-center artifact on the printed product.`
        return {
            ok: false,
            skipped: false,
            srcWidth,
            srcHeight,
            srcAR,
            printAR,
            divergence,
            reason,
        }
    }
    return {
        ok: true,
        skipped: false,
        srcWidth,
        srcHeight,
        srcAR,
        printAR,
        divergence,
    }
}
