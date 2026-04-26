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
                    // Don't index parametric variants of /create — every
                    // ?productId=/?color=/?size= combination is a duplicate
                    // of the canonical /create page.
                    '/create?',
                    '/*?productId=',
                    '/*?color=',
                    '/*?size=',
                ],
            },
        ],
        sitemap: `${siteUrl}/sitemap.xml`,
        host: siteUrl,
    }
}
