import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import ProductCard from '@/components/shared/ProductCard'
import TrustSignalStrip from '@/components/shared/TrustSignalStrip'
import { toAbsoluteUrl } from '@/lib/site'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import { DEFAULT_LOCALE, buildLocaleAlternates, getLocaleCopy } from '@/lib/i18n'
import { buildLocalizedSocialMetadata } from '@/lib/metadata'
import { isMockupEligibleProduct } from '@/lib/mockup-eligibility'
import { detectProductProvider } from '@/lib/product-provider'
import { splitBlockedGootenReadyToBuyProducts } from '@/lib/gooten-ready-to-buy-safety'
import { buildBreadcrumbList, getBreadcrumbLabel } from '@/lib/schema'
import CategoryFilter from '@/components/products/CategoryFilter'

export const dynamic = 'force-dynamic'

const copy = getLocaleCopy(DEFAULT_LOCALE).products

export const metadata: Metadata = {
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    alternates: {
        canonical: '/products',
        languages: buildLocaleAlternates('/products'),
    },
    ...buildLocalizedSocialMetadata({
        locale: DEFAULT_LOCALE,
        path: '/products',
        title: copy.metadataTitle,
        description: copy.metadataDescription,
    }),
}

export default async function ProductsPage(props: { searchParams: Promise<{ category?: string }> }) {
    const searchParams = await props.searchParams
    const selectedCategory = searchParams.category || null
    const allProducts = await prisma.product.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
    })
    const { sellable } = splitBlockedGootenReadyToBuyProducts(allProducts)
    const products = sellable.filter((product) => product.imageUrl.trim().length > 0)
    const filteredProducts = selectedCategory
        ? products.filter((p) => p.category === selectedCategory)
        : products

    const READY_TO_BUY_IDS = ['531', '638', '655', '770']

    const customizableProducts = filteredProducts.filter((product) => {
        if (READY_TO_BUY_IDS.includes(product.printfulId)) return false
        if (detectProductProvider(product.printfulId) === 'gooten') return false
        return isMockupEligibleProduct({ name: product.name, printfulId: product.printfulId, printArea: product.printArea })
    })
    const printableCatalogProducts = filteredProducts.filter((product) => {
        if (READY_TO_BUY_IDS.includes(product.printfulId)) return false
        const provider = detectProductProvider(product.printfulId)
        if (provider === 'gooten') return true
        return !isMockupEligibleProduct({ name: product.name, printfulId: product.printfulId, printArea: product.printArea })
    })
    const readyToBuyProducts = filteredProducts.filter((product) =>
        READY_TO_BUY_IDS.includes(product.printfulId)
    )

    const itemListSchema = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: filteredProducts.map((product, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: toAbsoluteUrl(`/products/${product.id}`),
            name: product.name,
        })),
    }
    const breadcrumbSchema = buildBreadcrumbList([
        { name: getBreadcrumbLabel(DEFAULT_LOCALE, 'home'), path: '/' },
        { name: getBreadcrumbLabel(DEFAULT_LOCALE, 'products'), path: '/products' },
    ])

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />
            <div className="mb-5 flex justify-center">
                <LanguageSwitcher currentLocale={DEFAULT_LOCALE} pagePath="/products" />
            </div>
            <div className="text-center mb-12">
                <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                    {copy.titleLead} <span className="text-gradient">{copy.titleAccent}</span>
                </h1>
                <p className="text-muted-foreground">{copy.subtitle}</p>
            </div>

            <TrustSignalStrip locale={DEFAULT_LOCALE} className="mb-8" />

            <CategoryFilter selected={selectedCategory} />

            <section className="mb-12 grid gap-3 sm:grid-cols-2">
                <Link href="/create" className="glass rounded-2xl p-4 transition-colors hover:border-purple-400/60">
                    <p className="text-sm font-semibold">Design your own product</p>
                    <p className="mt-1 text-xs text-muted-foreground">Use AI to generate art and preview it on products.</p>
                </Link>
                <Link href="/blog" className="glass rounded-2xl p-4 transition-colors hover:border-purple-400/60">
                    <p className="text-sm font-semibold">Read design guides</p>
                    <p className="mt-1 text-xs text-muted-foreground">Find ideas and trends, then jump back into product creation.</p>
                </Link>
            </section>

            {filteredProducts.length === 0 ? (
                <div className="glass rounded-2xl p-10 text-center">
                    <p className="text-muted-foreground">{copy.emptyState}</p>
                </div>
            ) : (
                <div className="space-y-12">
                    {customizableProducts.length > 0 && (
                        <section className="space-y-4">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-semibold">AI Customizable</h2>
                                <p className="text-sm text-muted-foreground">
                                    These products support AI design generation and live mockup previews.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {customizableProducts.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        id={product.id}
                                        name={product.name}
                                        sellPrice={product.sellPrice}
                                        category={product.category}
                                        imageUrl={product.imageUrl}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {printableCatalogProducts.length > 0 && (
                        <section className="space-y-4">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-semibold">Printable Catalog</h2>
                                <p className="text-sm text-muted-foreground">
                                    Order these products with your custom design. Color shown is a reference — your order will be fulfilled in the color you select.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {printableCatalogProducts.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        id={product.id}
                                        name={product.name}
                                        sellPrice={product.sellPrice}
                                        category={product.category}
                                        imageUrl={product.imageUrl}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {readyToBuyProducts.length > 0 && (
                        <section className="space-y-4">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-semibold">Ready-to-Buy</h2>
                                <p className="text-sm text-muted-foreground">
                                    Premium branded products, ready to ship as-is. No customization needed.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {readyToBuyProducts.map((product) => (
                                    <ProductCard
                                        key={product.id}
                                        id={product.id}
                                        name={product.name}
                                        sellPrice={product.sellPrice}
                                        category={product.category}
                                        imageUrl={product.imageUrl}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    )
}
