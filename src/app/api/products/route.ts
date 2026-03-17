import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestId, jsonWithRequestId, logApiError, logApiInfo, logApiWarn } from '@/lib/api-logging'

export const dynamic = 'force-dynamic'

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

        logApiInfo(route, requestId, 'request_succeeded', { count: products.length })
        return respond(products)
    } catch (error) {
        logApiError(route, requestId, 'request_failed', error)
        return respond({ error: 'Failed to fetch products' }, { status: 500 })
    }
}
