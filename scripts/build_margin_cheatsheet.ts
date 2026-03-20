import * as dotenv from 'dotenv'
dotenv.config({ path: ['.env.local', '.env'] })

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import {
    type MarginAssumptions,
    type MarginRow,
    type ProductRow,
    type ProviderSummary,
    round2,
    summarizeByProvider,
    toMarginRow,
} from '../src/lib/margin-cheatsheet'

function parseNumberEnv(name: string, fallback: number): number {
    const raw = (process.env[name] || '').trim()
    if (!raw) {
        return fallback
    }
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : fallback
}

function asString(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null
    }
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
}

function asNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value
    }
    if (typeof value === 'string') {
        const parsed = Number(value)
        if (Number.isFinite(parsed)) {
            return parsed
        }
    }
    return null
}

function buildAssumptions(): MarginAssumptions {
    const stripePercent = parseNumberEnv('STRIPE_FEE_PERCENT', 0.029)
    const stripeFixed = parseNumberEnv('STRIPE_FEE_FIXED', 0.3)
    const customerShippingCharge = parseNumberEnv('MARGIN_CUSTOMER_SHIPPING_CHARGE', 5.99)
    const aiGenerationCostPerOrder = parseNumberEnv('MARGIN_AI_GENERATION_COST', 0.04)

    return {
        stripePercent,
        stripeFixed,
        customerShippingCharge,
        aiGenerationCostPerOrder,
        providerShippingCostByProvider: {
            printful: parseNumberEnv('MARGIN_PRINTFUL_SHIPPING_COST', customerShippingCharge),
            gooten: parseNumberEnv('MARGIN_GOOTEN_SHIPPING_COST', customerShippingCharge),
            gelato: parseNumberEnv('MARGIN_GELATO_SHIPPING_COST', customerShippingCharge),
            unknown: parseNumberEnv('MARGIN_UNKNOWN_SHIPPING_COST', customerShippingCharge),
        },
    }
}

function normalizeRemoteProduct(payload: unknown): ProductRow | null {
    if (typeof payload !== 'object' || payload === null) {
        return null
    }

    const record = payload as Record<string, unknown>
    const id = asString(record.id)
    const name = asString(record.name)
    const printfulId = asString(record.printfulId)
    const category = asString(record.category)
    const basePrice = asNumber(record.basePrice)
    const sellPrice = asNumber(record.sellPrice)

    if (!id || !name || !printfulId || !category || basePrice === null || sellPrice === null) {
        return null
    }

    return {
        id,
        name,
        printfulId,
        category,
        basePrice,
        sellPrice,
        printArea: record.printArea,
    }
}

async function loadProductsFromDatabase(databaseUrl: string): Promise<ProductRow[]> {
    const adapter = new PrismaPg({ connectionString: databaseUrl })
    const prisma = new PrismaClient({ adapter })
    try {
        return (await prisma.product.findMany({
            where: { active: true },
            select: {
                id: true,
                name: true,
                printfulId: true,
                printArea: true,
                category: true,
                basePrice: true,
                sellPrice: true,
            },
            orderBy: { name: 'asc' },
        })) as ProductRow[]
    } finally {
        await prisma.$disconnect()
    }
}

async function loadProductsFromHttpCatalog(catalogUrl: string): Promise<ProductRow[]> {
    const response = await fetch(catalogUrl, {
        headers: {
            accept: 'application/json',
        },
    })

    if (!response.ok) {
        throw new Error(`Catalog fetch failed (${response.status}) from ${catalogUrl}`)
    }

    const payload = (await response.json()) as unknown
    if (!Array.isArray(payload)) {
        throw new Error(`Catalog fetch returned non-array payload from ${catalogUrl}`)
    }

    const products = payload.map((row) => normalizeRemoteProduct(row)).filter((row): row is ProductRow => Boolean(row))
    if (products.length === 0) {
        throw new Error(`Catalog fetch returned 0 valid products from ${catalogUrl}`)
    }

    return products.sort((a, b) => a.name.localeCompare(b.name))
}

function resolveCatalogUrl(): string {
    const explicit = asString(process.env.MARGIN_PRODUCT_SOURCE_URL)
    if (explicit) {
        return explicit.endsWith('/api/products') ? explicit : `${explicit.replace(/\/+$/, '')}/api/products`
    }

    const appUrl = asString(process.env.NEXT_PUBLIC_APP_URL) || 'https://smartprintai.com'
    return `${appUrl.replace(/\/+$/, '')}/api/products`
}

async function loadProducts(): Promise<{ products: ProductRow[]; sourceLabel: string }> {
    const databaseUrl = asString(process.env.DATABASE_URL)
    if (databaseUrl) {
        return {
            products: await loadProductsFromDatabase(databaseUrl),
            sourceLabel: 'database',
        }
    }

    const catalogUrl = resolveCatalogUrl()
    return {
        products: await loadProductsFromHttpCatalog(catalogUrl),
        sourceLabel: `api:${catalogUrl}`,
    }
}

function toCsv(rows: MarginRow[]): string {
    const headers = [
        'productId',
        'name',
        'provider',
        'catalogType',
        'category',
        'basePrice',
        'sellPrice',
        'customerShippingCharge',
        'providerShippingCost',
        'aiGenerationCost',
        'stripeFeeEstimate',
        'shippingSpread',
        'grossMargin',
        'totalRevenue',
        'totalCost',
        'netEarnings',
        'netEarningsPct',
    ]

    const escape = (value: string | number) => {
        const asString = String(value)
        if (/[",\n]/.test(asString)) {
            return `"${asString.replace(/"/g, '""')}"`
        }
        return asString
    }

    const lines = [headers.join(',')]
    for (const row of rows) {
        lines.push(
            [
                row.id,
                row.name,
                row.provider,
                row.catalogType,
                row.category,
                row.basePrice.toFixed(2),
                row.sellPrice.toFixed(2),
                row.customerShippingCharge.toFixed(2),
                row.providerShippingCost.toFixed(2),
                row.aiGenerationCost.toFixed(2),
                row.stripeFeeEstimate.toFixed(2),
                row.shippingSpread.toFixed(2),
                row.grossMargin.toFixed(2),
                row.totalRevenue.toFixed(2),
                row.totalCost.toFixed(2),
                row.netEarnings.toFixed(2),
                row.netEarningsPct.toFixed(2),
            ]
                .map(escape)
                .join(',')
        )
    }

    return `${lines.join('\n')}\n`
}

function toSummaryMarkdown(
    rows: MarginRow[],
    summary: Record<string, ProviderSummary>,
    assumptions: MarginAssumptions,
    generatedAt: string,
    sourceLabel: string
): string {
    const lines: string[] = []
    lines.push('# Margin Cheat Sheet')
    lines.push('')
    lines.push(`Generated at: ${generatedAt}`)
    lines.push('')
    lines.push(`Source: ${sourceLabel}`)
    lines.push('')
    lines.push(
        `Stripe fee model used: ${(assumptions.stripePercent * 100).toFixed(2)}% + ${assumptions.stripeFixed.toFixed(2)} per order (estimate only).`
    )
    lines.push('')
    lines.push('Assumptions:')
    lines.push('')
    lines.push(`- Customer shipping charged: ${assumptions.customerShippingCharge.toFixed(2)} (env: \`MARGIN_CUSTOMER_SHIPPING_CHARGE\`)`)
    lines.push(`- AI generation cost per AI-customizable order: ${assumptions.aiGenerationCostPerOrder.toFixed(2)} (env: \`MARGIN_AI_GENERATION_COST\`)`)
    lines.push(`- Printful provider shipping cost: ${assumptions.providerShippingCostByProvider.printful.toFixed(2)} (env: \`MARGIN_PRINTFUL_SHIPPING_COST\`)`)
    lines.push(`- Gooten provider shipping cost: ${assumptions.providerShippingCostByProvider.gooten.toFixed(2)} (env: \`MARGIN_GOOTEN_SHIPPING_COST\`)`)
    lines.push(`- Gelato provider shipping cost: ${assumptions.providerShippingCostByProvider.gelato.toFixed(2)} (env: \`MARGIN_GELATO_SHIPPING_COST\`)`)
    lines.push(`- Unknown provider shipping cost: ${assumptions.providerShippingCostByProvider.unknown.toFixed(2)} (env: \`MARGIN_UNKNOWN_SHIPPING_COST\`)`)
    lines.push('')
    lines.push(`Active products analyzed: ${rows.length}`)
    lines.push('')
    lines.push('## Provider Summary')
    lines.push('')
    lines.push(
        '| Provider | Products | Avg Base | Avg Sell | Avg Cust Shipping | Avg Provider Shipping | Avg AI Cost | Avg Stripe Fee | Avg Total Cost | Avg Net Earnings | Avg Net Earnings % |'
    )
    lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |')
    for (const provider of Object.keys(summary).sort()) {
        const row = summary[provider]
        lines.push(
            `| ${provider} | ${row.count} | ${row.avgBasePrice.toFixed(2)} | ${row.avgSellPrice.toFixed(2)} | ${row.avgCustomerShipping.toFixed(2)} | ${row.avgProviderShipping.toFixed(2)} | ${row.avgAiGenerationCost.toFixed(2)} | ${row.avgStripeFee.toFixed(2)} | ${row.avgTotalCost.toFixed(2)} | ${row.avgNetEarnings.toFixed(2)} | ${row.avgNetEarningsPct.toFixed(2)}% |`
        )
    }
    lines.push('')

    const topRows = [...rows].sort((a, b) => b.netEarnings - a.netEarnings).slice(0, 10)
    const riskRows = [...rows].sort((a, b) => a.netEarnings - b.netEarnings).slice(0, 10)

    lines.push('## Top Net Earnings Products')
    lines.push('')
    lines.push('| Product | Provider | Sell | Total Revenue | Total Cost | Net Earnings | Net Earnings % |')
    lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: |')
    for (const row of topRows) {
        lines.push(
            `| ${row.name} | ${row.provider} | ${row.sellPrice.toFixed(2)} | ${row.totalRevenue.toFixed(2)} | ${row.totalCost.toFixed(2)} | ${row.netEarnings.toFixed(2)} | ${row.netEarningsPct.toFixed(2)}% |`
        )
    }
    lines.push('')

    lines.push('## Lowest Net Earnings Products')
    lines.push('')
    lines.push('| Product | Provider | Sell | Total Revenue | Total Cost | Net Earnings | Net Earnings % |')
    lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: |')
    for (const row of riskRows) {
        lines.push(
            `| ${row.name} | ${row.provider} | ${row.sellPrice.toFixed(2)} | ${row.totalRevenue.toFixed(2)} | ${row.totalCost.toFixed(2)} | ${row.netEarnings.toFixed(2)} | ${row.netEarningsPct.toFixed(2)}% |`
        )
    }
    lines.push('')

    lines.push('Formula:')
    lines.push('')
    lines.push('- `totalRevenue = sellPrice + customerShippingCharge`')
    lines.push('- `totalCost = basePrice + providerShippingCost + aiGenerationCost + stripeFeeEstimate`')
    lines.push('- `netEarnings = totalRevenue - totalCost`')
    lines.push('')
    lines.push('CSV output path: `docs/pricing/MARGIN_CHEAT_SHEET.csv`')
    lines.push('')

    return `${lines.join('\n')}\n`
}

async function main() {
    const assumptions = buildAssumptions()
    const { products, sourceLabel } = await loadProducts()
    const marginRows = products
        .map((product) => toMarginRow(product, assumptions))
        .sort((a, b) => b.netEarnings - a.netEarnings)

    const providerSummary = summarizeByProvider(marginRows)
    const generatedAt = new Date().toISOString()

    const docsDir = join(process.cwd(), 'docs', 'pricing')
    mkdirSync(docsDir, { recursive: true })

    const csvPath = join(docsDir, 'MARGIN_CHEAT_SHEET.csv')
    const mdPath = join(docsDir, 'MARGIN_CHEAT_SHEET.md')

    writeFileSync(csvPath, toCsv(marginRows), 'utf8')
    writeFileSync(mdPath, toSummaryMarkdown(marginRows, providerSummary, assumptions, generatedAt, sourceLabel), 'utf8')

    const overallRevenue = round2(marginRows.reduce((sum, row) => sum + row.totalRevenue, 0))
    const overallCost = round2(marginRows.reduce((sum, row) => sum + row.totalCost, 0))
    const overallNet = round2(marginRows.reduce((sum, row) => sum + row.netEarnings, 0))

    console.log('Margin cheat sheet written:')
    console.log(`- ${csvPath}`)
    console.log(`- ${mdPath}`)
    console.log(`Rows: ${marginRows.length}`)
    console.log(`Source: ${sourceLabel}`)
    console.log(`Portfolio totals (1 order per product): revenue=${overallRevenue.toFixed(2)} cost=${overallCost.toFixed(2)} net=${overallNet.toFixed(2)}`)
}

main().catch((error) => {
    console.error('Failed to build margin cheat sheet:', error)
    process.exitCode = 1
})
