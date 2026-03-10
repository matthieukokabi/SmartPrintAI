import type { Metadata } from 'next'
import Link from 'next/link'
import { BLOG_POSTS } from '@/content/blogPosts'
import { toAbsoluteUrl } from '@/lib/site'

export const metadata: Metadata = {
    title: 'Blog',
    description: 'SmartPrintAI blog with practical guides on AI design prompts, print-on-demand strategy, and conversion-focused custom product ideas.',
    alternates: {
        canonical: '/blog',
    },
}

export default function BlogIndexPage() {
    const itemListSchema = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: BLOG_POSTS.map((post, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: toAbsoluteUrl(`/blog/${post.slug}`),
            name: post.title,
        })),
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />

            <header className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-bold">SmartPrintAI Blog</h1>
                <p className="text-muted-foreground">
                    Practical playbooks to create better AI designs, sell custom products, and grow your print-on-demand revenue.
                </p>
            </header>

            <div className="space-y-4">
                {BLOG_POSTS.map((post) => (
                    <article key={post.slug} className="glass rounded-2xl p-6 space-y-3">
                        <p className="text-xs text-muted-foreground">
                            {new Date(post.publishedAt).toLocaleDateString()} • {post.readTimeMinutes} min read
                        </p>
                        <h2 className="text-2xl font-semibold leading-tight">{post.title}</h2>
                        <p className="text-muted-foreground">{post.description}</p>
                        <Link href={`/blog/${post.slug}`} className="inline-flex text-purple-300 hover:text-purple-200">
                            Read article
                        </Link>
                    </article>
                ))}
            </div>
        </div>
    )
}
