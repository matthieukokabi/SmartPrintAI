import { NextRequest, NextResponse } from 'next/server'
import { getRequestId, jsonWithRequestId, logApiInfo } from '@/lib/api-logging'
import { OWNER_ADMIN_DEFAULT_PATH, buildOwnerLoginPath, normalizeOwnerAdminPath } from '@/lib/owner-auth-route'
import { clearOwnerSessionCookie } from '@/lib/owner-auth-session'

export async function GET(req: NextRequest) {
    const route = '/api/admin/auth/logout'
    const requestId = getRequestId(req)
    logApiInfo(route, requestId, 'request_received')

    const nextPath = normalizeOwnerAdminPath(req.nextUrl.searchParams.get('next'), OWNER_ADMIN_DEFAULT_PATH)
    const response = NextResponse.redirect(new URL(buildOwnerLoginPath(nextPath), req.url))
    clearOwnerSessionCookie(response)

    logApiInfo(route, requestId, 'request_succeeded')
    return response
}

export async function POST(req: NextRequest) {
    const route = '/api/admin/auth/logout'
    const requestId = getRequestId(req)
    const respond = <T>(body: T, init?: ResponseInit) => jsonWithRequestId(requestId, body, init)
    logApiInfo(route, requestId, 'request_received')

    const response = respond({ ok: true })
    clearOwnerSessionCookie(response)

    logApiInfo(route, requestId, 'request_succeeded')
    return response
}
