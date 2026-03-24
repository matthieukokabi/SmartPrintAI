import { NextRequest, NextResponse } from 'next/server'
import { createSessionToken, readSignInLinkToken, setSessionCookie } from '@/lib/auth-session'
import { prisma } from '@/lib/prisma'
import { getRequestId, logApiError, logApiInfo, logApiWarn } from '@/lib/api-logging'
import { normalizeAuthCallbackPath } from '@/lib/auth-callback'

function getPublicOrigin(req: NextRequest): string {
    const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
    if (configuredBaseUrl) {
        try {
            return new URL(configuredBaseUrl).origin
        } catch {
            // Fall through to request origin when configured URL is invalid.
        }
    }

    return new URL(req.url).origin
}

function buildPublicUrl(req: NextRequest, pathname: string): URL {
    return new URL(pathname, getPublicOrigin(req))
}

function redirectWithError(req: NextRequest, reason: string) {
    const url = buildPublicUrl(req, '/signin')
    url.searchParams.set('error', reason)
    return NextResponse.redirect(url)
}

export async function GET(req: NextRequest) {
    const route = '/api/auth/verify'
    const requestId = getRequestId(req)

    logApiInfo(route, requestId, 'request_received')

    try {
        const requestUrl = new URL(req.url)
        const tokenRaw = requestUrl.searchParams.get('token')
        const callbackUrl = normalizeAuthCallbackPath(requestUrl.searchParams.get('callbackUrl'))
        if (!tokenRaw || tokenRaw.length > 4000) {
            logApiWarn(route, requestId, 'missing_token')
            return redirectWithError(req, 'missing_token')
        }

        const tokenData = readSignInLinkToken(tokenRaw)
        if (!tokenData) {
            logApiWarn(route, requestId, 'invalid_or_expired_token')
            return redirectWithError(req, 'invalid_or_expired')
        }

        const user = await prisma.user.upsert({
            where: { email: tokenData.email },
            update: {},
            create: {
                email: tokenData.email,
            },
        })

        await prisma.order.updateMany({
            where: {
                email: tokenData.email,
                userId: null,
            },
            data: {
                userId: user.id,
            },
        })

        const sessionToken = createSessionToken(user.id, user.email)

        const response = NextResponse.redirect(buildPublicUrl(req, callbackUrl))
        setSessionCookie(response, sessionToken)

        logApiInfo(route, requestId, 'request_succeeded', { userId: user.id, callbackUrl })
        return response
    } catch (error) {
        logApiError(route, requestId, 'request_failed', error)
        return redirectWithError(req, 'server_error')
    }
}
