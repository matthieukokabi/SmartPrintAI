import { NextRequest } from 'next/server'
import { getRequestId, jsonWithRequestId, logApiError, logApiInfo, logApiWarn } from '@/lib/api-logging'
import { rateLimitRequest } from '@/lib/rate-limit'
import { authenticateOwnerLogin } from '@/lib/owner-auth'
import { OWNER_ADMIN_DEFAULT_PATH, normalizeOwnerAdminPath } from '@/lib/owner-auth-route'
import { createOwnerSessionToken, setOwnerSessionCookie } from '@/lib/owner-auth-session'

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function POST(req: NextRequest) {
    const route = '/api/admin/auth/login'
    const requestId = getRequestId(req)
    const respond = <T>(body: T, init?: ResponseInit) => jsonWithRequestId(requestId, body, init)

    logApiInfo(route, requestId, 'request_received')

    const limiter = await rateLimitRequest(req, 'owner_auth_login', 20, 600)
    if (!limiter.allowed) {
        logApiWarn(route, requestId, 'rate_limited', { resetInSec: limiter.resetInSec })
        const response = respond({ error: 'Too many login attempts. Please retry shortly.' }, { status: 429 })
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

        if (!isObject(payload) || typeof payload.email !== 'string' || typeof payload.password !== 'string') {
            logApiWarn(route, requestId, 'validation_failed')
            return respond({ error: 'Email and password are required' }, { status: 400 })
        }

        const email = payload.email.trim().toLowerCase()
        const password = payload.password
        if (!isValidEmail(email) || email.length > 254 || password.length === 0 || password.length > 256) {
            logApiWarn(route, requestId, 'validation_failed')
            return respond({ error: 'Invalid credentials' }, { status: 400 })
        }

        const result = await authenticateOwnerLogin(email, password)
        if (!result.ok) {
            if (result.code === 'bootstrap_not_configured') {
                logApiWarn(route, requestId, 'bootstrap_not_configured')
                return respond({ error: 'Owner password is not configured. Set owner bootstrap credentials first.' }, { status: 503 })
            }

            logApiWarn(route, requestId, 'invalid_credentials')
            return respond({ error: 'Invalid owner credentials' }, { status: 401 })
        }

        const nextPath = normalizeOwnerAdminPath(
            typeof payload.next === 'string' ? payload.next : undefined,
            OWNER_ADMIN_DEFAULT_PATH,
        )
        const destination = result.mustRotatePassword ? '/admin/security?required=1' : nextPath

        const sessionToken = createOwnerSessionToken(result.email)
        const response = respond({
            ok: true,
            nextPath: destination,
            mustRotatePassword: result.mustRotatePassword,
        })
        setOwnerSessionCookie(response, sessionToken)

        logApiInfo(route, requestId, 'request_succeeded', {
            email: result.email,
            mustRotatePassword: result.mustRotatePassword,
        })
        return response
    } catch (error) {
        logApiError(route, requestId, 'request_failed', error)
        return respond({ error: 'Unable to sign in' }, { status: 500 })
    }
}
