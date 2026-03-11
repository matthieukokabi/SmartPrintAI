import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ProductCard from '@/components/shared/ProductCard'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import { toAbsoluteUrl } from '@/lib/site'
import { SUPPORTED_LOCALES, buildLocaleAlternates, getLocaleCopy, isSupportedLocale, type SupportedLocale } from '@/lib/i18n'

type LocaleProductsPageProps = {
    params: {
        locale: string
    }
}

export const dynamic = 'force-dynamic'
export const dynamicParams = false

export function generateStaticParams() {
    return SUPPORTED_LOCALES.map((locale) => ({ locale }))
}

export function generateMetadata({ params }: LocaleProductsPageProps): Metadata {
    if (!isSupportedLocale(params.locale)) {
        return {}
    }

    const locale = params.locale as SupportedLocale
    const copy = getLocaleCopy(locale).products

    return {
        title: copy.metadataTitle,
        description: copy.metadataDescription,
        alternates: {
            canonical: `/${locale}/products`,
            languages: buildLocaleAlternates('/products'),
        },
    }
}

export default async function LocalizedProductsPage({ params }: LocaleProductsPageProps) {
    if (!isSupportedLocale(params.locale)) {
        notFound()
    }

    const locale = params.locale as SupportedLocale
    const copy = getLocaleCopy(locale).products

    const products = await prisma.product.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
    })

    const itemListSchema = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: products.map((product, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: toAbsoluteUrl(`/${locale}/products/${product.id}`),
            name: product.name,
        })),
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
            />
            <div className="mb-5 flex justify-center">
                <LanguageSwitcher currentLocale={locale} pagePath="/products" />
            </div>
            <div className="text-center mb-12">
                <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                    {copy.titleLead} <span className="text-gradient">{copy.titleAccent}</span>
                </h1>
                <p className="text-muted-foreground">{copy.subtitle}</p>
            </div>

            {products.length === 0 ? (
                <div className="glass rounded-2xl p-10 text-center">
                    <p className="text-muted-foreground">{copy.emptyState}</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {products.map((product) => (
                        <ProductCard
                            key={product.id}
                            id={product.id}
                            name={product.name}
                            sellPrice={product.sellPrice}
                            category={product.category}
                            imageUrl={product.imageUrl}
                            href={`/${locale}/products/${product.id}`}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
