import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import ProductCard from '@/components/shared/ProductCard'
import { toAbsoluteUrl } from '@/lib/site'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'All Products',
    description: 'Browse SmartPrintAI catalog products and start designing custom print-on-demand items with AI.',
    alternates: {
        canonical: '/products',
    },
}

export default async function ProductsPage() {
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
            <div className="text-center mb-12">
                <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                    All <span className="text-gradient">Products</span>
                </h1>
                <p className="text-muted-foreground">Choose a product and start designing with AI</p>
            </div>

            {products.length === 0 ? (
                <div className="glass rounded-2xl p-10 text-center">
                    <p className="text-muted-foreground">No active products available yet.</p>
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
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
