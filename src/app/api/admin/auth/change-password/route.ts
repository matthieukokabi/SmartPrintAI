import { NextRequest } from 'next/server'
import { getRequestId, jsonWithRequestId, logApiError, logApiInfo, logApiWarn } from '@/lib/api-logging'
import { changeOwnerPassword } from '@/lib/owner-auth'
import { getOwnerSessionFromRequest } from '@/lib/owner-auth-session'

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

export async function POST(req: NextRequest) {
    const route = '/api/admin/auth/change-password'
    const requestId = getRequestId(req)
    const respond = <T>(body: T, init?: ResponseInit) => jsonWithRequestId(requestId, body, init)
    logApiInfo(route, requestId, 'request_received')

    try {
        const session = getOwnerSessionFromRequest(req)
        if (!session) {
            logApiWarn(route, requestId, 'unauthenticated')
            return respond({ error: 'Unauthorized' }, { status: 401 })
        }

        let payload: unknown
        try {
            payload = await req.json()
        } catch {
            logApiWarn(route, requestId, 'invalid_json')
            return respond({ error: 'Invalid JSON body' }, { status: 400 })
        }

        if (
            !isObject(payload)
            || typeof payload.currentPassword !== 'string'
            || typeof payload.newPassword !== 'string'
        ) {
            logApiWarn(route, requestId, 'validation_failed')
            return respond({ error: 'Current password and new password are required' }, { status: 400 })
        }

        const result = await changeOwnerPassword(
            session.email,
            payload.currentPassword,
            payload.newPassword,
        )
        if (!result.ok) {
            if (result.code === 'password_too_short') {
                return respond({ error: 'New password is too short' }, { status: 400 })
            }
            if (result.code === 'bootstrap_not_configured') {
                return respond({ error: 'Owner password bootstrap is not configured' }, { status: 503 })
            }
            return respond({ error: 'Invalid credentials' }, { status: 401 })
        }

        logApiInfo(route, requestId, 'request_succeeded')
        return respond({ ok: true })
    } catch (error) {
        logApiError(route, requestId, 'request_failed', error)
        return respond({ error: 'Unable to update password' }, { status: 500 })
    }
}
