import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { toAbsoluteUrl } from '@/lib/site'
import ProductDetailClient from '@/components/products/ProductDetailClient'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import TrustSignalStrip from '@/components/shared/TrustSignalStrip'
import { DEFAULT_LOCALE, buildLocaleAlternates, getLocaleCopy } from '@/lib/i18n'
import { buildLocalizedSocialMetadata } from '@/lib/metadata'
import { isMockupEligibleProduct } from '@/lib/mockup-eligibility'
import { detectProductProvider } from '@/lib/product-provider'
import { isBlockedGootenReadyToBuyProduct } from '@/lib/gooten-ready-to-buy-safety'
import { normalizeProductDescription } from '@/lib/product-description'
import { pickCoreColorSubset } from '@/lib/product-colors'
import { buildBreadcrumbList, buildProductOfferSchema, getBreadcrumbLabel } from '@/lib/schema'
import { localized } from '@/lib/localized-product'

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

    if (!product || isBlockedGootenReadyToBuyProduct(product)) {
        return {
            title: copy.notFoundSeoTitle,
            description: copy.notFoundDescription,
            robots: {
                index: false,
                follow: false,
            },
        }
    }

    const localizedName = localized(product, DEFAULT_LOCALE, 'name')
    const localizedDescriptionRaw = localized(product, DEFAULT_LOCALE, 'description')
    const fallbackDescription = `Customize ${localizedName} with your AI-generated design and order it online.`
    const description = normalizeProductDescription(localizedDescriptionRaw, fallbackDescription, 260)
    const imageUrl = toAbsoluteUrl(product.imageUrl || '/images/placeholder-product.png')
    const socialTitle = `${localizedName} | SmartPrintAI`

    return {
        title: localizedName,
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
    if (!product || isBlockedGootenReadyToBuyProduct(product)) {
        notFound()
    }

    const localizedName = localized(product, DEFAULT_LOCALE, 'name')
    const localizedDescriptionRaw = localized(product, DEFAULT_LOCALE, 'description')
    const fallbackDescription = `Customize ${localizedName} with your AI-generated design and order it online.`
    const normalizedDescription = normalizeProductDescription(localizedDescriptionRaw, fallbackDescription)

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
        name: localizedName,
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
        name: localizedName,
        description: normalizedDescription,
        category: product.category,
        image: [toAbsoluteUrl(product.imageUrl || '/images/placeholder-product.png')],
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
        { name: localizedName, path: `/products/${product.id}` },
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

            <TrustSignalStrip locale={DEFAULT_LOCALE} className="mb-8" />

            <ProductDetailClient
                product={productForClient}
                cartPath="/cart"
                canDesignWithAI={canDesignWithAI}
                isGootenProduct={detectProductProvider(product.printfulId) === 'gooten'}
                copy={{
                    availableSizesLabel: copy.availableSizesLabel,
                    colorsLabel: copy.colorsLabel,
                    designButtonLabel: copy.designButtonLabel,
                    readyToBuyOnlyLabel: copy.readyToBuyOnlyLabel,
                    readyToBuyAddToCartLabel: copy.readyToBuyAddToCartLabel,
                    readyToBuyAddedToCartLabel: copy.readyToBuyAddedToCartLabel,
                    readyToBuyGoToCartLabel: copy.readyToBuyGoToCartLabel,
                }}
            />
        </div>
    )
}
