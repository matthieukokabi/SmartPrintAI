import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { toAbsoluteUrl } from '@/lib/site'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

type FeedProduct = {
    id: string
    name: string
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

const CATEGORY_MAP: Record<string, string> = {
    apparel: 'Apparel & Accessories > Clothing',
    accessories: 'Apparel & Accessories > Clothing Accessories',
    home: 'Home & Garden',
    drinkware: 'Home & Garden > Kitchen & Dining > Tableware > Drinkware',
}

type ProductColor = {
    name: string
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

function resolveCategory(category: string): string {
    const normalized = category.trim().toLowerCase()
    return CATEGORY_MAP[normalized] ?? 'Apparel & Accessories'
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

function resolvePrimaryColor(colors: unknown): string {
    const parsed = parseColors(colors)
    const meaningful = parsed.find((item) => item.name.toLowerCase() !== 'default')
    if (meaningful) {
        return meaningful.name
    }
    if (parsed.length > 0) {
        const first = parsed[0].name.toLowerCase()
        return first === 'default' ? 'White' : parsed[0].name
    }
    return 'White'
}

function resolvePrimarySize(sizes: string[]): string | null {
    if (!Array.isArray(sizes) || sizes.length === 0) {
        return null
    }
    const first = sizes.find((size) => typeof size === 'string' && size.trim().length > 0)
    return first ? first.trim() : null
}

function productToItemXml(product: FeedProduct): string {
    const productUrl = toAbsoluteUrl(`/products/${product.id}`)
    const imageUrl = product.imageUrl
    const description =
        product.description?.trim() ||
        `Customize ${product.name} with AI-generated artwork and order it on SmartPrintAI.`

    const googleCategory = resolveCategory(product.category)
    const color = resolvePrimaryColor(product.colors)
    const size = resolvePrimarySize(product.sizes)

    return [
        '<item>',
        `<g:id>${escapeXml(product.id)}</g:id>`,
        `<title>${escapeXml(product.name)}</title>`,
        `<description>${escapeXml(description)}</description>`,
        `<link>${escapeXml(productUrl)}</link>`,
        `<g:image_link>${escapeXml(toAbsoluteUrl(imageUrl))}</g:image_link>`,
        '<g:availability>in stock</g:availability>',
        `<g:price>${product.sellPrice.toFixed(2)} USD</g:price>`,
        '<g:condition>new</g:condition>',
        '<g:brand>SmartPrintAI</g:brand>',
        `<g:google_product_category>${escapeXml(googleCategory)}</g:google_product_category>`,
        `<g:product_type>${escapeXml(product.category)}</g:product_type>`,
        `<g:color>${escapeXml(color)}</g:color>`,
        '<g:gender>unisex</g:gender>',
        '<g:age_group>adult</g:age_group>',
        ...(size ? [`<g:size>${escapeXml(size)}</g:size>`] : []),
        '<g:identifier_exists>false</g:identifier_exists>',
        '</item>',
    ].join('')
}

function buildFeedXml(products: FeedProduct[]): string {
    const channelLink = toAbsoluteUrl('/')
    const itemsXml = products.map(productToItemXml).join('')

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
                description: true,
                category: true,
                sellPrice: true,
                imageUrl: true,
                colors: true,
                sizes: true,
            },
            orderBy: { name: 'asc' },
        })

        const feedProducts = products.filter((p) => p.imageUrl && p.imageUrl.trim().length > 0)
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
