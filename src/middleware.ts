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
        const { pathname, search } = req.nextUrl

    // 308 redirect /en → / and /en/* → /*
    // English is the default locale; /en/* are redundant canonical duplicates.
    if (pathname === '/en' || pathname.startsWith('/en/')) {
                const destination = pathname === '/en' ? '/' : pathname.slice(3) || '/'
                const redirectUrl = new URL(destination + search, req.url)
                return NextResponse.redirect(redirectUrl, { status: 308 })
    }

    const requestHeaders = new Headers(req.headers)

    // Forward the URL path so the root layout can derive the locale and
    // set <html lang="..."> correctly per locale.
    requestHeaders.set('x-pathname', req.nextUrl.pathname)

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
        // Run on every page request so x-pathname is forwarded to the root
        // layout for per-locale <html lang>. Skip API routes, Next.js internals,
        // and static assets to keep middleware overhead minimal.
        matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|opengraph-image|twitter-image|manifest.webma).*)'],
}
