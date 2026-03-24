import { NextRequest } from 'next/server'
import { getRequestId, jsonWithRequestId, logApiError, logApiInfo, logApiWarn } from '@/lib/api-logging'
import { getOwnerCredentialState } from '@/lib/owner-auth'
import { getOwnerSessionFromRequest } from '@/lib/owner-auth-session'
import { canAccessOwnerPortal } from '@/lib/owner-portal'

export async function GET(req: NextRequest) {
    const route = '/api/admin/auth/me'
    const requestId = getRequestId(req)
    const respond = <T>(body: T, init?: ResponseInit) => jsonWithRequestId(requestId, body, init)
    logApiInfo(route, requestId, 'request_received')

    try {
        const session = getOwnerSessionFromRequest(req)
        if (!session) {
            logApiWarn(route, requestId, 'unauthenticated')
            return respond({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!canAccessOwnerPortal(session.email)) {
            logApiWarn(route, requestId, 'forbidden')
            return respond({ error: 'Unauthorized' }, { status: 401 })
        }

        const ownerCredential = await getOwnerCredentialState(session.email)
        logApiInfo(route, requestId, 'request_succeeded', { email: session.email })
        return respond({
            owner: {
                email: session.email,
                mustRotatePassword: ownerCredential.mustRotatePassword,
            },
        })
    } catch (error) {
        logApiError(route, requestId, 'request_failed', error)
        return respond({ error: 'Failed to fetch owner session' }, { status: 500 })
    }
}
