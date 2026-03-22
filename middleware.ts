import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import {
    HOMEPAGE_HERO_VARIANT_COOKIE,
    HOMEPAGE_HERO_VARIANT_HEADER,
    HOMEPAGE_HERO_VARIANT_MAX_AGE_SEC,
    HOMEPAGE_VISITOR_ID_COOKIE,
    assignHomepageHeroVariant,
    normalizeHomepageHeroVariant,
    sanitizeVisitorId,
} from '@/lib/homepage-experiment'

export function middleware(req: NextRequest) {
    const requestHeaders = new Headers(req.headers)

    const incomingVisitorId = sanitizeVisitorId(req.cookies.get(HOMEPAGE_VISITOR_ID_COOKIE)?.value)
    const visitorId = incomingVisitorId || crypto.randomUUID()

    const incomingVariant = normalizeHomepageHeroVariant(req.cookies.get(HOMEPAGE_HERO_VARIANT_COOKIE)?.value)
    const assignedVariant = incomingVariant || assignHomepageHeroVariant(visitorId)
    requestHeaders.set(HOMEPAGE_HERO_VARIANT_HEADER, assignedVariant)

    const res = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    })

    if (!incomingVisitorId) {
        res.cookies.set(HOMEPAGE_VISITOR_ID_COOKIE, visitorId, {
            maxAge: HOMEPAGE_HERO_VARIANT_MAX_AGE_SEC,
            path: '/',
            sameSite: 'lax',
            secure: true,
            httpOnly: false,
        })
    }

    if (incomingVariant !== assignedVariant) {
        res.cookies.set(HOMEPAGE_HERO_VARIANT_COOKIE, assignedVariant, {
            maxAge: HOMEPAGE_HERO_VARIANT_MAX_AGE_SEC,
            path: '/',
            sameSite: 'lax',
            secure: true,
            httpOnly: false,
        })
    }

    return res
}

export const config = {
    matcher: ['/', '/en', '/fr', '/de', '/es'],
}
