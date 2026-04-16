import { buildLocaleCanonical, type SupportedLocale } from './i18n'
import { toAbsoluteUrl } from './site'

type BreadcrumbKey = 'home' | 'create' | 'products' | 'blog' | 'support'

const BREADCRUMB_LABELS: Record<SupportedLocale, Record<BreadcrumbKey, string>> = {
    en: {
        home: 'Home',
        create: 'Create',
        products: 'Products',
        blog: 'Blog',
        support: 'Support',
    },
    fr: {
        home: 'Accueil',
        create: 'Creer',
        products: 'Produits',
        blog: 'Blog',
        support: 'Support',
    },
    de: {
        home: 'Startseite',
        create: 'Erstellen',
        products: 'Produkte',
        blog: 'Blog',
        support: 'Support',
    },
    es: {
        home: 'Inicio',
        create: 'Crear',
        products: 'Productos',
        blog: 'Blog',
        support: 'Soporte',
    },
}

export function getBreadcrumbLabel(locale: SupportedLocale, key: BreadcrumbKey): string {
    return BREADCRUMB_LABELS[locale]?.[key] || BREADCRUMB_LABELS.en[key]
}

export function buildBreadcrumbList(items: Array<{ name: string; path: string }>) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: toAbsoluteUrl(item.path),
        })),
    }
}

type ProductOfferSchemaInput = {
    path: string
    sellPrice: number
    currency?: string
}

export function buildProductOfferSchema(input: ProductOfferSchemaInput) {
    const currency = (input.currency || 'USD').toUpperCase()

    return {
        '@type': 'Offer',
        priceCurrency: currency,
        price: input.sellPrice.toFixed(2),
        availability: 'https://schema.org/InStock',
        url: toAbsoluteUrl(input.path),
        seller: {
            '@type': 'Organization',
            name: 'SmartPrintAI',
        },
        shippingDetails: {
            '@type': 'OfferShippingDetails',
            shippingRate: {
                '@type': 'MonetaryAmount',
                value: '5.99',
                currency,
            },
            shippingDestination: {
                '@type': 'DefinedRegion',
                addressCountry: 'US',
            },
            deliveryTime: {
                '@type': 'ShippingDeliveryTime',
                handlingTime: {
                    '@type': 'QuantitativeValue',
                    minValue: 1,
                    maxValue: 3,
                    unitCode: 'DAY',
                },
                transitTime: {
                    '@type': 'QuantitativeValue',
                    minValue: 2,
                    maxValue: 7,
                    unitCode: 'DAY',
                },
            },
        },
        hasMerchantReturnPolicy: {
            '@type': 'MerchantReturnPolicy',
            '@id': 'https://smartprintai.com/returns#policy',
            returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
            merchantReturnDays: 30,
            returnMethod: 'https://schema.org/ReturnByMail',
            returnFees: 'https://schema.org/FreeReturn',
            refundType: 'https://schema.org/FullRefund',
            applicableCountry: [
                'US','CA','GB','DE','FR','ES','IT','NL','BE','AT','CH','SE','DK','NO','FI',
                'IE','PT','PL','CZ','RO','HU','BG','HR','SK','SI','LT','LV','EE','MT','CY',
                'LU','GR','AU','NZ','JP','KR','SG','HK','TW','MY','TH','PH','ID','VN','IN',
                'AE','SA','QA','KW','BH','OM','IL','TR','ZA','NG','KE','GH','EG','MA','TN',
                'MX','BR','AR','CL','CO','PE','EC','UY','CR','PA','DO','GT','JM','TT','PR',
                'IS','RS','BA','MK','ME','AL','GE','AM','AZ','KZ','UZ','UA','MD','BY','RU',
                'PK','BD','LK','NP','MN','MU',
            ],
            url: toAbsoluteUrl('/returns'),
        },
    }
}

export function buildLocalizedSchemaUrl(locale: SupportedLocale, path: string): string {
    return toAbsoluteUrl(buildLocaleCanonical(locale, path))
}
