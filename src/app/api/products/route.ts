import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestId, jsonWithRequestId, logApiError, logApiInfo, logApiWarn } from '@/lib/api-logging'
import { detectProductProvider } from '@/lib/product-provider'
import { pickCoreColorSubset } from '@/lib/product-colors'

export const dynamic = 'force-dynamic'

type ProductColor = {
    name: string
    hex: string
    printfulVariantId: number
    previewImageUrl?: string | null
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function isProductColor(value: unknown): value is ProductColor {
    if (!isObject(value)) {
        return false
    }

    return (
        typeof value.name === 'string' &&
        value.name.trim().length > 0 &&
        typeof value.hex === 'string' &&
        value.hex.trim().length > 0 &&
        typeof value.printfulVariantId === 'number' &&
        Number.isFinite(value.printfulVariantId)
    )
}

function curateGootenColors(rawColors: unknown): ProductColor[] {
    if (!Array.isArray(rawColors)) {
        return []
    }

    const normalized = rawColors
        .filter(isProductColor)
        .map((color) => ({
            name: color.name.trim(),
            hex: color.hex.trim(),
            printfulVariantId: color.printfulVariantId,
            previewImageUrl:
                typeof color.previewImageUrl === 'string' && color.previewImageUrl.trim().length > 0
                    ? color.previewImageUrl.trim()
                    : null,
        }))

    return pickCoreColorSubset(normalized, 4)
}

export async function GET(req: NextRequest) {
    const route = '/api/products'
    const requestId = getRequestId(req)
    const respond = <T>(body: T, init?: ResponseInit) => jsonWithRequestId(requestId, body, init)

    logApiInfo(route, requestId, 'request_received')

    try {
        const { searchParams } = new URL(req.url)
        if (searchParams.toString().length > 0) {
            logApiWarn(route, requestId, 'unsupported_query_params')
            return respond(
                { error: 'Query parameters are not supported for this endpoint' },
                { status: 400 }
            )
        }

        const products = await prisma.product.findMany({
            where: {
                active: true,
                imageUrl: {
                    not: '',
                },
            },
            orderBy: { name: 'asc' },
        })

        const responseProducts = products.map((product) => {
            if (detectProductProvider(product.printfulId) !== 'gooten') {
                return product
            }

            return {
                ...product,
                colors: curateGootenColors(product.colors),
            }
        })

        logApiInfo(route, requestId, 'request_succeeded', { count: responseProducts.length })
        return respond(responseProducts)
    } catch (error) {
        logApiError(route, requestId, 'request_failed', error)
        return respond({ error: 'Failed to fetch products' }, { status: 500 })
    }
}
