import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import { BLOG_UI_COPY, getLocalizedBlogPosts } from '@/content/blogPosts'
import { toAbsoluteUrl } from '@/lib/site'
import { SUPPORTED_LOCALES, buildLocaleAlternates, isSupportedLocale, type SupportedLocale } from '@/lib/i18n'

type LocaleBlogPageProps = {
    params: {
        locale: string
    }
}

export const dynamicParams = false

export function generateStaticParams() {
    return SUPPORTED_LOCALES.map((locale) => ({ locale }))
}

export function generateMetadata({ params }: LocaleBlogPageProps): Metadata {
    if (!isSupportedLocale(params.locale)) {
        return {}
    }

    const locale = params.locale as SupportedLocale
    const copy = BLOG_UI_COPY[locale]

    return {
        title: copy.metadataTitle,
        description: copy.metadataDescription,
        alternates: {
            canonical: `/${locale}/blog`,
            languages: buildLocaleAlternates('/blog'),
        },
    }
}

export default function LocalizedBlogIndexPage({ params }: LocaleBlogPageProps) {
    if (!isSupportedLocale(params.locale)) {
        notFound()
    }

    const locale = params.locale as SupportedLocale
    const copy = BLOG_UI_COPY[locale]
    const posts = getLocalizedBlogPosts(locale)

    const itemListSchema = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: posts.map((post, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: toAbsoluteUrl(`/${locale}/blog/${post.slug}`),
            name: post.title,
        })),
    }

    const dateLocale = locale === 'de' ? 'de-DE' : locale === 'fr' ? 'fr-FR' : locale === 'es' ? 'es-ES' : 'en-US'

    return (
        <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />

            <div className="mb-2 flex justify-center">
                <LanguageSwitcher currentLocale={locale} pagePath="/blog" />
            </div>

            <header className="space-y-3 text-center sm:text-left">
                <h1 className="text-3xl sm:text-4xl font-bold">{copy.heading}</h1>
                <p className="text-muted-foreground">{copy.subtitle}</p>
            </header>

            <div className="space-y-4">
                {posts.map((post) => (
                    <article key={post.slug} className="glass rounded-2xl p-6 space-y-3">
                        <p className="text-xs text-muted-foreground">
                            {new Date(post.publishedAt).toLocaleDateString(dateLocale)} - {post.readTimeMinutes} {copy.readTimeSuffix}
                        </p>
                        <h2 className="text-2xl font-semibold leading-tight">{post.title}</h2>
                        <p className="text-muted-foreground">{post.description}</p>
                        <Link href={`/${locale}/blog/${post.slug}`} className="inline-flex text-purple-300 hover:text-purple-200">
                            {copy.readArticleLabel}
                        </Link>
                    </article>
                ))}
            </div>
        </div>
    )
}
