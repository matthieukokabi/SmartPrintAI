import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestId, jsonWithRequestId, logApiError, logApiInfo, logApiWarn } from '@/lib/api-logging'

export const dynamic = 'force-dynamic'

function isValidParam(value: string, maxLen = 191): boolean {
    return value.length > 0 && value.length <= maxLen && /^[A-Za-z0-9_-]+$/.test(value)
}

export async function GET(req: NextRequest) {
    const route = '/api/orders'
    const requestId = getRequestId(req)
    const respond = <T>(body: T, init?: ResponseInit) => jsonWithRequestId(requestId, body, init)

    logApiInfo(route, requestId, 'request_received')

    try {
        const { searchParams } = new URL(req.url)
        const sessionIdRaw = searchParams.get('session_id')
        const orderIdRaw = searchParams.get('order_id')

        const sessionId = sessionIdRaw?.trim() || null
        const orderId = orderIdRaw?.trim() || null

        if (!sessionId && !orderId) {
            logApiWarn(route, requestId, 'missing_query_params')
            return respond({ error: 'Provide session_id or order_id' }, { status: 400 })
        }

        if (sessionId && orderId) {
            logApiWarn(route, requestId, 'conflicting_query_params')
            return respond(
                { error: 'Provide only one query param: session_id or order_id' },
                { status: 400 }
            )
        }

        if (orderId) {
            if (!isValidParam(orderId)) {
                logApiWarn(route, requestId, 'invalid_order_id')
                return respond({ error: 'Invalid order_id' }, { status: 400 })
            }

            const order = await prisma.order.findUnique({
                where: { id: orderId },
                include: { items: true },
            })
            if (!order) {
                logApiWarn(route, requestId, 'order_not_found')
                return respond({ error: 'Order not found' }, { status: 404 })
            }

            logApiInfo(route, requestId, 'request_succeeded', { lookup: 'order_id' })
            return respond(order)
        }

        if (!sessionId || !isValidParam(sessionId, 255)) {
            logApiWarn(route, requestId, 'invalid_session_id')
            return respond({ error: 'Invalid session_id' }, { status: 400 })
        }

        const order = await prisma.order.findUnique({
            where: { stripeSessionId: sessionId },
            include: { items: true },
        })
        if (!order) {
            logApiWarn(route, requestId, 'order_not_found')
            return respond({ error: 'Order not found' }, { status: 404 })
        }

        logApiInfo(route, requestId, 'request_succeeded', { lookup: 'session_id' })
        return respond(order)
    } catch (error) {
        logApiError(route, requestId, 'request_failed', error)
        return respond({ error: 'Failed to fetch order' }, { status: 500 })
    }
}
