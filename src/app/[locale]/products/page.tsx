import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ProductCard from '@/components/shared/ProductCard'
import TrustSignalStrip from '@/components/shared/TrustSignalStrip'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import { SUPPORTED_LOCALES, buildLocaleAlternates, buildLocaleCanonical, getLocaleCopy, isSupportedLocale, type SupportedLocale } from '@/lib/i18n'
import { buildLocalizedSocialMetadata } from '@/lib/metadata'
import { isMockupEligibleProduct } from '@/lib/mockup-eligibility'
import { isGelatoProduct } from '@/lib/product-provider'
import { buildBreadcrumbList, buildLocalizedSchemaUrl, getBreadcrumbLabel } from '@/lib/schema'

type LocaleProductsPageProps = {
    params: {
        locale: string
    }
}

export const dynamic = 'force-dynamic'
export const dynamicParams = false

const sectionCopyByLocale: Record<
    SupportedLocale,
    {
        customizableTitle: string
        customizableSubtitle: string
        printableTitle: string
        printableSubtitle: string
        readyTitle: string
        readySubtitle: string
    }
> = {
    en: {
        customizableTitle: 'AI Customizable',
        customizableSubtitle: 'These products support AI design generation and live mockup previews.',
        printableTitle: 'Printable Catalog',
        printableSubtitle: 'These products are printable on demand via Gelato and are currently sold as catalog items.',
        readyTitle: 'Ready-to-Buy',
        readySubtitle: 'These products are sold as standard catalog items without AI customization.',
    },
    fr: {
        customizableTitle: 'Personnalisables avec IA',
        customizableSubtitle: 'Ces produits prennent en charge la generation IA et les apercus mockup en direct.',
        printableTitle: 'Catalogue imprimable',
        printableSubtitle: 'Ces produits sont imprimables a la demande via Gelato et vendus en mode catalogue.',
        readyTitle: 'Pret-a-acheter',
        readySubtitle: 'Ces produits sont vendus en mode catalogue standard sans personnalisation IA.',
    },
    de: {
        customizableTitle: 'Mit KI personalisierbar',
        customizableSubtitle: 'Diese Produkte unterstuetzen KI-Design und Live-Mockup-Vorschau.',
        printableTitle: 'Druckbarer Katalog',
        printableSubtitle: 'Diese Produkte sind via Gelato on-demand druckbar und werden derzeit als Katalogartikel verkauft.',
        readyTitle: 'Sofort kaufbar',
        readySubtitle: 'Diese Produkte werden als Standard-Katalogartikel ohne KI-Anpassung verkauft.',
    },
    es: {
        customizableTitle: 'Personalizable con IA',
        customizableSubtitle: 'Estos productos admiten generacion con IA y vista previa de mockup en vivo.',
        printableTitle: 'Catalogo imprimible',
        printableSubtitle: 'Estos productos son imprimibles bajo demanda con Gelato y se venden como articulos de catalogo.',
        readyTitle: 'Listo para comprar',
        readySubtitle: 'Estos productos se venden como catalogo estandar sin personalizacion con IA.',
    },
}

const discoveryCopyByLocale: Record<
    SupportedLocale,
    {
        createTitle: string
        createDescription: string
        blogTitle: string
        blogDescription: string
    }
> = {
    en: {
        createTitle: 'Design your own product',
        createDescription: 'Use AI to generate art and preview it on products.',
        blogTitle: 'Read design guides',
        blogDescription: 'Find ideas and trends, then jump back into product creation.',
    },
    fr: {
        createTitle: 'Creez votre produit',
        createDescription: "Utilisez l'IA pour generer une creation et la previsualiser sur vos produits.",
        blogTitle: 'Lire les guides',
        blogDescription: 'Trouvez des idees et tendances, puis revenez a la creation de produit.',
    },
    de: {
        createTitle: 'Eigenes Produkt gestalten',
        createDescription: 'Mit KI Designs erstellen und direkt auf Produkten ansehen.',
        blogTitle: 'Design-Ratgeber lesen',
        blogDescription: 'Ideen und Trends finden und danach direkt mit der Produkterstellung starten.',
    },
    es: {
        createTitle: 'Disena tu propio producto',
        createDescription: 'Usa IA para generar arte y previsualizarlo en productos.',
        blogTitle: 'Leer guias de diseno',
        blogDescription: 'Descubre ideas y tendencias y vuelve a crear productos.',
    },
}

export function generateStaticParams() {
    return SUPPORTED_LOCALES.map((locale) => ({ locale }))
}

export function generateMetadata({ params }: LocaleProductsPageProps): Metadata {
    if (!isSupportedLocale(params.locale)) {
        return {}
    }

    const locale = params.locale as SupportedLocale
    const copy = getLocaleCopy(locale).products
    const canonicalPath = buildLocaleCanonical(locale, '/products')

    return {
        title: copy.metadataTitle,
        description: copy.metadataDescription,
        alternates: {
            canonical: canonicalPath,
            languages: buildLocaleAlternates('/products'),
        },
        ...buildLocalizedSocialMetadata({
            locale,
            path: canonicalPath,
            title: copy.metadataTitle,
            description: copy.metadataDescription,
        }),
    }
}

export default async function LocalizedProductsPage({ params }: LocaleProductsPageProps) {
    if (!isSupportedLocale(params.locale)) {
        notFound()
    }

    const locale = params.locale as SupportedLocale
    const copy = getLocaleCopy(locale).products
    const sectionCopy = sectionCopyByLocale[locale]
    const discoveryCopy = discoveryCopyByLocale[locale]

    const allProducts = await prisma.product.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
    })
    const products = allProducts.filter((product) => product.imageUrl.trim().length > 0)
    const customizableProducts = products.filter((product) =>
        isMockupEligibleProduct({ name: product.name, printfulId: product.printfulId, printArea: product.printArea })
    )
    const printableCatalogProducts = products.filter((product) =>
        !isMockupEligibleProduct({ name: product.name, printfulId: product.printfulId, printArea: product.printArea }) &&
        isGelatoProduct(product.printfulId)
    )
    const readyToBuyProducts = products.filter((product) =>
        !isMockupEligibleProduct({ name: product.name, printfulId: product.printfulId, printArea: product.printArea }) &&
        !isGelatoProduct(product.printfulId)
    )

    const itemListSchema = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: products.map((product, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: buildLocalizedSchemaUrl(locale, `/products/${product.id}`),
            name: product.name,
        })),
    }
    const productsPath = buildLocaleCanonical(locale, '/products')
    const homePath = buildLocaleCanonical(locale, '/')
    const breadcrumbSchema = buildBreadcrumbList([
        { name: getBreadcrumbLabel(locale, 'home'), path: homePath },
        { name: getBreadcrumbLabel(locale, 'products'), path: productsPath },
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
                <LanguageSwitcher currentLocale={locale} pagePath="/products" />
            </div>
            <div className="text-center mb-12">
                <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                    {copy.titleLead} <span className="text-gradient">{copy.titleAccent}</span>
                </h1>
                <p className="text-muted-foreground">{copy.subtitle}</p>
            </div>

            <TrustSignalStrip locale={locale} className="mb-8" />

            <section className="mb-12 grid gap-3 sm:grid-cols-2">
                <Link
                    href={`/${locale}/create`}
                    className="glass rounded-2xl p-4 transition-colors hover:border-purple-400/60"
                >
                    <p className="text-sm font-semibold">{discoveryCopy.createTitle}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{discoveryCopy.createDescription}</p>
                </Link>
                <Link
                    href={`/${locale}/blog`}
                    className="glass rounded-2xl p-4 transition-colors hover:border-purple-400/60"
                >
                    <p className="text-sm font-semibold">{discoveryCopy.blogTitle}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{discoveryCopy.blogDescription}</p>
                </Link>
            </section>

            {products.length === 0 ? (
                <div className="glass rounded-2xl p-10 text-center">
                    <p className="text-muted-foreground">{copy.emptyState}</p>
                </div>
            ) : (
                <div className="space-y-12">
                    {customizableProducts.length > 0 && (
                        <section className="space-y-4">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-semibold">{sectionCopy.customizableTitle}</h2>
                                <p className="text-sm text-muted-foreground">{sectionCopy.customizableSubtitle}</p>
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
                                        href={`/${locale}/products/${product.id}`}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {printableCatalogProducts.length > 0 && (
                        <section className="space-y-4">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-semibold">{sectionCopy.printableTitle}</h2>
                                <p className="text-sm text-muted-foreground">{sectionCopy.printableSubtitle}</p>
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
                                        href={`/${locale}/products/${product.id}`}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {readyToBuyProducts.length > 0 && (
                        <section className="space-y-4">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-semibold">{sectionCopy.readyTitle}</h2>
                                <p className="text-sm text-muted-foreground">{sectionCopy.readySubtitle}</p>
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
                                        href={`/${locale}/products/${product.id}`}
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
