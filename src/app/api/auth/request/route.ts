import { NextRequest } from 'next/server'
import { createSignInLinkToken } from '@/lib/auth-session'
import { getRequestId, jsonWithRequestId, logApiError, logApiInfo, logApiWarn } from '@/lib/api-logging'
import { rateLimitRequest } from '@/lib/rate-limit'
import { sendSignInLink } from '@/lib/resend'
import { isOwnerPortalCallbackPath, normalizeAuthCallbackPath } from '@/lib/auth-callback'

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function POST(req: NextRequest) {
    const route = '/api/auth/request'
    const requestId = getRequestId(req)
    const respond = <T>(body: T, init?: ResponseInit) => jsonWithRequestId(requestId, body, init)

    logApiInfo(route, requestId, 'request_received')

    const limiter = await rateLimitRequest(req, 'auth_request', 10, 600)
    if (!limiter.allowed) {
        logApiWarn(route, requestId, 'rate_limited', { resetInSec: limiter.resetInSec })
        const response = respond({ error: 'Too many sign-in attempts. Please retry shortly.' }, { status: 429 })
        response.headers.set('retry-after', String(limiter.resetInSec))
        return response
    }

    try {
        let payload: unknown
        try {
            payload = await req.json()
        } catch {
            logApiWarn(route, requestId, 'invalid_json')
            return respond({ error: 'Invalid JSON body' }, { status: 400 })
        }

        if (!isObject(payload) || typeof payload.email !== 'string') {
            logApiWarn(route, requestId, 'validation_failed')
            return respond({ error: 'Email is required' }, { status: 400 })
        }

        const email = payload.email.trim().toLowerCase()
        if (!isValidEmail(email) || email.length > 254) {
            logApiWarn(route, requestId, 'invalid_email')
            return respond({ error: 'Invalid email' }, { status: 400 })
        }
        const callbackUrl = normalizeAuthCallbackPath(
            typeof payload.callbackUrl === 'string' ? payload.callbackUrl : undefined,
        )

        const token = createSignInLinkToken(email)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const verifyUrl = baseUrl.replace(/\/$/, '') + '/api/auth/verify?token=' + encodeURIComponent(token) + '&callbackUrl=' + encodeURIComponent(callbackUrl)

        await sendSignInLink({
            email,
            verifyUrl,
            context: isOwnerPortalCallbackPath(callbackUrl) ? 'owner_portal' : 'customer_orders',
        })

        logApiInfo(route, requestId, 'request_succeeded')
        return respond({ ok: true })
    } catch (error) {
        logApiError(route, requestId, 'request_failed', error)
        return respond({ error: 'Unable to send sign-in link' }, { status: 500 })
    }
}
