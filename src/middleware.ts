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
    // /en is a redirect alias of / — collapse before any other handling so
    // /en, /en/products, /en/products/<id> etc 308 to their apex equivalents.
    // Avoids duplicate canonicals being indexed (Search Console flagged the
    // /en family as canonical-tag-redundant).
    //
    // Build the redirect target from the public Host header (forwarded by
    // nginx). `req.nextUrl` and `req.url` both reflect the upstream host
    // (e.g. localhost:3100) when behind a reverse proxy and would leak
    // that into the Location response header.
    const { pathname, search } = req.nextUrl
    if (pathname === '/en' || pathname.startsWith('/en/')) {
        const newPathname = pathname === '/en' ? '/' : pathname.slice(3)
        const host = req.headers.get('host') || 'smartprintai.com'
        const proto = req.headers.get('x-forwarded-proto') || 'https'
        const target = new URL(newPathname + search, `${proto}://${host}`)
        return NextResponse.redirect(target, 308)
    }

    const requestHeaders = new Headers(req.headers)

    // Forward the URL path so the root layout can derive the locale and
    // set <html lang="..."> correctly per locale.
    requestHeaders.set('x-pathname', pathname)

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
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|opengraph-image|twitter-image|manifest.webmanifest|images/|storage/|videos/).*)'],
}
