import { NextRequest } from 'next/server'
import { generateImage } from '@/lib/gemini'
import { normalizeGeneratedDesignDataUrl } from '@/lib/design-image'
import { uploadBase64Image } from '@/lib/storage'
import { prisma } from '@/lib/prisma'
import { sendMakeDesignAutoPost } from '@/lib/make'
import { getRequestId, jsonWithRequestId, logApiError, logApiInfo, logApiWarn } from '@/lib/api-logging'
import { rateLimitRequest } from '@/lib/rate-limit'

type DesignStyle = 'artistic' | 'watercolor' | 'cartoon' | 'minimalist' | 'pop-art' | 'photorealistic'

type GeneratePayload = {
    prompt: string
    style: DesignStyle
    sessionId?: string
    sourceImageDataUrl?: string
    productId?: string
}

const ALLOWED_STYLES = new Set<DesignStyle>([
    'artistic',
    'watercolor',
    'cartoon',
    'minimalist',
    'pop-art',
    'photorealistic',
])

const SOURCE_IMAGE_DATA_URL_REGEX = /^data:(image\/(?:png|jpeg|jpg|webp));base64,[A-Za-z0-9+/=]+$/i
const MAX_SOURCE_IMAGE_DATA_URL_LENGTH = 900_000

const GENERATE_RATE_LIMIT = Number(process.env.GENERATE_RATE_LIMIT || 60)
const GENERATE_RATE_LIMIT_WINDOW_SEC = Number(process.env.GENERATE_RATE_LIMIT_WINDOW_SEC || 600)

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function validateGeneratePayload(input: unknown):
    | { ok: true; data: GeneratePayload }
    | { ok: false; error: string } {
    if (!isObject(input)) {
        return { ok: false, error: 'Invalid payload' }
    }

    const promptRaw = input.prompt
    if (typeof promptRaw !== 'string') {
        return { ok: false, error: 'Prompt is required' }
    }

    const prompt = promptRaw.trim()
    if (prompt.length < 3) {
        return { ok: false, error: 'Prompt too short' }
    }
    if (prompt.length > 500) {
        return { ok: false, error: 'Prompt too long' }
    }

    const styleRaw = input.style
    let style: DesignStyle = 'artistic'
    if (styleRaw !== undefined && styleRaw !== null) {
        if (typeof styleRaw !== 'string' || !ALLOWED_STYLES.has(styleRaw as DesignStyle)) {
            return { ok: false, error: 'Invalid style' }
        }
        style = styleRaw as DesignStyle
    }

    let sessionId: string | undefined
    if (input.sessionId !== undefined && input.sessionId !== null) {
        if (typeof input.sessionId !== 'string') {
            return { ok: false, error: 'Invalid sessionId' }
        }
        const trimmed = input.sessionId.trim()
        if (trimmed.length === 0 || trimmed.length > 191) {
            return { ok: false, error: 'Invalid sessionId' }
        }
        sessionId = trimmed
    }

    let sourceImageDataUrl: string | undefined
    if (input.sourceImageDataUrl !== undefined && input.sourceImageDataUrl !== null) {
        if (typeof input.sourceImageDataUrl !== 'string') {
            return { ok: false, error: 'Invalid source image' }
        }

        const trimmed = input.sourceImageDataUrl.trim()
        if (trimmed.length === 0 || trimmed.length > MAX_SOURCE_IMAGE_DATA_URL_LENGTH) {
            return { ok: false, error: 'Invalid source image' }
        }

        if (!SOURCE_IMAGE_DATA_URL_REGEX.test(trimmed)) {
            return { ok: false, error: 'Invalid source image format' }
        }

        sourceImageDataUrl = trimmed
    }

    let productId: string | undefined
    if (input.productId !== undefined && input.productId !== null) {
        if (typeof input.productId !== 'string') {
            return { ok: false, error: 'Invalid productId' }
        }
        const trimmed = input.productId.trim()
        if (trimmed.length > 0 && trimmed.length <= 191) {
            productId = trimmed
        }
    }

    return { ok: true, data: { prompt, style, sessionId, sourceImageDataUrl, productId } }
}

async function buildOrientationHint(
    productId: string | undefined,
    route: string,
    requestId: string,
): Promise<string | undefined> {
    if (!productId) return undefined

    const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { name: true, printArea: true },
    })
    if (!product) {
        logApiWarn(route, requestId, 'orientation_augment_skipped_product_not_found', { productId })
        return undefined
    }

    const area = (product.printArea ?? {}) as { width?: number; height?: number }
    const w = Number(area.width)
    const h = Number(area.height)
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
        logApiWarn(route, requestId, 'orientation_augment_skipped_bad_print_area', { productId })
        return undefined
    }

    const aspectRatio = w / h
    let hint: string
    let bucket: 'extremeVertical' | 'vertical' | 'square' | 'horizontal' | 'extremeHorizontal'
    const noDimensionGuard =
        'Do NOT include any dimension numbers, measurement annotations, ' +
        'rulers, or technical labels in the design itself.'
    if (aspectRatio < 0.5) {
        bucket = 'extremeVertical'
        hint =
            `Design for an EXTREMELY VERTICAL ${product.name} (a very tall, narrow product, like a long bookmark or a tall vertical banner). ` +
            `The design MUST be very tall and very narrow, vertically composed, filling top-to-bottom with elongated proportions. ` +
            `Avoid any horizontal layouts. The composition should look like a portrait banner — much taller than it is wide. ` +
            noDimensionGuard
    } else if (aspectRatio < 0.85) {
        bucket = 'vertical'
        hint =
            `Design for a VERTICAL ${product.name} (a tall, portrait-oriented product). ` +
            `The design MUST be vertically composed: tall and narrow, filling top-to-bottom. ` +
            `Avoid horizontal layouts that would leave large empty space above and below. ` +
            noDimensionGuard
    } else if (aspectRatio < 1.18) {
        bucket = 'square'
        hint =
            `Design for a roughly SQUARE ${product.name}. ` +
            `A centered, balanced composition works well. ` +
            noDimensionGuard
    } else if (aspectRatio < 2.0) {
        bucket = 'horizontal'
        hint =
            `Design for a HORIZONTAL ${product.name} (a wide, landscape-oriented product). ` +
            `The design MUST be horizontally composed: wide and short, filling left-to-right. ` +
            `Avoid tall vertical compositions that would leave large empty space on the left and right. ` +
            noDimensionGuard
    } else {
        bucket = 'extremeHorizontal'
        hint =
            `Design for an EXTREMELY HORIZONTAL ${product.name} (a very wide, short product, like a horizontal banner or a long bumper sticker). ` +
            `The design MUST be very wide and very short, horizontally composed, filling left-to-right with elongated proportions. ` +
            `Avoid any vertical layouts. The composition should look like a landscape banner — much wider than it is tall. ` +
            noDimensionGuard
    }

    logApiInfo(route, requestId, 'orientation_augment_applied', {
        productId,
        productName: product.name,
        printArea: { width: w, height: h },
        aspectRatio: Number(aspectRatio.toFixed(2)),
        bucket,
    })

    return hint
}

export async function POST(req: NextRequest) {
    const route = '/api/generate'
    const requestId = getRequestId(req)
    const respond = <T>(body: T, init?: ResponseInit) => jsonWithRequestId(requestId, body, init)

    logApiInfo(route, requestId, 'request_received')

    const limiter = await rateLimitRequest(req, 'generate', GENERATE_RATE_LIMIT, GENERATE_RATE_LIMIT_WINDOW_SEC)
    if (!limiter.allowed) {
        logApiWarn(route, requestId, 'rate_limited', { resetInSec: limiter.resetInSec })
        const response = respond({ error: 'Rate limit exceeded. Please try again shortly.' }, { status: 429 })
        response.headers.set('retry-after', String(limiter.resetInSec))
        response.headers.set('x-ratelimit-limit', String(limiter.limit))
        response.headers.set('x-ratelimit-remaining', String(limiter.remaining))
        return response
    }

    try {
        let rawPayload: unknown
        try {
            rawPayload = await req.json()
        } catch {
            logApiWarn(route, requestId, 'invalid_json')
            return respond({ error: 'Invalid JSON body' }, { status: 400 })
        }

        const validation = validateGeneratePayload(rawPayload)
        if (!validation.ok) {
            logApiWarn(route, requestId, 'validation_failed', { reason: validation.error })
            return respond({ error: validation.error }, { status: 400 })
        }

        const { prompt, style, sessionId, sourceImageDataUrl, productId } = validation.data

        const orientationHint = await buildOrientationHint(productId, route, requestId)

        const base64Image = await generateImage({
            prompt,
            style,
            ...(sourceImageDataUrl ? { sourceImageDataUrl } : {}),
            ...(orientationHint ? { orientationHint } : {}),
        })
        let processedImage = base64Image
        if (process.env.DESIGN_BACKGROUND_CLEANUP_DISABLED !== '1') {
            try {
                const normalized = await normalizeGeneratedDesignDataUrl(base64Image)
                processedImage = normalized.dataUrl
                logApiInfo(route, requestId, 'design_image_cleanup_applied', {
                    didRemoveBackground: normalized.didRemoveBackground,
                    didCrop: normalized.didCrop,
                })
            } catch (cleanupError) {
                const message = cleanupError instanceof Error ? cleanupError.message : 'unknown'
                logApiWarn(route, requestId, 'design_image_cleanup_failed', { message })
            }
        }

        const imageUrl = await uploadBase64Image(processedImage)

        const design = await prisma.design.create({
            data: {
                prompt,
                style,
                imageUrl,
                sessionId,
                status: 'ready',
            },
        })

        await sendMakeDesignAutoPost({
            requestId,
            designId: design.id,
            prompt,
            style,
            imageUrl,
            sessionId: design.sessionId || null,
            createdAtIso: design.createdAt.toISOString(),
        })

        logApiInfo(route, requestId, 'request_succeeded', { designId: design.id })
        return respond({ designId: design.id, imageUrl })
    } catch (error) {
        logApiError(route, requestId, 'request_failed', error)
        return respond(
            { error: 'Image generation failed. Please try again.' },
            { status: 500 }
        )
    }
}
