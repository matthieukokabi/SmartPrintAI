import { NextRequest } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth-session'
import { prisma } from '@/lib/prisma'
import { getRequestId, jsonWithRequestId, logApiError, logApiInfo, logApiWarn } from '@/lib/api-logging'

export async function GET(req: NextRequest) {
    const route = '/api/auth/me'
    const requestId = getRequestId(req)
    const respond = <T>(body: T, init?: ResponseInit) => jsonWithRequestId(requestId, body, init)

    logApiInfo(route, requestId, 'request_received')

    try {
        const session = getSessionFromRequest(req)
        if (!session) {
            logApiWarn(route, requestId, 'unauthenticated')
            return respond({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { id: true, email: true, name: true },
        })

        if (!user) {
            logApiWarn(route, requestId, 'user_not_found')
            return respond({ error: 'Unauthorized' }, { status: 401 })
        }

        logApiInfo(route, requestId, 'request_succeeded', { userId: user.id })
        return respond({ user })
    } catch (error) {
        logApiError(route, requestId, 'request_failed', error)
        return respond({ error: 'Failed to fetch session' }, { status: 500 })
    }
}
