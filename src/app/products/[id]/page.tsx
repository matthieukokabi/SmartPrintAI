import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Shirt } from 'lucide-react'
import { toAbsoluteUrl } from '@/lib/site'

type ProductPageProps = {
    params: {
        id: string
    }
}

async function getProduct(id: string) {
    return prisma.product.findUnique({ where: { id } })
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
    const product = await getProduct(params.id)

    if (!product) {
        return {
            title: 'Product Not Found',
            robots: {
                index: false,
                follow: false,
            },
        }
    }

    const description = product.description || `Customize ${product.name} with your AI-generated design and order it online.`
    const imageUrl = toAbsoluteUrl(product.imageUrl || '/favicon.ico')

    return {
        title: product.name,
        description,
        alternates: {
            canonical: `/products/${product.id}`,
        },
        openGraph: {
            title: `${product.name} | SmartPrintAI`,
            description,
            type: 'website',
            url: `/products/${product.id}`,
            images: [{ url: imageUrl }],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${product.name} | SmartPrintAI`,
            description,
            images: [imageUrl],
        },
    }
}

export default async function ProductPage({ params }: ProductPageProps) {
    const product = await getProduct(params.id)
    if (!product) notFound()

    const colors = product.colors as Array<{ name: string; hex: string }>
    const productSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        category: product.category,
        image: [toAbsoluteUrl(product.imageUrl || '/favicon.ico')],
        brand: {
            '@type': 'Brand',
            name: 'SmartPrintAI',
        },
        offers: {
            '@type': 'Offer',
            priceCurrency: 'USD',
            price: product.sellPrice.toFixed(2),
            availability: 'https://schema.org/InStock',
            url: toAbsoluteUrl(`/products/${product.id}`),
        },
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
            />
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
                <ArrowLeft className="w-4 h-4" /> Back
            </Link>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="aspect-square rounded-2xl glass flex items-center justify-center">
                    <Shirt className="w-32 h-32 text-muted-foreground/30" />
                </div>

                <div>
                    <p className="text-xs text-purple-400 font-medium uppercase mb-2">{product.category}</p>
                    <h1 className="text-3xl font-bold mb-3">{product.name}</h1>
                    <p className="text-2xl text-gradient font-bold mb-4">${product.sellPrice.toFixed(2)}</p>
                    <p className="text-muted-foreground text-sm mb-6">{product.description}</p>

                    <div className="space-y-4 mb-8">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Available Sizes</label>
                            <div className="flex flex-wrap gap-2">
                                {product.sizes.map((size) => (
                                    <span key={size} className="px-3 py-1.5 rounded-lg glass text-sm">{size}</span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Colors</label>
                            <div className="flex flex-wrap gap-2">
                                {colors.map((color) => (
                                    <div key={color.name} className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass text-sm">
                                        <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: color.hex }} />
                                        {color.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <Link
                        href={`/create`}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity w-full justify-center"
                    >
                        Design This Product with AI
                    </Link>
                </div>
            </div>
        </div>
    )
}
