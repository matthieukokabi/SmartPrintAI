import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { toAbsoluteUrl } from '@/lib/site'
import ProductDetailClient from '@/components/products/ProductDetailClient'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import { SUPPORTED_LOCALES, buildLocaleAlternates, getLocaleCopy, isSupportedLocale, type SupportedLocale } from '@/lib/i18n'
import { isMockupEligibleProduct } from '@/lib/mockup-eligibility'
import { normalizeProductDescription } from '@/lib/product-description'

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

const readyToBuyOnlyLabelByLocale: Record<SupportedLocale, string> = {
    en: 'This product is sold as-is and is not available in AI design mode.',
    fr: "Ce produit est vendu tel quel et n'est pas disponible en mode design IA.",
    de: 'Dieses Produkt wird unveraendert verkauft und ist nicht im KI-Design-Modus verfuegbar.',
    es: 'Este producto se vende tal cual y no esta disponible en modo de diseno con IA.',
}

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

    if (!product) {
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
    const imageUrl = toAbsoluteUrl(product.imageUrl || '/favicon.ico')

    return {
        title: product.name,
        description,
        alternates: {
            canonical: `/${locale}/products/${product.id}`,
            languages: buildLocaleAlternates(`/products/${product.id}`),
        },
        openGraph: {
            title: `${product.name} | SmartPrintAI`,
            description,
            type: 'website',
            url: `/${locale}/products/${product.id}`,
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

export default async function LocalizedProductPage({ params }: LocaleProductPageProps) {
    if (!isSupportedLocale(params.locale)) {
        notFound()
    }

    const locale = params.locale as SupportedLocale
    const detailCopy = getLocaleCopy(locale).productDetail

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
        : []

    const productForClient = {
        id: product.id,
        name: product.name,
        description: normalizedDescription,
        category: product.category,
        sellPrice: product.sellPrice,
        sizes: product.sizes,
        imageUrl: product.imageUrl,
        colors,
    }
    const canDesignWithAI = isMockupEligibleProduct({ name: product.name, printfulId: product.printfulId })

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
        offers: {
            '@type': 'Offer',
            priceCurrency: 'USD',
            price: product.sellPrice.toFixed(2),
            availability: 'https://schema.org/InStock',
            url: toAbsoluteUrl(`/${locale}/products/${product.id}`),
        },
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
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

            <ProductDetailClient
                product={productForClient}
                canDesignWithAI={canDesignWithAI}
                copy={{
                    availableSizesLabel: detailCopy.availableSizesLabel,
                    colorsLabel: detailCopy.colorsLabel,
                    designButtonLabel: detailCopy.designButtonLabel,
                    readyToBuyOnlyLabel: readyToBuyOnlyLabelByLocale[locale],
                }}
            />
        </div>
    )
}
