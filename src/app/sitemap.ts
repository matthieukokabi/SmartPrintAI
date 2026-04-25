import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { getSiteUrl } from '@/lib/site'
import { BLOG_POSTS } from '@/content/blogPosts'
import { SUPPORTED_LOCALES } from '@/lib/i18n'
import { splitBlockedGootenReadyToBuyProducts } from '@/lib/gooten-ready-to-buy-safety'

export const revalidate = 3600
export const dynamic = 'force-dynamic'

// Mirror the predicate used in the product detail page
function hasUserDesign(product: { imageUrl: string | null; hasDesign?: boolean | null }): boolean {
      if ((product as Record<string, unknown>).hasDesign === false) return false
      const url = product.imageUrl
      if (!url) return false
      if (url.includes('placeholder') || url === '') return false
      return true
}

function buildAlternates(siteUrl: string, path: string) {
      const languages: Record<string, string> = {
              'x-default': `${siteUrl}${path}`,
      }
      for (const locale of SUPPORTED_LOCALES) {
              // skip /en — it redirects to /
        if (locale === 'en') continue
              languages[locale] = `${siteUrl}/${locale}${path}`
      }
      return { languages }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
      const siteUrl = getSiteUrl()
      const now = new Date()

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
          // Explicit locale root pages (excluding /en which redirects to /)
      {
                url: `${siteUrl}/fr`,
                lastModified: now,
                changeFrequency: 'weekly',
                priority: 0.75,
      },
      {
                url: `${siteUrl}/de`,
                lastModified: now,
                changeFrequency: 'weekly',
                priority: 0.75,
      },
      {
                url: `${siteUrl}/es`,
                lastModified: now,
                changeFrequency: 'weekly',
                priority: 0.75,
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
          select: { id: true, name: true, printfulId: true, printArea: true, imageUrl: true, hasDesign: true },
          orderBy: { name: 'asc' },
  })
      const { sellable: sellableProducts } = splitBlockedGootenReadyToBuyProducts(products)

  // Only index products that have a real user design image
  const indexableProducts = sellableProducts.filter(hasUserDesign)

  const productRoutes: MetadataRoute.Sitemap = indexableProducts.map((product) => ({
          url: `${siteUrl}/products/${product.id}`,
          lastModified: now,
          changeFrequency: 'weekly' as const,
          priority: 0.8,
          alternates: buildAlternates(siteUrl, `/products/${product.id}`),
  }))

  const localizedProductRoutes: MetadataRoute.Sitemap = SUPPORTED_LOCALES.flatMap((locale) =>
          // skip /en — it redirects to /
                                                                                      locale === 'en'
                                                                                        ? []
            : indexableProducts.map((product) => ({
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

  const localizedBlogRoutes: MetadataRoute.Sitemap = SUPPORTED_LOCALES.flatMap<MetadataRoute.Sitemap[number]>(
          (locale) =>
                    locale === 'en'
              ? []
                      : [
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

  const localizedCoreRoutes: MetadataRoute.Sitemap = SUPPORTED_LOCALES.flatMap((locale) =>
          // skip /en — it redirects to /
                                                                                   locale === 'en'
                                                                                     ? []
            : [
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
                        ]
                                                                                 )

  return [
          ...staticRoutes,
          ...localizedCoreRoutes,
          ...productRoutes,
          ...localizedProductRoutes,
          ...blogRoutes,
          ...localizedBlogRoutes,
        ]
}
