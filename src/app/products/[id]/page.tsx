import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { toAbsoluteUrl } from '@/lib/site'
import ProductDetailClient from '@/components/products/ProductDetailClient'

type ProductColor = {
    name: string
    hex: string
    printfulVariantId: number
    previewImageUrl?: string | null
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function isProductColor(value: unknown): value is ProductColor {
    if (!isObject(value)) {
        return false
    }

    return (
        typeof value.name === 'string' &&
        value.name.trim().length > 0 &&
        typeof value.hex === 'string' &&
        value.hex.trim().length > 0 &&
        typeof value.printfulVariantId === 'number' &&
        Number.isFinite(value.printfulVariantId)
    )
}

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

    const colors = Array.isArray(product.colors)
        ? product.colors
            .filter(isProductColor)
            .map((color) => ({
                name: color.name.trim(),
                hex: color.hex.trim(),
                printfulVariantId: color.printfulVariantId,
                previewImageUrl:
                    typeof color.previewImageUrl === 'string' && color.previewImageUrl.trim().length > 0
                        ? color.previewImageUrl.trim()
                        : null,
            }))
        : []

    const productForClient = {
        id: product.id,
        name: product.name,
        description: product.description,
        category: product.category,
        sellPrice: product.sellPrice,
        sizes: product.sizes,
        imageUrl: product.imageUrl,
        colors,
    }

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

            <ProductDetailClient product={productForClient} />
        </div>
    )
}
