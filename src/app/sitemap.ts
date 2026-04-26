import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { getSiteUrl } from '@/lib/site'
import { BLOG_POSTS } from '@/content/blogPosts'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/lib/i18n'
import { splitBlockedGootenReadyToBuyProducts } from '@/lib/gooten-ready-to-buy-safety'

export const revalidate = 3600
export const dynamic = 'force-dynamic'

function buildAlternates(siteUrl: string, path: string) {
    const languages: Record<string, string> = {
        'x-default': `${siteUrl}${path}`,
    }
    // English is served at the apex (no /en prefix). /en is a redirect
    // alias of /; emitting an /en hreflang here would advertise a URL
    // that 308-redirects, which Google flags as a canonical mismatch.
    languages[DEFAULT_LOCALE] = `${siteUrl}${path}`
    for (const locale of SUPPORTED_LOCALES) {
        if (locale === DEFAULT_LOCALE) continue
        languages[locale] = `${siteUrl}/${locale}${path}`
    }
    return { languages }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const siteUrl = getSiteUrl()
    const now = new Date()
    // /en is a redirect alias of / (handled by middleware) — never list it
    // as a distinct sitemap entry.
    const NON_DEFAULT_LOCALES = SUPPORTED_LOCALES.filter((locale) => locale !== 'en')

    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: `${siteUrl}/`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 1,
            alternates: buildAlternates(siteUrl, '/'),
        },
        {
            url: `${siteUrl}/products`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.9,
            alternates: buildAlternates(siteUrl, '/products'),
        },
        {
            url: `${siteUrl}/create`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.9,
            alternates: buildAlternates(siteUrl, '/create'),
        },
        {
            url: `${siteUrl}/support`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.6,
            alternates: buildAlternates(siteUrl, '/support'),
        },
        {
            url: `${siteUrl}/about`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: `${siteUrl}/privacy`,
            lastModified: now,
            changeFrequency: 'yearly',
            priority: 0.4,
        },
        {
            url: `${siteUrl}/terms`,
            lastModified: now,
            changeFrequency: 'yearly',
            priority: 0.4,
        },
        {
            url: `${siteUrl}/returns`,
            lastModified: now,
            changeFrequency: 'yearly',
            priority: 0.4,
        },
        {
            url: `${siteUrl}/shipping`,
            lastModified: now,
            changeFrequency: 'yearly',
            priority: 0.4,
        },
        {
            url: `${siteUrl}/blog`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.8,
            alternates: buildAlternates(siteUrl, '/blog'),
        },
    ]

    const products = await prisma.product.findMany({
        where: { active: true },
        select: { id: true, name: true, printfulId: true, printArea: true },
        orderBy: { name: 'asc' },
    })
    const { sellable: sellableProducts } = splitBlockedGootenReadyToBuyProducts(products)

    const productRoutes: MetadataRoute.Sitemap = sellableProducts.map((product) => ({
        url: `${siteUrl}/products/${product.id}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
        alternates: buildAlternates(siteUrl, `/products/${product.id}`),
    }))

    const localizedProductRoutes: MetadataRoute.Sitemap = NON_DEFAULT_LOCALES.flatMap((locale) =>
        sellableProducts.map((product) => ({
            url: `${siteUrl}/${locale}/products/${product.id}`,
            lastModified: now,
            changeFrequency: 'weekly' as const,
            priority: 0.65,
        }))
    )

    const blogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
        url: `${siteUrl}/blog/${post.slug}`,
        lastModified: new Date(post.publishedAt),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
        alternates: buildAlternates(siteUrl, `/blog/${post.slug}`),
    }))

    const localizedBlogRoutes: MetadataRoute.Sitemap = NON_DEFAULT_LOCALES.flatMap<MetadataRoute.Sitemap[number]>(
        (locale) => [
            {
                url: `${siteUrl}/${locale}/blog`,
                lastModified: now,
                changeFrequency: 'weekly',
                priority: 0.62,
            },
            ...BLOG_POSTS.map<MetadataRoute.Sitemap[number]>((post) => ({
                url: `${siteUrl}/${locale}/blog/${post.slug}`,
                lastModified: new Date(post.publishedAt),
                changeFrequency: 'monthly',
                priority: 0.56,
            })),
        ]
    )

    const localizedCoreRoutes: MetadataRoute.Sitemap = NON_DEFAULT_LOCALES.flatMap((locale) => [
        {
            url: `${siteUrl}/${locale}`,
            lastModified: now,
            changeFrequency: 'weekly' as const,
            priority: 0.75,
        },
        {
            url: `${siteUrl}/${locale}/products`,
            lastModified: now,
            changeFrequency: 'daily' as const,
            priority: 0.7,
        },
        {
            url: `${siteUrl}/${locale}/create`,
            lastModified: now,
            changeFrequency: 'daily' as const,
            priority: 0.72,
        },
        {
            url: `${siteUrl}/${locale}/support`,
            lastModified: now,
            changeFrequency: 'monthly' as const,
            priority: 0.5,
        },
    ])

    return [
        ...staticRoutes,
        ...localizedCoreRoutes,
        ...productRoutes,
        ...localizedProductRoutes,
        ...blogRoutes,
        ...localizedBlogRoutes,
    ]
}
