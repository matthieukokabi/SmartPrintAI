import { NextRequest } from 'next/server'
import { getRequestId, jsonWithRequestId, logApiError, logApiInfo, logApiWarn } from '@/lib/api-logging'
import { rateLimitRequest } from '@/lib/rate-limit'
import { appendHomepageEventRecord, isHomepageEventName } from '@/lib/homepage-funnel-report'

const ROUTE = '/api/analytics/events'
const RATE_LIMIT = {
    limit: 240,
    windowSec: 60,
}

type EventPayload = {
    eventName?: unknown
    params?: unknown
    path?: unknown
    pageVariant?: unknown
    locale?: unknown
    timestamp?: unknown
}

function toShortString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    if (!trimmed) return undefined
    return trimmed.slice(0, 240)
}

export async function POST(req: NextRequest) {
    const requestId = getRequestId(req)
    logApiInfo(ROUTE, requestId, 'request_received')

    const rateLimit = await rateLimitRequest(req, 'analytics-events', RATE_LIMIT.limit, RATE_LIMIT.windowSec)
    if (!rateLimit.allowed) {
        logApiWarn(ROUTE, requestId, 'rate_limited', { resetInSec: rateLimit.resetInSec })
        const response = jsonWithRequestId(requestId, { error: 'Rate limit exceeded.' }, { status: 429 })
        response.headers.set('retry-after', String(rateLimit.resetInSec))
        return response
    }

    let payload: EventPayload
    try {
        payload = (await req.json()) as EventPayload
    } catch {
        logApiWarn(ROUTE, requestId, 'invalid_json')
        return jsonWithRequestId(requestId, { error: 'Invalid JSON body' }, { status: 400 })
    }

    const eventNameRaw = toShortString(payload.eventName)
    if (!eventNameRaw || !isHomepageEventName(eventNameRaw)) {
        logApiWarn(ROUTE, requestId, 'invalid_event_name')
        return jsonWithRequestId(requestId, { error: 'Invalid eventName' }, { status: 400 })
    }

    try {
        const appended = await appendHomepageEventRecord({
            eventName: eventNameRaw,
            params: typeof payload.params === 'object' && payload.params !== null ? payload.params as Record<string, unknown> : {},
            path: toShortString(payload.path) || req.nextUrl.pathname,
            pageVariant: toShortString(payload.pageVariant) || null,
            locale: toShortString(payload.locale) || null,
            userAgent: toShortString(req.headers.get('user-agent')) || null,
            createdAt: toShortString(payload.timestamp),
        })

        logApiInfo(ROUTE, requestId, 'event_recorded', {
            eventName: appended.eventName,
            deviceType: appended.deviceType,
        })
        return jsonWithRequestId(requestId, { ok: true }, { status: 202 })
    } catch (error) {
        logApiError(ROUTE, requestId, 'record_failed', error)
        return jsonWithRequestId(requestId, { error: 'Unable to record analytics event' }, { status: 500 })
    }
}
