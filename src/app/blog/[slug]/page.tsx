import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BLOG_POSTS, getBlogPostBySlug } from '@/content/blogPosts'
import { toAbsoluteUrl } from '@/lib/site'

type BlogPostPageProps = {
    params: {
        slug: string
    }
}

export function generateStaticParams() {
    return BLOG_POSTS.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
    const post = getBlogPostBySlug(params.slug)
    if (!post) {
        return {
            title: 'Article Not Found',
            robots: { index: false, follow: false },
        }
    }

    return {
        title: post.title,
        description: post.description,
        keywords: post.keywords.join(', '),
        alternates: { canonical: `/blog/${post.slug}` },
        openGraph: {
            title: post.title,
            description: post.description,
            type: 'article',
            url: `/blog/${post.slug}`,
        },
        twitter: {
            card: 'summary_large_image',
            title: post.title,
            description: post.description,
        },
    }
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
    const post = getBlogPostBySlug(params.slug)
    if (!post) {
        notFound()
    }

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
        mainEntityOfPage: toAbsoluteUrl(`/blog/${post.slug}`),
        keywords: post.keywords,
    }

    return (
        <article className="max-w-3xl mx-auto px-4 py-12 space-y-8">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />

            <div className="space-y-3">
                <Link href="/blog" className="inline-flex text-sm text-purple-300 hover:text-purple-200">
                    ← Back to blog
                </Link>
                <p className="text-xs text-muted-foreground">
                    {new Date(post.publishedAt).toLocaleDateString()} • {post.readTimeMinutes} min read
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
        </article>
    )
}
