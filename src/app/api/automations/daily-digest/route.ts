import { timingSafeEqual } from 'crypto'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendMakeDailyDigest } from '@/lib/make'
import { getRequestId, jsonWithRequestId, logApiError, logApiInfo, logApiWarn } from '@/lib/api-logging'

const DEFAULT_WINDOW_HOURS = 24
const MIN_WINDOW_HOURS = 1
const MAX_WINDOW_HOURS = 168

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function readAutomationToken(req: NextRequest): string | null {
    const explicitToken = req.headers.get('x-automation-token')?.trim()
    if (explicitToken) {
        return explicitToken
    }

    const authorization = req.headers.get('authorization')?.trim()
    if (!authorization) {
        return null
    }

    const [scheme, token] = authorization.split(/\s+/, 2)
    if (scheme?.toLowerCase() !== 'bearer' || !token?.trim()) {
        return null
    }

    return token.trim()
}

function timingSafeTokenMatch(provided: string, expected: string): boolean {
    const providedBuffer = Buffer.from(provided, 'utf8')
    const expectedBuffer = Buffer.from(expected, 'utf8')
    if (providedBuffer.length !== expectedBuffer.length) {
        return false
    }
    return timingSafeEqual(providedBuffer, expectedBuffer)
}

function parseWindowHours(rawValue: unknown): number | null {
    if (rawValue === undefined || rawValue === null) {
        return DEFAULT_WINDOW_HOURS
    }

    let parsed: number
    if (typeof rawValue === 'number') {
        parsed = rawValue
    } else if (typeof rawValue === 'string' && rawValue.trim().length > 0) {
        parsed = Number(rawValue.trim())
    } else {
        return null
    }

    if (!Number.isInteger(parsed) || parsed < MIN_WINDOW_HOURS || parsed > MAX_WINDOW_HOURS) {
        return null
    }

    return parsed
}

export async function POST(req: NextRequest) {
    const route = '/api/automations/daily-digest'
    const requestId = getRequestId(req)
    const respond = <T>(body: T, init?: ResponseInit) => jsonWithRequestId(requestId, body, init)

    logApiInfo(route, requestId, 'request_received')

    const sharedSecret = process.env.AUTOMATION_SHARED_SECRET?.trim()
    if (!sharedSecret) {
        logApiWarn(route, requestId, 'automation_secret_missing')
        return respond({ error: 'Automation auth is not configured' }, { status: 503 })
    }

    const providedToken = readAutomationToken(req)
    if (!providedToken || !timingSafeTokenMatch(providedToken, sharedSecret)) {
        logApiWarn(route, requestId, 'unauthorized')
        return respond({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        let payload: unknown = {}
        const rawBody = await req.text()
        if (rawBody.trim().length > 0) {
            try {
                payload = JSON.parse(rawBody) as unknown
            } catch {
                logApiWarn(route, requestId, 'invalid_json')
                return respond({ error: 'Invalid JSON body' }, { status: 400 })
            }
        }

        const windowHours = parseWindowHours(isObject(payload) ? payload.windowHours : undefined)
        if (!windowHours) {
            logApiWarn(route, requestId, 'invalid_window_hours')
            return respond(
                {
                    error: `windowHours must be an integer between ${MIN_WINDOW_HOURS} and ${MAX_WINDOW_HOURS}`,
                },
                { status: 400 }
            )
        }

        const windowEnd = new Date()
        const windowStart = new Date(windowEnd.getTime() - windowHours * 60 * 60 * 1000)

        const [ordersCreated, ordersPaid, ordersProcessing, ordersShipped, ordersFulfillmentFailed, designsCreated] =
            await Promise.all([
                prisma.order.count({
                    where: { createdAt: { gte: windowStart, lt: windowEnd } },
                }),
                prisma.order.count({
                    where: { createdAt: { gte: windowStart, lt: windowEnd }, status: 'paid' },
                }),
                prisma.order.count({
                    where: { createdAt: { gte: windowStart, lt: windowEnd }, status: 'processing' },
                }),
                prisma.order.count({
                    where: { createdAt: { gte: windowStart, lt: windowEnd }, status: 'shipped' },
                }),
                prisma.order.count({
                    where: { createdAt: { gte: windowStart, lt: windowEnd }, status: 'fulfillment_failed' },
                }),
                prisma.design.count({
                    where: { createdAt: { gte: windowStart, lt: windowEnd } },
                }),
            ])

        const makeResult = await sendMakeDailyDigest({
            requestId,
            windowStartIso: windowStart.toISOString(),
            windowEndIso: windowEnd.toISOString(),
            windowHours,
            ordersCreated,
            ordersPaid,
            ordersProcessing,
            ordersShipped,
            ordersFulfillmentFailed,
            designsCreated,
        })

        if (!makeResult.sent) {
            const isNotConfigured = makeResult.reason === 'webhook_not_configured'
            logApiWarn(route, requestId, 'make_dispatch_failed', {
                reason: makeResult.reason,
                status: makeResult.status,
            })
            return respond(
                { error: isNotConfigured ? 'Daily digest webhook is not configured' : 'Daily digest dispatch failed' },
                { status: isNotConfigured ? 503 : 502 }
            )
        }

        logApiInfo(route, requestId, 'request_succeeded', {
            windowHours,
            ordersCreated,
            ordersPaid,
            ordersProcessing,
            ordersShipped,
            ordersFulfillmentFailed,
            designsCreated,
        })

        return respond({
            ok: true,
            windowHours,
            windowStartIso: windowStart.toISOString(),
            windowEndIso: windowEnd.toISOString(),
            metrics: {
                ordersCreated,
                ordersPaid,
                ordersProcessing,
                ordersShipped,
                ordersFulfillmentFailed,
                designsCreated,
            },
        })
    } catch (error) {
        logApiError(route, requestId, 'request_failed', error)
        return respond({ error: 'Daily digest generation failed' }, { status: 500 })
    }
}
