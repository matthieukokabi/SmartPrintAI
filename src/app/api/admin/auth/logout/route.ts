import { NextRequest, NextResponse } from 'next/server'
import { getRequestId, jsonWithRequestId, logApiInfo } from '@/lib/api-logging'
import { OWNER_ADMIN_DEFAULT_PATH, buildOwnerLoginPath, normalizeOwnerAdminPath } from '@/lib/owner-auth-route'
import { clearOwnerSessionCookie } from '@/lib/owner-auth-session'

function getPublicOrigin(req: NextRequest): string {
    const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
    if (configuredBaseUrl) {
        try {
            return new URL(configuredBaseUrl).origin
        } catch {
            // Fall through to request-derived origin.
        }
    }

    const forwardedHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || req.headers.get('host')?.split(',')[0]?.trim()
    const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
    if (forwardedHost) {
        const protocol = forwardedProto || req.nextUrl.protocol.replace(':', '')
        return `${protocol}://${forwardedHost}`
    }

    return req.nextUrl.origin
}

export async function GET(req: NextRequest) {
    const route = '/api/admin/auth/logout'
    const requestId = getRequestId(req)
    logApiInfo(route, requestId, 'request_received')

    const nextPath = normalizeOwnerAdminPath(req.nextUrl.searchParams.get('next'), OWNER_ADMIN_DEFAULT_PATH)
    const response = NextResponse.redirect(new URL(buildOwnerLoginPath(nextPath), getPublicOrigin(req)))
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
