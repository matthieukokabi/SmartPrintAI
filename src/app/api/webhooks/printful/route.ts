import { NextRequest } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendShipmentNotification } from '@/lib/resend'
import { getRequestId, jsonWithRequestId, logApiError, logApiInfo, logApiWarn } from '@/lib/api-logging'

type PrintfulWebhookPayload = {
    type?: unknown
    data?: {
        order?: { id?: unknown }
        shipment?: {
            order_id?: unknown
            tracking_url?: unknown
            tracking_number?: unknown
            carrier?: unknown
        }
    }
}

const SHIPMENT_EVENTS = new Set(['shipment_sent', 'package_shipped'])

function isHex(value: string) {
    return /^[a-f0-9]+$/i.test(value)
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function normalizeOrderId(value: unknown): string | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(Math.trunc(value))
    }

    if (typeof value === 'string') {
        const trimmed = value.trim()
        if (trimmed.length > 0 && trimmed.length <= 100 && /^[A-Za-z0-9_-]+$/.test(trimmed)) {
            return trimmed
        }
    }

    return null
}

function normalizeOptionalText(value: unknown, maxLen: number): string | null {
    if (typeof value !== 'string') {
        return null
    }

    const trimmed = value.trim()
    if (trimmed.length === 0 || trimmed.length > maxLen) {
        return null
    }

    return trimmed
}

function verifySignature(rawBody: string, signature: string, secretHex: string) {
    if (!isHex(signature) || !isHex(secretHex)) {
        return false
    }

    const secret = Buffer.from(secretHex, 'hex')
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex')

    if (signature.length !== expected.length) {
        return false
    }

    return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
}

export async function POST(req: NextRequest) {
    const route = '/api/webhooks/printful'
    const requestId = getRequestId(req)
    const respond = <T>(body: T, init?: ResponseInit) => jsonWithRequestId(requestId, body, init)

    logApiInfo(route, requestId, 'request_received')

    try {
        const rawBody = await req.text()

        const secret = process.env.PRINTFUL_WEBHOOK_SECRET
        if (secret) {
            const signature = req.headers.get('x-pf-webhook-signature')
            if (!signature || !verifySignature(rawBody, signature.toLowerCase(), secret.toLowerCase())) {
                logApiWarn(route, requestId, 'invalid_signature')
                return respond({ error: 'Invalid signature' }, { status: 401 })
            }
        }

        let body: PrintfulWebhookPayload
        try {
            body = JSON.parse(rawBody) as PrintfulWebhookPayload
        } catch {
            logApiWarn(route, requestId, 'invalid_payload_json')
            return respond({ error: 'Invalid payload' }, { status: 400 })
        }

        if (!isObject(body) || typeof body.type !== 'string' || body.type.trim().length === 0) {
            logApiWarn(route, requestId, 'invalid_payload_shape')
            return respond({ error: 'Invalid payload' }, { status: 400 })
        }

        const type = body.type.trim()
        if (!SHIPMENT_EVENTS.has(type)) {
            logApiInfo(route, requestId, 'ignored_event', { type })
            return respond({ ok: true })
        }

        const orderIdCandidate =
            body.data?.order?.id ??
            body.data?.shipment?.order_id
        const printfulOrderId = normalizeOrderId(orderIdCandidate)

        if (!printfulOrderId) {
            logApiWarn(route, requestId, 'missing_order_id', { type })
            return respond({ error: 'Missing order id in shipment webhook' }, { status: 400 })
        }

        const result = await prisma.order.updateMany({
            where: {
                printfulOrderId,
                status: { not: 'shipped' },
            },
            data: { status: 'shipped' },
        })

        if (result.count > 0) {
            const order = await prisma.order.findFirst({
                where: { printfulOrderId },
                select: { id: true, email: true },
            })

            if (order?.email) {
                const trackingUrl = normalizeOptionalText(body.data?.shipment?.tracking_url, 1000)
                const trackingNumber = normalizeOptionalText(body.data?.shipment?.tracking_number, 200)
                const carrier = normalizeOptionalText(body.data?.shipment?.carrier, 120)

                await sendShipmentNotification({
                    email: order.email,
                    orderId: order.id,
                    trackingUrl,
                    trackingNumber,
                    carrier,
                })
            }
        }

        logApiInfo(route, requestId, 'request_succeeded', { type, updated: result.count })
        return respond({ ok: true })
    } catch (error) {
        logApiError(route, requestId, 'request_failed', error)
        return respond({ error: 'Webhook processing failed' }, { status: 500 })
    }
}
