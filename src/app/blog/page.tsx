import type { Metadata } from 'next'
import Link from 'next/link'
import { BLOG_UI_COPY, getLocalizedBlogPosts } from '@/content/blogPosts'
import { toAbsoluteUrl } from '@/lib/site'
import { DEFAULT_LOCALE, buildLocaleAlternates } from '@/lib/i18n'
import { buildLocalizedSocialMetadata } from '@/lib/metadata'
import { buildBreadcrumbList, getBreadcrumbLabel } from '@/lib/schema'

const locale = DEFAULT_LOCALE
const copy = BLOG_UI_COPY[locale]

export const metadata: Metadata = {
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    alternates: {
        canonical: '/blog',
        languages: buildLocaleAlternates('/blog'),
    },
    ...buildLocalizedSocialMetadata({
        locale,
        path: '/blog',
        title: copy.metadataTitle,
        description: copy.metadataDescription,
    }),
}

export default function BlogIndexPage() {
    const posts = getLocalizedBlogPosts(locale)

    const itemListSchema = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: posts.map((post, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: toAbsoluteUrl(`/blog/${post.slug}`),
            name: post.title,
        })),
    }
    const breadcrumbSchema = buildBreadcrumbList([
        { name: getBreadcrumbLabel(locale, 'home'), path: '/' },
        { name: getBreadcrumbLabel(locale, 'blog'), path: '/blog' },
    ])

    return (
        <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

            <header className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-bold">{copy.heading}</h1>
                <p className="text-muted-foreground">{copy.subtitle}</p>
            </header>

            <section className="grid gap-3 sm:grid-cols-2">
                <Link href="/products" className="glass rounded-2xl p-4 transition-colors hover:border-purple-400/60">
                    <p className="text-sm font-semibold">Browse all products</p>
                    <p className="mt-1 text-xs text-muted-foreground">Jump from trend research to live product pages.</p>
                </Link>
                <Link href="/create" className="glass rounded-2xl p-4 transition-colors hover:border-purple-400/60">
                    <p className="text-sm font-semibold">Start creating now</p>
                    <p className="mt-1 text-xs text-muted-foreground">Generate your own design and apply it on products with AI.</p>
                </Link>
            </section>

            <div className="space-y-4">
                {posts.map((post) => (
                    <article key={post.slug} className="glass rounded-2xl p-6 space-y-3">
                        <p className="text-xs text-muted-foreground">
                            {new Date(post.publishedAt).toLocaleDateString('en-US')} - {post.readTimeMinutes} {copy.readTimeSuffix}
                        </p>
                        <h2 className="text-2xl font-semibold leading-tight">{post.title}</h2>
                        <p className="text-muted-foreground">{post.description}</p>
                        <Link href={`/blog/${post.slug}`} className="inline-flex text-purple-300 hover:text-purple-200">
                            {copy.readArticleLabel}
                        </Link>
                    </article>
                ))}
            </div>
        </div>
    )
}
