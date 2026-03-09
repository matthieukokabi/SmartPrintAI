import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { getSiteUrl } from '@/lib/site'

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

    return [...staticRoutes, ...productRoutes]
}
