import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import { BLOG_UI_COPY, getLocalizedBlogPosts } from '@/content/blogPosts'
import { toAbsoluteUrl } from '@/lib/site'
import { SUPPORTED_LOCALES, buildLocaleAlternates, buildLocaleCanonical, isSupportedLocale, type SupportedLocale } from '@/lib/i18n'
import { buildLocalizedSocialMetadata } from '@/lib/metadata'
import { buildBreadcrumbList, getBreadcrumbLabel } from '@/lib/schema'

type LocaleBlogPageProps = {
    params: {
        locale: string
    }
}

export const dynamicParams = false

const discoveryCopyByLocale: Record<
    SupportedLocale,
    {
        productsTitle: string
        productsDescription: string
        createTitle: string
        createDescription: string
    }
> = {
    en: {
        productsTitle: 'Browse all products',
        productsDescription: 'Jump from trend research to live product pages.',
        createTitle: 'Start creating now',
        createDescription: 'Generate your own design and apply it on products with AI.',
    },
    fr: {
        productsTitle: 'Voir tous les produits',
        productsDescription: 'Passez de la recherche de tendances aux pages produits.',
        createTitle: 'Commencer a creer',
        createDescription: "Generez votre design et appliquez-le aux produits avec l'IA.",
    },
    de: {
        productsTitle: 'Alle Produkte ansehen',
        productsDescription: 'Von Trend-Recherche direkt zu den Produktseiten wechseln.',
        createTitle: 'Jetzt erstellen',
        createDescription: 'Eigenes Design mit KI erzeugen und auf Produkte anwenden.',
    },
    es: {
        productsTitle: 'Ver todos los productos',
        productsDescription: 'Pasa de investigar tendencias a paginas de producto.',
        createTitle: 'Empieza a crear',
        createDescription: 'Genera tu propio diseno con IA y aplicalo en productos.',
    },
}

export function generateStaticParams() {
    return SUPPORTED_LOCALES.map((locale) => ({ locale }))
}

export function generateMetadata({ params }: LocaleBlogPageProps): Metadata {
    if (!isSupportedLocale(params.locale)) {
        return {}
    }

    const locale = params.locale as SupportedLocale
    const copy = BLOG_UI_COPY[locale]
    const canonicalPath = buildLocaleCanonical(locale, '/blog')

    return {
        title: copy.metadataTitle,
        description: copy.metadataDescription,
        alternates: {
            canonical: canonicalPath,
            languages: buildLocaleAlternates('/blog'),
        },
        ...buildLocalizedSocialMetadata({
            locale,
            path: canonicalPath,
            title: copy.metadataTitle,
            description: copy.metadataDescription,
        }),
    }
}

export default function LocalizedBlogIndexPage({ params }: LocaleBlogPageProps) {
    if (!isSupportedLocale(params.locale)) {
        notFound()
    }

    const locale = params.locale as SupportedLocale
    const copy = BLOG_UI_COPY[locale]
    const discoveryCopy = discoveryCopyByLocale[locale]
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
    const blogPath = buildLocaleCanonical(locale, '/blog')
    const homePath = buildLocaleCanonical(locale, '/')
    const breadcrumbSchema = buildBreadcrumbList([
        { name: getBreadcrumbLabel(locale, 'home'), path: homePath },
        { name: getBreadcrumbLabel(locale, 'blog'), path: blogPath },
    ])

    const dateLocale = locale === 'de' ? 'de-DE' : locale === 'fr' ? 'fr-FR' : locale === 'es' ? 'es-ES' : 'en-US'

    return (
        <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

            <div className="mb-2 flex justify-center">
                <LanguageSwitcher currentLocale={locale} pagePath="/blog" />
            </div>

            <header className="space-y-3 text-center sm:text-left">
                <h1 className="text-3xl sm:text-4xl font-bold">{copy.heading}</h1>
                <p className="text-muted-foreground">{copy.subtitle}</p>
            </header>

            <section className="grid gap-3 sm:grid-cols-2">
                <Link
                    href={`/${locale}/products`}
                    className="glass rounded-2xl p-4 transition-colors hover:border-purple-400/60"
                >
                    <p className="text-sm font-semibold">{discoveryCopy.productsTitle}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{discoveryCopy.productsDescription}</p>
                </Link>
                <Link
                    href={`/${locale}/create`}
                    className="glass rounded-2xl p-4 transition-colors hover:border-purple-400/60"
                >
                    <p className="text-sm font-semibold">{discoveryCopy.createTitle}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{discoveryCopy.createDescription}</p>
                </Link>
            </section>

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
