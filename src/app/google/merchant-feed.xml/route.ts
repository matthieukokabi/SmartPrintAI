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
}

const FEED_TITLE = 'SmartPrintAI Product Feed'
const FEED_DESCRIPTION =
    'AI-generated print-on-demand products from SmartPrintAI for Google Merchant Center.'

const CATEGORY_MAP: Record<string, string> = {
    Apparel: 'Apparel & Accessories > Clothing',
    Accessories: 'Apparel & Accessories',
    Home: 'Home & Garden',
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
    return CATEGORY_MAP[category] ?? 'Apparel & Accessories'
}

function productToItemXml(product: FeedProduct): string {
    const productUrl = toAbsoluteUrl(`/products/${product.id}`)
    const imageUrl = toAbsoluteUrl(product.imageUrl)
    const description =
        product.description?.trim() ||
        `Customize ${product.name} with AI-generated artwork and order it on SmartPrintAI.`

    return [
        '<item>',
        `<g:id>${escapeXml(product.id)}</g:id>`,
        `<title>${escapeXml(product.name)}</title>`,
        `<description>${escapeXml(description)}</description>`,
        `<link>${escapeXml(productUrl)}</link>`,
        `<g:image_link>${escapeXml(imageUrl)}</g:image_link>`,
        '<g:availability>in stock</g:availability>',
        `<g:price>${product.sellPrice.toFixed(2)} USD</g:price>`,
        '<g:condition>new</g:condition>',
        '<g:brand>SmartPrintAI</g:brand>',
        `<g:google_product_category>${escapeXml(resolveCategory(product.category))}</g:google_product_category>`,
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
            where: { active: true },
            select: {
                id: true,
                name: true,
                description: true,
                category: true,
                sellPrice: true,
                imageUrl: true,
            },
            orderBy: { name: 'asc' },
        })

        const xml = buildFeedXml(products)
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
