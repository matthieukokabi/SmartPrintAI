import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth-session'
import { getRequestId, jsonWithRequestId, logApiInfo } from '@/lib/api-logging'

export async function GET(req: NextRequest) {
    const route = '/api/auth/logout'
    const requestId = getRequestId(req)
    logApiInfo(route, requestId, 'request_received')

    const response = NextResponse.redirect(new URL('/', req.url))
    clearSessionCookie(response)

    logApiInfo(route, requestId, 'request_succeeded')
    return response
}

export async function POST(req: NextRequest) {
    const route = '/api/auth/logout'
    const requestId = getRequestId(req)
    const respond = <T>(body: T, init?: ResponseInit) => jsonWithRequestId(requestId, body, init)

    logApiInfo(route, requestId, 'request_received')

    const response = respond({ ok: true })
    clearSessionCookie(response)

    logApiInfo(route, requestId, 'request_succeeded')
    return response
}
