import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import ProductCard from '@/components/shared/ProductCard'
import { toAbsoluteUrl } from '@/lib/site'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import { DEFAULT_LOCALE, buildLocaleAlternates, getLocaleCopy } from '@/lib/i18n'
import { isMockupEligibleProduct } from '@/lib/mockup-eligibility'

export const dynamic = 'force-dynamic'

const copy = getLocaleCopy(DEFAULT_LOCALE).products

export const metadata: Metadata = {
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    alternates: {
        canonical: '/products',
        languages: buildLocaleAlternates('/products'),
    },
}

export default async function ProductsPage() {
    const products = await prisma.product.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
    })
    const customizableProducts = products.filter((product) =>
        isMockupEligibleProduct({ name: product.name, printfulId: product.printfulId })
    )
    const readyToBuyProducts = products.filter((product) =>
        !isMockupEligibleProduct({ name: product.name, printfulId: product.printfulId })
    )

    const itemListSchema = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: products.map((product, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: toAbsoluteUrl(`/products/${product.id}`),
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
                <LanguageSwitcher currentLocale={DEFAULT_LOCALE} pagePath="/products" />
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

                    {readyToBuyProducts.length > 0 && (
                        <section className="space-y-4">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-semibold">Ready-to-Buy</h2>
                                <p className="text-sm text-muted-foreground">
                                    These products are sold as standard catalog items (no AI design customization).
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
