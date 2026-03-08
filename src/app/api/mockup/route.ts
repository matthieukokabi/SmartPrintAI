import { NextRequest } from 'next/server'
import { printful } from '@/lib/printful'
import { prisma } from '@/lib/prisma'
import { getRequestId, jsonWithRequestId, logApiError, logApiInfo, logApiWarn } from '@/lib/api-logging'
import { rateLimitRequest } from '@/lib/rate-limit'

type MockupPayload = {
    designId: string
    productId: string
    color: string
}

type ProductColor = {
    name: string
    printfulVariantId: number
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function isNonEmptyString(value: unknown, maxLen = 120): value is string {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLen
}

function validateMockupPayload(input: unknown):
    | { ok: true; data: MockupPayload }
    | { ok: false; error: string } {
    if (!isObject(input)) {
        return { ok: false, error: 'Invalid payload' }
    }

    if (!isNonEmptyString(input.designId)) {
        return { ok: false, error: 'Invalid designId' }
    }
    if (!isNonEmptyString(input.productId)) {
        return { ok: false, error: 'Invalid productId' }
    }
    if (!isNonEmptyString(input.color, 60)) {
        return { ok: false, error: 'Invalid color' }
    }

    return {
        ok: true,
        data: {
            designId: input.designId.trim(),
            productId: input.productId.trim(),
            color: input.color.trim().toLowerCase(),
        },
    }
}

function parseProductColors(colors: unknown): ProductColor[] {
    if (!Array.isArray(colors)) {
        return []
    }

    return colors
        .filter((item): item is ProductColor => {
            if (!isObject(item)) return false
            return (
                typeof item.name === 'string' &&
                item.name.trim().length > 0 &&
                typeof item.printfulVariantId === 'number' &&
                Number.isFinite(item.printfulVariantId)
            )
        })
        .map((item) => ({
            name: item.name.trim(),
            printfulVariantId: item.printfulVariantId,
        }))
}

export async function POST(req: NextRequest) {
    const route = '/api/mockup'
    const requestId = getRequestId(req)
    const respond = <T>(body: T, init?: ResponseInit) => jsonWithRequestId(requestId, body, init)

    logApiInfo(route, requestId, 'request_received')

    const limiter = await rateLimitRequest(req, 'mockup', 60, 600)
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

        const validation = validateMockupPayload(rawPayload)
        if (!validation.ok) {
            logApiWarn(route, requestId, 'validation_failed', { reason: validation.error })
            return respond({ error: validation.error }, { status: 400 })
        }

        const { designId, productId, color } = validation.data

        const cached = await prisma.mockup.findUnique({
            where: {
                designId_productId_color: { designId, productId, color },
            },
        })
        if (cached) {
            logApiInfo(route, requestId, 'cache_hit')
            return respond({ mockupUrl: cached.mockupUrl })
        }

        const [design, product] = await Promise.all([
            prisma.design.findUnique({ where: { id: designId } }),
            prisma.product.findUnique({ where: { id: productId } }),
        ])

        if (!design || !product) {
            logApiWarn(route, requestId, 'resource_not_found')
            return respond({ error: 'Design or product not found' }, { status: 404 })
        }

        const colors = parseProductColors(product.colors)
        if (colors.length === 0) {
            logApiWarn(route, requestId, 'product_colors_unavailable')
            return respond({ error: 'Product colors unavailable' }, { status: 400 })
        }

        const colorData = colors.find((c) => c.name.toLowerCase() === color)
        if (!colorData) {
            logApiWarn(route, requestId, 'color_not_found')
            return respond({ error: 'Color not found' }, { status: 400 })
        }

        const result = await printful.generateMockup({
            productVariantId: colorData.printfulVariantId,
            imageUrl: design.imageUrl,
        })

        const mockupUrl = result.mockups[0]?.mockup_url
        if (!mockupUrl) {
            throw new Error('No mockup URL returned')
        }

        await prisma.mockup.create({
            data: {
                designId,
                productId,
                color,
                mockupUrl,
            },
        })

        logApiInfo(route, requestId, 'request_succeeded')
        return respond({ mockupUrl })
    } catch (error) {
        logApiError(route, requestId, 'request_failed', error)
        return respond({ error: 'Mockup generation failed' }, { status: 500 })
    }
}
