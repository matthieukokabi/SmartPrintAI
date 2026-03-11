import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { getSiteUrl } from '@/lib/site'
import { BLOG_POSTS } from '@/content/blogPosts'
import { SUPPORTED_LOCALES } from '@/lib/i18n'

export const revalidate = 3600
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const siteUrl = getSiteUrl()
    const now = new Date()

    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: `${siteUrl}/`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${siteUrl}/products`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${siteUrl}/create`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${siteUrl}/support`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${siteUrl}/blog`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${siteUrl}/careers`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.5,
        },
    ]

    const products = await prisma.product.findMany({
        where: { active: true },
        select: { id: true },
        orderBy: { name: 'asc' },
    })

    const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
        url: `${siteUrl}/products/${product.id}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8,
    }))

    const localizedProductRoutes: MetadataRoute.Sitemap = SUPPORTED_LOCALES.flatMap((locale) =>
        products.map((product) => ({
            url: `${siteUrl}/${locale}/products/${product.id}`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: locale === 'en' ? 0.75 : 0.65,
        }))
    )

    const blogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
        url: `${siteUrl}/blog/${post.slug}`,
        lastModified: new Date(post.publishedAt),
        changeFrequency: 'monthly',
        priority: 0.7,
    }))

    const localizedCoreRoutes: MetadataRoute.Sitemap = SUPPORTED_LOCALES.flatMap((locale) => [
        {
            url: `${siteUrl}/${locale}`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: locale === 'en' ? 0.85 : 0.75,
        },
        {
            url: `${siteUrl}/${locale}/products`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: locale === 'en' ? 0.8 : 0.7,
        },
        {
            url: `${siteUrl}/${locale}/careers`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.45,
        },
    ])

    return [...staticRoutes, ...localizedCoreRoutes, ...productRoutes, ...localizedProductRoutes, ...blogRoutes]
}
