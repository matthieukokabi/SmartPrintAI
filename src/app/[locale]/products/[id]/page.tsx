import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { toAbsoluteUrl } from '@/lib/site'
import ProductDetailClient from '@/components/products/ProductDetailClient'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import TrustSignalStrip from '@/components/shared/TrustSignalStrip'
import { SUPPORTED_LOCALES, buildLocaleAlternates, buildLocaleCanonical, getLocaleCopy, isSupportedLocale, type SupportedLocale } from '@/lib/i18n'
import { buildLocalizedSocialMetadata } from '@/lib/metadata'
import { isMockupEligibleProduct } from '@/lib/mockup-eligibility'
import { isBlockedGootenReadyToBuyProduct } from '@/lib/gooten-ready-to-buy-safety'
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

type LocaleProductPageProps = {
    params: {
        locale: string
        id: string
    }
}

export const dynamic = 'force-dynamic'
export const dynamicParams = false

export function generateStaticParams() {
    return SUPPORTED_LOCALES.map((locale) => ({ locale }))
}

async function getProduct(id: string) {
    return prisma.product.findUnique({ where: { id } })
}

export async function generateMetadata({ params }: LocaleProductPageProps): Promise<Metadata> {
    if (!isSupportedLocale(params.locale)) {
        return {}
    }

    const locale = params.locale as SupportedLocale
    const detailCopy = getLocaleCopy(locale).productDetail
    const product = await getProduct(params.id)

    if (!product || isBlockedGootenReadyToBuyProduct(product)) {
        return {
            title: detailCopy.notFoundSeoTitle,
            description: detailCopy.notFoundDescription,
            robots: {
                index: false,
                follow: false,
            },
        }
    }

    const fallbackDescription = `Customize ${product.name} with your AI-generated design and order it online.`
    const description = normalizeProductDescription(product.description, fallbackDescription, 260)
    const imageUrl = toAbsoluteUrl(product.imageUrl || '/images/placeholder-product.png')
    const canonicalPath = buildLocaleCanonical(locale, `/products/${product.id}`)
    const socialTitle = `${product.name} | SmartPrintAI`

    return {
        title: product.name,
        description,
        alternates: {
            canonical: canonicalPath,
            languages: buildLocaleAlternates(`/products/${product.id}`),
        },
        ...buildLocalizedSocialMetadata({
            locale,
            path: canonicalPath,
            title: socialTitle,
            description,
            images: [imageUrl],
        }),
    }
}

export default async function LocalizedProductPage({ params }: LocaleProductPageProps) {
    if (!isSupportedLocale(params.locale)) {
        notFound()
    }

    const locale = params.locale as SupportedLocale
    const detailCopy = getLocaleCopy(locale).productDetail

    const product = await getProduct(params.id)
    if (!product || isBlockedGootenReadyToBuyProduct(product)) {
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
    const productPath = buildLocaleCanonical(locale, `/products/${product.id}`)
    const cartPath = buildLocaleCanonical(locale, '/cart')

    const productSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: normalizedDescription,
        category: product.category,
        image: [toAbsoluteUrl(product.imageUrl || '/images/placeholder-product.png')],
        brand: {
            '@type': 'Brand',
            name: 'SmartPrintAI',
        },
        offers: buildProductOfferSchema({
            path: productPath,
            sellPrice: product.sellPrice,
            currency: 'USD',
        }),
    }
    const productsPath = buildLocaleCanonical(locale, '/products')
    const homePath = buildLocaleCanonical(locale, '/')
    const breadcrumbSchema = buildBreadcrumbList([
        { name: getBreadcrumbLabel(locale, 'home'), path: homePath },
        { name: getBreadcrumbLabel(locale, 'products'), path: productsPath },
        { name: product.name, path: productPath },
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
                <LanguageSwitcher currentLocale={locale} pagePath={`/products/${product.id}`} />
            </div>
            <Link
                href={`/${locale}/products`}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
            >
                <ArrowLeft className="w-4 h-4" /> {detailCopy.backLabel}
            </Link>

            <TrustSignalStrip locale={locale} className="mb-8" />

            <ProductDetailClient
                product={productForClient}
                cartPath={cartPath}
                canDesignWithAI={canDesignWithAI}
                copy={{
                    availableSizesLabel: detailCopy.availableSizesLabel,
                    colorsLabel: detailCopy.colorsLabel,
                    designButtonLabel: detailCopy.designButtonLabel,
                    readyToBuyOnlyLabel: detailCopy.readyToBuyOnlyLabel,
                    readyToBuyAddToCartLabel: detailCopy.readyToBuyAddToCartLabel,
                    readyToBuyAddedToCartLabel: detailCopy.readyToBuyAddedToCartLabel,
                    readyToBuyGoToCartLabel: detailCopy.readyToBuyGoToCartLabel,
                }}
            />
        </div>
    )
}
