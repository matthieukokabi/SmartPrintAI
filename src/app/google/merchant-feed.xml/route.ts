import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { splitBlockedGootenReadyToBuyProducts } from '@/lib/gooten-ready-to-buy-safety'
import { getShippingRatesForProduct, HANDLING_TIME_BUSINESS_DAYS } from '@/lib/shipping-rates'
import { toAbsoluteUrl } from '@/lib/site'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

type FeedProduct = {
    id: string
    name: string
    printfulId: string
    description: string
    category: string
    sellPrice: number
    imageUrl: string
    colors: unknown
    sizes: string[]
}

const FEED_TITLE = 'SmartPrintAI Product Feed'
const FEED_DESCRIPTION =
    'AI-generated print-on-demand products from SmartPrintAI for Google Merchant Center.'

// Storefront category (lower-cased) -> Google product taxonomy.
const CLOTHING = 'Apparel & Accessories > Clothing'
const CATEGORY_MAP: Record<string, string> = {
    'apparel': CLOTHING,
    'bottoms': CLOTHING,
    't-shirts & tops': CLOTHING,
    'sportswear': CLOTHING,
    'swimwear': CLOTHING,
    'dresses': CLOTHING,
    'hoodies & sweatshirts': CLOTHING,
    'kids': CLOTHING,
    'accessories': 'Apparel & Accessories > Clothing Accessories',
    'home': 'Home & Garden',
    'home & decor': 'Home & Garden > Decor',
    'drinkware': 'Home & Garden > Kitchen & Dining > Tableware > Drinkware',
}

// Categories whose items are clothing: these get size-level variants
// plus the apparel attributes Google asks for (color / size / gender /
// age_group). Everything else is a single item per product.
const APPAREL_CATEGORIES = new Set([
    'apparel',
    'bottoms',
    't-shirts & tops',
    'sportswear',
    'swimwear',
    'dresses',
    'hoodies & sweatshirts',
    'kids',
])

type ProductColor = {
    name: string
}

type Gender = 'male' | 'female' | 'unisex'
type AgeGroup = 'newborn' | 'infant' | 'toddler' | 'kids' | 'adult'

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

function normalizeCategory(category: string): string {
    return category.trim().toLowerCase()
}

function resolveCategory(category: string): string {
    return CATEGORY_MAP[normalizeCategory(category)] ?? 'Apparel & Accessories'
}

function isApparelCategory(category: string): boolean {
    return APPAREL_CATEGORIES.has(normalizeCategory(category))
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function parseColors(value: unknown): ProductColor[] {
    if (!Array.isArray(value)) {
        return []
    }

    return value
        .filter((item): item is ProductColor => isObject(item) && typeof item.name === 'string')
        .map((item) => ({ name: item.name.trim() }))
        .filter((item) => item.name.length > 0)
}

/**
 * Real colour names only. Provider syncs store a placeholder
 * "Default" colour for single-colour / all-over-print items; that is
 * not a colour, so the attribute is omitted rather than invented.
 * Google accepts up to 3 colours separated by "/", primary first.
 */
function resolveColorAttribute(colors: unknown): string | null {
    const names: string[] = []
    for (const item of parseColors(colors)) {
        if (item.name.toLowerCase() === 'default') continue
        if (names.some((n) => n.toLowerCase() === item.name.toLowerCase())) continue
        names.push(item.name)
        if (names.length === 3) break
    }
    return names.length > 0 ? names.join('/') : null
}

function resolveSizes(sizes: string[]): string[] {
    if (!Array.isArray(sizes)) {
        return []
    }
    const seen = new Set<string>()
    const out: string[] = []
    for (const raw of sizes) {
        if (typeof raw !== 'string') continue
        const size = raw.trim()
        if (!size || seen.has(size.toLowerCase())) continue
        seen.add(size.toLowerCase())
        out.push(size)
    }
    return out
}

/**
 * Gender is only emitted when the product name states it
 * ("Unisex …", "Men's …", "Women's …"). Nothing is inferred from
 * category (a "Dresses" item without a stated gender gets no tag).
 */
function resolveGender(name: string): Gender | null {
    const n = name.toLowerCase()
    if (/\bunisex\b/.test(n)) return 'unisex'
    if (/\b(women'?s?|ladies)\b/.test(n)) return 'female'
    if (/\bmen'?s?\b/.test(n)) return 'male'
    return null
}

/**
 * Age group comes from explicit wording in the name or category
 * (Kids / Youth / Toddler / Baby / Infant / Newborn). Products whose
 * name states an adult gender line (Unisex / Men's / Women's) are
 * adult lines by provider naming convention. Anything else is left
 * untagged rather than guessed.
 */
function resolveAgeGroup(name: string, category: string, gender: Gender | null): AgeGroup | null {
    const n = `${name} ${category}`.toLowerCase()
    if (/\bnewborn\b/.test(n)) return 'newborn'
    if (/\b(infant|baby)\b/.test(n)) return 'infant'
    if (/\btoddler\b/.test(n)) return 'toddler'
    if (/\b(kids?|youth|children)\b/.test(n)) return 'kids'
    if (gender) return 'adult'
    return null
}

function sizeSlug(size: string): string {
    const slug = size
        .toLowerCase()
        .replace(/″/g, 'in')
        .replace(/×/g, 'x')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    return slug || 'size'
}

function shippingXml(product: FeedProduct): string[] {
    // One <g:shipping> per (country, service) the checkout really
    // offers for this product. Free-over-$100 Standard is configured
    // in MC's shipping-services UI (the feed cannot express tiers), and
    // feed price >= checkout price always holds.
    return getShippingRatesForProduct(product).map((rate) => (
        '<g:shipping>' +
        `<g:country>${escapeXml(rate.country)}</g:country>` +
        `<g:service>${escapeXml(rate.service)}</g:service>` +
        `<g:price>${rate.priceUsd.toFixed(2)} USD</g:price>` +
        `<g:min_transit_time>${rate.minTransitDays}</g:min_transit_time>` +
        `<g:max_transit_time>${rate.maxTransitDays}</g:max_transit_time>` +
        '</g:shipping>'
    ))
}

type ItemVariant = {
    id: string
    title: string
    itemGroupId?: string
    size?: string
}

function itemXml(product: FeedProduct, variant: ItemVariant, apparel: boolean): string {
    const productUrl = toAbsoluteUrl(`/products/${product.id}`)
    const description =
        product.description?.trim() ||
        `Customize ${product.name} with AI-generated artwork and order it on SmartPrintAI.`

    const googleCategory = resolveCategory(product.category)
    const color = resolveColorAttribute(product.colors)
    const gender = apparel ? resolveGender(product.name) : null
    const ageGroup = apparel ? resolveAgeGroup(product.name, product.category, gender) : null

    return [
        '<item>',
        `<g:id>${escapeXml(variant.id)}</g:id>`,
        ...(variant.itemGroupId ? [`<g:item_group_id>${escapeXml(variant.itemGroupId)}</g:item_group_id>`] : []),
        `<title>${escapeXml(variant.title)}</title>`,
        `<description>${escapeXml(description)}</description>`,
        `<link>${escapeXml(productUrl)}</link>`,
        `<g:image_link>${escapeXml(toAbsoluteUrl(product.imageUrl))}</g:image_link>`,
        '<g:availability>in stock</g:availability>',
        `<g:price>${product.sellPrice.toFixed(2)} USD</g:price>`,
        '<g:condition>new</g:condition>',
        '<g:brand>SmartPrintAI</g:brand>',
        `<g:google_product_category>${escapeXml(googleCategory)}</g:google_product_category>`,
        `<g:product_type>${escapeXml(product.category)}</g:product_type>`,
        ...(color ? [`<g:color>${escapeXml(color)}</g:color>`] : []),
        ...(variant.size ? [`<g:size>${escapeXml(variant.size)}</g:size>`] : []),
        ...(gender ? [`<g:gender>${gender}</g:gender>`] : []),
        ...(ageGroup ? [`<g:age_group>${ageGroup}</g:age_group>`] : []),
        '<g:identifier_exists>false</g:identifier_exists>',
        `<g:min_handling_time>${HANDLING_TIME_BUSINESS_DAYS.min}</g:min_handling_time>`,
        `<g:max_handling_time>${HANDLING_TIME_BUSINESS_DAYS.max}</g:max_handling_time>`,
        ...shippingXml(product),
        '</item>',
    ].join('')
}

/**
 * Apparel: one item per size, grouped by item_group_id = product id
 * (Google requires size variants as separate items). Apparel without
 * size data, and every non-apparel product, stays a single item with
 * the plain product id.
 */
function productToItemsXml(product: FeedProduct): string[] {
    const apparel = isApparelCategory(product.category)
    const sizes = apparel ? resolveSizes(product.sizes) : []

    if (sizes.length === 0) {
        return [itemXml(product, { id: product.id, title: product.name }, apparel)]
    }

    return sizes.map((size) =>
        itemXml(
            product,
            {
                id: `${product.id}-${sizeSlug(size)}`,
                itemGroupId: product.id,
                title: `${product.name} - ${size}`,
                size,
            },
            apparel
        )
    )
}

function buildFeedXml(products: FeedProduct[]): string {
    const channelLink = toAbsoluteUrl('/')
    const itemsXml = products.flatMap(productToItemsXml).join('')

    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
        '<channel>',
        `<title>${escapeXml(FEED_TITLE)}</title>`,
        `<link>${escapeXml(channelLink)}</link>`,
        `<description>${escapeXml(FEED_DESCRIPTION)}</description>`,
        itemsXml,
        '</channel>',
        '</rss>',
    ].join('')
}

export async function GET() {
    try {
        const products = await prisma.product.findMany({
            where: { active: true, imageUrl: { not: '' } },
            select: {
                id: true,
                name: true,
                printfulId: true,
                printArea: true,
                description: true,
                category: true,
                sellPrice: true,
                imageUrl: true,
                colors: true,
                sizes: true,
            },
            orderBy: { name: 'asc' },
        })

        // Apply the same Gooten ready-to-buy safety filter that /products
        // uses, so MC's view of the catalog matches what customers see on
        // the storefront. Otherwise blocked Gooten products land in the
        // feed but 404 in the customer flow, which MC treats as an error.
        const { sellable } = splitBlockedGootenReadyToBuyProducts(products)
        const feedProducts = sellable.filter((p) => p.imageUrl && p.imageUrl.trim().length > 0)
        const xml = buildFeedXml(feedProducts)
        return new NextResponse(xml, {
            status: 200,
            headers: {
                'content-type': 'application/xml; charset=utf-8',
                'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            },
        })
    } catch {
        return NextResponse.json(
            { error: 'Failed to build merchant feed' },
            { status: 500 }
        )
    }
}
