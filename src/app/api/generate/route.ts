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

    return { ok: true, data: { prompt, style, sessionId, sourceImageDataUrl } }
}

export async function POST(req: NextRequest) {
    const route = '/api/generate'
    const requestId = getRequestId(req)
    const respond = <T>(body: T, init?: ResponseInit) => jsonWithRequestId(requestId, body, init)

    logApiInfo(route, requestId, 'request_received')

    const limiter = await rateLimitRequest(req, 'generate', 20, 600)
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

        const { prompt, style, sessionId, sourceImageDataUrl } = validation.data

        const base64Image = await generateImage({
            prompt,
            style,
            ...(sourceImageDataUrl ? { sourceImageDataUrl } : {}),
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
