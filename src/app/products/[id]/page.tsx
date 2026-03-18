import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { toAbsoluteUrl } from '@/lib/site'
import ProductDetailClient from '@/components/products/ProductDetailClient'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import { DEFAULT_LOCALE, buildLocaleAlternates, getLocaleCopy } from '@/lib/i18n'
import { buildLocalizedSocialMetadata } from '@/lib/metadata'
import { isMockupEligibleProduct } from '@/lib/mockup-eligibility'
import { normalizeProductDescription } from '@/lib/product-description'
import { pickCoreColorSubset } from '@/lib/product-colors'
import { buildBreadcrumbList, buildProductOfferSchema, getBreadcrumbLabel } from '@/lib/schema'

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

const copy = getLocaleCopy(DEFAULT_LOCALE).productDetail

async function getProduct(id: string) {
    return prisma.product.findUnique({ where: { id } })
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
    const product = await getProduct(params.id)

    if (!product) {
        return {
            title: copy.notFoundSeoTitle,
            description: copy.notFoundDescription,
            robots: {
                index: false,
                follow: false,
            },
        }
    }

    const fallbackDescription = `Customize ${product.name} with your AI-generated design and order it online.`
    const description = normalizeProductDescription(product.description, fallbackDescription, 260)
    const imageUrl = toAbsoluteUrl(product.imageUrl || '/favicon.ico')
    const socialTitle = `${product.name} | SmartPrintAI`

    return {
        title: product.name,
        description,
        alternates: {
            canonical: `/products/${product.id}`,
            languages: buildLocaleAlternates(`/products/${product.id}`),
        },
        ...buildLocalizedSocialMetadata({
            locale: DEFAULT_LOCALE,
            path: `/products/${product.id}`,
            title: socialTitle,
            description,
            images: [imageUrl],
        }),
    }
}

export default async function ProductPage({ params }: ProductPageProps) {
    const product = await getProduct(params.id)
    if (!product) {
        notFound()
    }

    const fallbackDescription = `Customize ${product.name} with your AI-generated design and order it online.`
    const normalizedDescription = normalizeProductDescription(product.description, fallbackDescription)

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
            .slice(0, 80)
        : []
    const curatedColors = pickCoreColorSubset(colors, 4)

    const productForClient = {
        id: product.id,
        name: product.name,
        description: normalizedDescription,
        category: product.category,
        sellPrice: product.sellPrice,
        sizes: product.sizes,
        imageUrl: product.imageUrl,
        colors: curatedColors,
    }
    const canDesignWithAI = isMockupEligibleProduct({
        name: product.name,
        printfulId: product.printfulId,
        printArea: product.printArea,
    })

    const productSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: normalizedDescription,
        category: product.category,
        image: [toAbsoluteUrl(product.imageUrl || '/favicon.ico')],
        brand: {
            '@type': 'Brand',
            name: 'SmartPrintAI',
        },
        offers: buildProductOfferSchema({
            path: `/products/${product.id}`,
            sellPrice: product.sellPrice,
            currency: 'USD',
        }),
    }
    const breadcrumbSchema = buildBreadcrumbList([
        { name: getBreadcrumbLabel(DEFAULT_LOCALE, 'home'), path: '/' },
        { name: getBreadcrumbLabel(DEFAULT_LOCALE, 'products'), path: '/products' },
        { name: product.name, path: `/products/${product.id}` },
    ])

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />
            <div className="mb-5 flex justify-center">
                <LanguageSwitcher currentLocale={DEFAULT_LOCALE} pagePath={`/products/${product.id}`} />
            </div>
            <Link href="/products" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
                <ArrowLeft className="w-4 h-4" /> {copy.backLabel}
            </Link>

            <ProductDetailClient
                product={productForClient}
                canDesignWithAI={canDesignWithAI}
                copy={{
                    availableSizesLabel: copy.availableSizesLabel,
                    colorsLabel: copy.colorsLabel,
                    designButtonLabel: copy.designButtonLabel,
                    readyToBuyOnlyLabel: 'This product is sold as-is and is not available in AI design mode.',
                }}
            />
        </div>
    )
}
