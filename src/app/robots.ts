import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
    const siteUrl = getSiteUrl()

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/api/',
                    '/signin',
                    '/account',
                    '/orders',
                    '/cart',
                    '/success',
                    '/admin',
                    // Parametric /create variants (?productId=/?color=/?size=
                    // /?utm_*=) are NOT blocked here. They're handled at the
                    // page level: the rendered metadata sets robots:
                    // { index: false, follow: true } when any query param is
                    // present, while keeping the canonical <link> tag so
                    // Google consolidates link equity onto /create. Blocking
                    // at the robots level prevented Google from seeing the
                    // canonical signal — see GSC alert 2026-05-05 and the
                    // generateMetadata implementations in
                    // src/app/create/page.tsx and src/app/[locale]/create/page.tsx
                    // (and GSC Soft 404 fix 2026-05-29).
                ],
            },
        ],
        sitemap: `${siteUrl}/sitemap.xml`,
        host: siteUrl,
    }
}
