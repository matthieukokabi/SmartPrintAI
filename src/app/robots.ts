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
                    // Parametric /create variants (?productId=/?color=/?size=)
                    // are deduplicated via <link rel="canonical"> on the
                    // rendered page, NOT via robots.txt. Blocking at robots
                    // level prevented Google from seeing the canonical
                    // signal — see GSC alert 2026-05-05 and the canonical
                    // declarations in src/app/create/layout.tsx and
                    // src/app/[locale]/create/page.tsx.
                ],
            },
        ],
        sitemap: `${siteUrl}/sitemap.xml`,
        host: siteUrl,
    }
}
