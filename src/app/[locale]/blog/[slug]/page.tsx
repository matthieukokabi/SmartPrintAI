import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import { BLOG_UI_COPY, getBlogSlugs, getLocalizedBlogPostBySlug, getRelatedLocalizedBlogPosts } from '@/content/blogPosts'
import { toAbsoluteUrl } from '@/lib/site'
import { SUPPORTED_LOCALES, buildLocaleAlternates, buildLocaleCanonical, isSupportedLocale, type SupportedLocale } from '@/lib/i18n'

type LocaleBlogPostPageProps = {
    params: {
        locale: string
        slug: string
    }
}

export const dynamicParams = false

export function generateStaticParams() {
    return SUPPORTED_LOCALES.flatMap((locale) => getBlogSlugs().map((slug) => ({ locale, slug })))
}

export async function generateMetadata({ params }: LocaleBlogPostPageProps): Promise<Metadata> {
    if (!isSupportedLocale(params.locale)) {
        return {}
    }

    const locale = params.locale as SupportedLocale
    const copy = BLOG_UI_COPY[locale]
    const post = getLocalizedBlogPostBySlug(params.slug, locale)

    if (!post) {
        return {
            title: copy.articleNotFoundTitle,
            robots: { index: false, follow: false },
        }
    }

    return {
        title: post.title,
        description: post.description,
        keywords: post.keywords.join(', '),
        alternates: {
            canonical: buildLocaleCanonical(locale, `/blog/${post.slug}`),
            languages: buildLocaleAlternates(`/blog/${post.slug}`),
        },
        openGraph: {
            title: post.title,
            description: post.description,
            type: 'article',
            url: `/${locale}/blog/${post.slug}`,
        },
        twitter: {
            card: 'summary_large_image',
            title: post.title,
            description: post.description,
        },
    }
}

export default function LocalizedBlogPostPage({ params }: LocaleBlogPostPageProps) {
    if (!isSupportedLocale(params.locale)) {
        notFound()
    }

    const locale = params.locale as SupportedLocale
    const copy = BLOG_UI_COPY[locale]
    const post = getLocalizedBlogPostBySlug(params.slug, locale)

    if (!post) {
        notFound()
    }
    const relatedPosts = getRelatedLocalizedBlogPosts(post.slug, locale, 3)

    const articleSchema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.description,
        datePublished: post.publishedAt,
        dateModified: post.publishedAt,
        author: {
            '@type': 'Organization',
            name: 'SmartPrintAI',
        },
        publisher: {
            '@type': 'Organization',
            name: 'SmartPrintAI',
        },
        mainEntityOfPage: toAbsoluteUrl(`/${locale}/blog/${post.slug}`),
        keywords: post.keywords,
    }

    const dateLocale = locale === 'de' ? 'de-DE' : locale === 'fr' ? 'fr-FR' : locale === 'es' ? 'es-ES' : 'en-US'

    return (
        <article className="max-w-3xl mx-auto px-4 py-12 space-y-8">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />

            <div className="space-y-3">
                <div className="mb-2 flex justify-center">
                    <LanguageSwitcher currentLocale={locale} pagePath={`/blog/${post.slug}`} />
                </div>
                <Link href={`/${locale}/blog`} className="inline-flex text-sm text-purple-300 hover:text-purple-200">
                    {'<- '} {copy.backToBlogLabel}
                </Link>
                <p className="text-xs text-muted-foreground">
                    {new Date(post.publishedAt).toLocaleDateString(dateLocale)} - {post.readTimeMinutes} {copy.readTimeSuffix}
                </p>
                <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{post.title}</h1>
                <p className="text-muted-foreground">{post.description}</p>
            </div>

            <div className="space-y-6">
                {post.sections.map((section) => (
                    <section key={section.heading} className="space-y-3">
                        <h2 className="text-2xl font-semibold">{section.heading}</h2>
                        {section.paragraphs.map((paragraph) => (
                            <p key={paragraph} className="text-muted-foreground leading-relaxed">
                                {paragraph}
                            </p>
                        ))}
                    </section>
                ))}
            </div>

            {relatedPosts.length > 0 && (
                <section className="glass rounded-2xl p-6 space-y-4">
                    <h2 className="text-xl font-semibold">{copy.relatedPostsHeading}</h2>
                    <div className="space-y-3">
                        {relatedPosts.map((relatedPost) => (
                            <Link
                                key={relatedPost.slug}
                                href={`/${locale}/blog/${relatedPost.slug}`}
                                className="block rounded-xl border border-white/10 p-4 transition-colors hover:border-purple-400/60"
                            >
                                <p className="font-medium text-foreground">{relatedPost.title}</p>
                                <p className="mt-2 text-sm text-muted-foreground">{relatedPost.description}</p>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            <section className="glass rounded-2xl p-6 space-y-4">
                <h2 className="text-xl font-semibold">{copy.nextStepsHeading}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Link
                        href={`/${locale}/create`}
                        className="rounded-xl border border-white/10 p-4 hover:border-purple-400/60 transition-colors"
                    >
                        <p className="font-medium text-foreground">{copy.nextStepsCreateLabel}</p>
                        <p className="text-sm text-muted-foreground mt-2">{copy.nextStepsCreateDescription}</p>
                    </Link>
                    <Link
                        href={`/${locale}/products`}
                        className="rounded-xl border border-white/10 p-4 hover:border-purple-400/60 transition-colors"
                    >
                        <p className="font-medium text-foreground">{copy.nextStepsProductsLabel}</p>
                        <p className="text-sm text-muted-foreground mt-2">{copy.nextStepsProductsDescription}</p>
                    </Link>
                </div>
            </section>
        </article>
    )
}
