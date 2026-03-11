import { NextRequest } from 'next/server'
import { getRequestId, jsonWithRequestId, logApiError, logApiInfo, logApiWarn } from '@/lib/api-logging'
import { isSupportedLocale, type SupportedLocale } from '@/lib/i18n'
import { rateLimitRequest } from '@/lib/rate-limit'
import { sendDiscountLeadNotification, sendFirstOrderCouponEmail } from '@/lib/resend'

type LeadPayload = {
    email: string
    locale: SupportedLocale
    source: string
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function normalizeSource(value: unknown): string {
    if (typeof value !== 'string') {
        return 'homepage_popup'
    }

    const candidate = value.trim().toLowerCase()
    if (!candidate || candidate.length > 80 || !/^[a-z0-9_-]+$/.test(candidate)) {
        return 'homepage_popup'
    }

    return candidate
}

function validateLeadPayload(input: unknown):
    | { ok: true; data: LeadPayload }
    | { ok: false; error: string } {
    if (!isObject(input)) {
        return { ok: false, error: 'Invalid payload' }
    }

    if (typeof input.email !== 'string') {
        return { ok: false, error: 'Invalid email' }
    }

    const email = input.email.trim().toLowerCase()
    if (!email || email.length > 254 || !isValidEmail(email)) {
        return { ok: false, error: 'Invalid email' }
    }

    let locale: SupportedLocale = 'en'
    if (typeof input.locale === 'string') {
        const normalizedLocale = input.locale.trim().toLowerCase()
        if (!isSupportedLocale(normalizedLocale)) {
            return { ok: false, error: 'Invalid locale' }
        }
        locale = normalizedLocale
    }

    return {
        ok: true,
        data: {
            email,
            locale,
            source: normalizeSource(input.source),
        },
    }
}

function getCouponCode(): string {
    const value = (process.env.FIRST_ORDER_COUPON_CODE || 'WELCOME10').trim()
    return value.length > 0 ? value : 'WELCOME10'
}

export async function POST(req: NextRequest) {
    const route = '/api/marketing/lead'
    const requestId = getRequestId(req)
    const respond = <T>(body: T, init?: ResponseInit) => jsonWithRequestId(requestId, body, init)

    logApiInfo(route, requestId, 'request_received')

    const limiter = await rateLimitRequest(req, 'marketing_lead', 20, 3600)
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

        const validation = validateLeadPayload(rawPayload)
        if (!validation.ok) {
            logApiWarn(route, requestId, 'validation_failed', { reason: validation.error })
            return respond({ error: validation.error }, { status: 400 })
        }

        const couponCode = getCouponCode()
        const { email, locale, source } = validation.data

        await sendDiscountLeadNotification({
            email,
            locale,
            source,
            couponCode,
            requestId,
        })

        await sendFirstOrderCouponEmail({
            email,
            locale,
            couponCode,
        })

        logApiInfo(route, requestId, 'request_succeeded', {
            locale,
            source,
        })

        return respond({
            ok: true,
            message: 'Discount code sent.',
            couponCode,
        })
    } catch (error) {
        logApiError(route, requestId, 'request_failed', error)
        return respond({ error: 'Unable to send discount code' }, { status: 500 })
    }
}
