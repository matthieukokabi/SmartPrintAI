import { NextRequest } from 'next/server'
import { getRequestId, jsonWithRequestId, logApiError, logApiInfo, logApiWarn } from '@/lib/api-logging'
import {
    ANALYTICS_ATTRIBUTION_COOKIE,
    ATTRIBUTION_COOKIE_MAX_AGE_SEC,
    buildAttributionContext,
    mergeAttributionWithFallback,
    normalizeAttributionFromParams,
    readAttributionCookie,
    serializeAttributionCookie,
} from '@/lib/analytics-attribution'
import { rateLimitRequest } from '@/lib/rate-limit'
import { readConsentState } from '@/lib/consent'
import { appendHomepageEventRecord, isFunnelEventName } from '@/lib/homepage-funnel-report'
import {
    HOMEPAGE_HERO_VARIANT_MAX_AGE_SEC,
    HOMEPAGE_VISITOR_ID_COOKIE,
    sanitizeVisitorId,
} from '@/lib/homepage-experiment'

const ROUTE = '/api/analytics/events'
const RATE_LIMIT = {
    limit: 240,
    windowSec: 60,
}
type VisitorIdSource = 'payload' | 'cookie' | 'generated'

type EventPayload = {
    eventName?: unknown
    params?: unknown
    path?: unknown
    pageVariant?: unknown
    locale?: unknown
    timestamp?: unknown
}

type EventParams = Record<string, unknown>

function toShortString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    if (!trimmed) return undefined
    return trimmed.slice(0, 240)
}

function toEventParams(params: unknown): EventParams {
    if (!params || typeof params !== 'object' || Array.isArray(params)) {
        return {}
    }
    return params as EventParams
}

function toPathParts(rawPath: string | undefined, fallbackPathname: string): {
    pathname: string
    search: string
} {
    const raw = rawPath?.trim() || fallbackPathname
    try {
        const parsed = new URL(raw, 'https://smartprintai.com')
        return {
            pathname: parsed.pathname || fallbackPathname,
            search: parsed.search || '',
        }
    } catch {
        const [pathname, search = ''] = raw.split('?')
        return {
            pathname: pathname || fallbackPathname,
            search: search ? `?${search}` : '',
        }
    }
}

function generateVisitorId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }
    return `spai_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function resolveVisitorId(req: NextRequest, params: EventParams): {
    visitorId: string
    source: VisitorIdSource
    shouldSetCookie: boolean
} {
    const fromPayload = sanitizeVisitorId(typeof params.visitor_id === 'string' ? params.visitor_id : null)
    const fromCookie = sanitizeVisitorId(req.cookies.get(HOMEPAGE_VISITOR_ID_COOKIE)?.value)

    if (fromPayload) {
        return {
            visitorId: fromPayload,
            source: 'payload',
            shouldSetCookie: !fromCookie,
        }
    }

    if (fromCookie) {
        return {
            visitorId: fromCookie,
            source: 'cookie',
            shouldSetCookie: false,
        }
    }

    return {
        visitorId: generateVisitorId(),
        source: 'generated',
        shouldSetCookie: true,
    }
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

    // Consent gate (GDPR/ePrivacy): pre-consent traffic does NOT write a
    // funnel event and does NOT set the visitor_id or attribution cookies.
    // Only an explicit `consent_state=accepted` cookie (set by the user
    // clicking Accept on the banner) opens the gate. See src/lib/consent.ts.
    const consent = readConsentState(req)
    if (consent !== 'accepted') {
        logApiInfo(ROUTE, requestId, 'consent_gate_blocked', { consent })
        return jsonWithRequestId(requestId, { ok: true, consentSkipped: true }, { status: 202 })
    }

    let payload: EventPayload
    try {
        payload = (await req.json()) as EventPayload
    } catch {
        logApiWarn(ROUTE, requestId, 'invalid_json')
        return jsonWithRequestId(requestId, { error: 'Invalid JSON body' }, { status: 400 })
    }

    const eventNameRaw = toShortString(payload.eventName)
    if (!eventNameRaw || !isFunnelEventName(eventNameRaw)) {
        logApiWarn(ROUTE, requestId, 'invalid_event_name')
        return jsonWithRequestId(requestId, { error: 'Invalid eventName' }, { status: 400 })
    }

    const params = toEventParams(payload.params)
    const { visitorId, source, shouldSetCookie } = resolveVisitorId(req, params)
    if (source !== 'payload') {
        logApiWarn(ROUTE, requestId, 'visitor_id_auto_attached', {
            eventName: eventNameRaw,
            source,
        })
    }

    const pathInput = toShortString(payload.path) || req.nextUrl.pathname
    const pathParts = toPathParts(pathInput, req.nextUrl.pathname)
    const attributionFromParams = normalizeAttributionFromParams(params)
    const attributionFromCookie = readAttributionCookie(
        req.cookies.get(ANALYTICS_ATTRIBUTION_COOKIE)?.value,
        visitorId
    )
    const attributionFallback = buildAttributionContext({
        visitorId,
        pathname: pathParts.pathname,
        search: pathParts.search,
        referrer: toShortString(req.headers.get('referer')),
        origin: req.nextUrl.origin,
        userAgent: toShortString(req.headers.get('user-agent')),
    })
    const resolvedAttribution = mergeAttributionWithFallback(
        attributionFromParams,
        attributionFromCookie ? attributionFromCookie : attributionFallback
    )
    const shouldSetAttributionCookie = !attributionFromCookie || attributionFromCookie.visitor_id !== visitorId

    try {
        const appended = await appendHomepageEventRecord({
            eventName: eventNameRaw,
            params: {
                ...params,
                visitor_id: visitorId,
                ...resolvedAttribution,
            },
            path: pathInput,
            pageVariant: toShortString(payload.pageVariant) || null,
            locale: toShortString(payload.locale) || null,
            userAgent: toShortString(req.headers.get('user-agent')) || null,
            createdAt: toShortString(payload.timestamp),
        })

        logApiInfo(ROUTE, requestId, 'event_recorded', {
            eventName: appended.eventName,
            deviceType: appended.deviceType,
            visitorIdSource: source,
        })
        const response = jsonWithRequestId(requestId, { ok: true }, { status: 202 })
        if (shouldSetCookie) {
            response.cookies.set(HOMEPAGE_VISITOR_ID_COOKIE, visitorId, {
                maxAge: HOMEPAGE_HERO_VARIANT_MAX_AGE_SEC,
                path: '/',
                sameSite: 'lax',
                secure: req.nextUrl.protocol === 'https:',
                httpOnly: false,
            })
        }
        if (shouldSetAttributionCookie) {
            response.cookies.set(ANALYTICS_ATTRIBUTION_COOKIE, serializeAttributionCookie({
                visitor_id: visitorId,
                captured_at: attributionFromCookie?.captured_at || attributionFallback.captured_at,
                ...resolvedAttribution,
            }), {
                maxAge: ATTRIBUTION_COOKIE_MAX_AGE_SEC,
                path: '/',
                sameSite: 'lax',
                secure: req.nextUrl.protocol === 'https:',
                httpOnly: false,
            })
        }
        return response
    } catch (error) {
        logApiError(ROUTE, requestId, 'record_failed', error)
        return jsonWithRequestId(requestId, { error: 'Unable to record analytics event' }, { status: 500 })
    }
}
