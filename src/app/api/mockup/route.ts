import { NextRequest } from 'next/server'
import { printful } from '@/lib/printful'
import { prisma } from '@/lib/prisma'
import { getRequestId, jsonWithRequestId, logApiError, logApiInfo, logApiWarn } from '@/lib/api-logging'
import { rateLimitRequest } from '@/lib/rate-limit'
import { isMockupEligibleProduct } from '@/lib/mockup-eligibility'
import { detectProductProvider } from '@/lib/product-provider'
import {
    extractGelatoCreatedStoreProductUid,
    extractGelatoProductImageUrl,
    extractGelatoStoreProductImageUrl,
    extractGelatoTemplatePlaceholderName,
    gelato,
} from '@/lib/gelato'
import { extractGootenPreviewUrl, getGootenClient } from '@/lib/gooten'

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

function parseProviderRateLimit(error: unknown): { retryAfterSec: number } | null {
    if (!(error instanceof Error)) return null
    if (!error.message.includes('429')) return null

    const fromMessage = /after\s+(\d+)\s+seconds/i.exec(error.message)
    const retryAfterSec = fromMessage ? Number(fromMessage[1]) : 30
    if (!Number.isFinite(retryAfterSec) || retryAfterSec < 1) {
        return { retryAfterSec: 30 }
    }
    return { retryAfterSec }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

async function resolveGelatoPreviewUrl(storeId: string, createPayload: unknown): Promise<string | null> {
    const immediate = extractGelatoProductImageUrl(createPayload)
    if (immediate) {
        return immediate
    }

    const storeProductUid = extractGelatoCreatedStoreProductUid(createPayload)
    if (!storeProductUid) {
        return null
    }

    const maxAttempts = 8
    const waitMs = 1500

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (attempt > 0) {
            await sleep(waitMs)
        }

        const storeProductPayload = await gelato.getStoreProduct(storeId, storeProductUid)
        const fromStorePayload =
            extractGelatoStoreProductImageUrl(storeProductPayload) || extractGelatoProductImageUrl(storeProductPayload)
        if (fromStorePayload) {
            return fromStorePayload
        }
    }

    return null
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

        if (!isMockupEligibleProduct({ name: product.name, printfulId: product.printfulId, printArea: product.printArea })) {
            logApiWarn(route, requestId, 'product_not_mockup_eligible', { productId, printfulId: product.printfulId })
            return respond(
                { error: 'This product is currently sold without AI custom mockup preview.' },
                { status: 400 }
            )
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

        const provider = detectProductProvider(product.printfulId)
        let mockupUrl: string | null = null

        if (provider === 'gelato') {
            const printArea = (product.printArea || {}) as Record<string, unknown>
            const storeId = printArea.providerStoreId as string
            const templateId = printArea.providerTemplateId as string
            const templateHasPlaceholders = printArea.providerTemplateHasPlaceholders as boolean | undefined
            const printAreaPlaceholder = (printArea.providerPrintAreaPlaceholder as string) || 'front'
            const mappedPlaceholderName =
                typeof printArea.providerTemplatePlaceholderName === 'string'
                    ? printArea.providerTemplatePlaceholderName.trim()
                    : ''

            if (!storeId || !templateId) {
                logApiWarn(route, requestId, 'gelato_mapping_incomplete', { productId })
                return respond({ error: 'Gelato product mapping incomplete' }, { status: 400 })
            }
            if (templateHasPlaceholders === false) {
                logApiWarn(route, requestId, 'gelato_template_missing_placeholder', { productId, templateId })
                return respond(
                    {
                        error: 'Gelato template has no image placeholder configured. Update the template in Gelato before generating mockups.',
                    },
                    { status: 400 }
                )
            }

            let resolvedPlaceholderName = mappedPlaceholderName
            if (!resolvedPlaceholderName) {
                const templatePayload = await gelato.getTemplate(templateId)
                resolvedPlaceholderName =
                    extractGelatoTemplatePlaceholderName(templatePayload, printAreaPlaceholder) || printAreaPlaceholder
            }

            if (!resolvedPlaceholderName) {
                logApiWarn(route, requestId, 'gelato_placeholder_missing', { productId, templateId })
                return respond({ error: 'Gelato template placeholder is missing' }, { status: 400 })
            }

            logApiInfo(route, requestId, 'generating_gelato_mockup', {
                storeId,
                templateId,
                placeholderName: resolvedPlaceholderName,
            })

            const gelatoResult = await gelato.createProductFromTemplate(storeId, templateId, {
                productName: `Preview: ${product.name} (${designId})`,
                placeholders: [{ name: resolvedPlaceholderName, fileUrl: design.imageUrl }],
                publish: false,
            })

            mockupUrl = await resolveGelatoPreviewUrl(storeId, gelatoResult)
            if (!mockupUrl) {
                const retryAfterSec = 8
                logApiWarn(route, requestId, 'gelato_no_mockup_returned', { retryAfterSec })
                const response = respond(
                    {
                        error: 'Mockup provider is temporarily busy. Retrying shortly.',
                        retryAfterSec,
                    },
                    { status: 429 }
                )
                response.headers.set('retry-after', String(retryAfterSec))
                return response
            }
        } else if (provider === 'gooten') {
            const gooten = getGootenClient()
            const printArea = (product.printArea || {}) as Record<string, unknown>
            const providerProductId =
                typeof printArea.providerProductId === 'string' ? printArea.providerProductId.trim() : ''
            const defaultSku =
                typeof printArea.providerDefaultSku === 'string' ? printArea.providerDefaultSku.trim() : ''
            const providerCountryCode =
                typeof printArea.providerCountryCode === 'string' ? printArea.providerCountryCode.trim().toUpperCase() : 'US'
            const providerCurrencyCode =
                typeof printArea.providerCurrencyCode === 'string' ? printArea.providerCurrencyCode.trim().toUpperCase() : 'USD'
            const variantMapping =
                typeof printArea.variantMapping === 'object' && printArea.variantMapping !== null
                    ? (printArea.variantMapping as Record<string, unknown>)
                    : {}
            const colorKey = color.toLowerCase()
            const mappedSku = typeof variantMapping[colorKey] === 'string' ? String(variantMapping[colorKey]).trim() : ''
            const resolvedSku = mappedSku || defaultSku

            if (!providerProductId || !resolvedSku) {
                logApiWarn(route, requestId, 'gooten_mapping_incomplete', { productId })
                return respond({ error: 'Gooten product mapping incomplete' }, { status: 400 })
            }

            logApiInfo(route, requestId, 'generating_gooten_mockup', {
                providerProductId,
                resolvedSku,
                color: colorData.name,
            })

            let previewPayload: unknown
            try {
                previewPayload = await gooten.createProductPreview({
                    SKU: resolvedSku,
                    ProductId: providerProductId,
                    CountryCode: providerCountryCode,
                    CurrencyCode: providerCurrencyCode,
                    Images: [{ Url: design.imageUrl }],
                })
            } catch {
                previewPayload = await gooten.createProductPreview({
                    sku: resolvedSku,
                    productId: providerProductId,
                    countryCode: providerCountryCode,
                    currencyCode: providerCurrencyCode,
                    images: [{ url: design.imageUrl, image: { url: design.imageUrl } }],
                })
            }

            mockupUrl = extractGootenPreviewUrl(previewPayload)
        } else {
            const printfulProductId = Number(product.printfulId)
            if (!Number.isFinite(printfulProductId) || printfulProductId <= 0) {
                logApiWarn(route, requestId, 'invalid_printful_product_id')
                return respond({ error: 'Product mapping unavailable' }, { status: 400 })
            }

            const result = await printful.generateMockup({
                productId: printfulProductId,
                productVariantId: colorData.printfulVariantId,
                imageUrl: design.imageUrl,
            })

            mockupUrl = result.mockups[0]?.mockup_url || null
        }

        if (!mockupUrl) {
            throw new Error('No mockup URL returned from provider')
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
        const rateLimit = parseProviderRateLimit(error)
        if (rateLimit) {
            logApiWarn(route, requestId, 'provider_rate_limited', { retryAfterSec: rateLimit.retryAfterSec })
            const response = respond(
                {
                    error: 'Mockup provider is temporarily busy. Retrying shortly.',
                    retryAfterSec: rateLimit.retryAfterSec,
                },
                { status: 429 }
            )
            response.headers.set('retry-after', String(rateLimit.retryAfterSec))
            return response
        }

        logApiError(route, requestId, 'request_failed', error)
        return respond({ error: 'Mockup generation failed' }, { status: 500 })
    }
}
