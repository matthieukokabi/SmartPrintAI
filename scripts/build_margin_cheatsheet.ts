import * as dotenv from 'dotenv'
dotenv.config({ path: ['.env.local', '.env'] })

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { isMockupEligibleProduct } from '../src/lib/mockup-eligibility'

type ProductRow = {
    id: string
    name: string
    printfulId: string
    printArea: unknown
    category: string
    basePrice: number
    sellPrice: number
}

type MarginRow = {
    id: string
    name: string
    provider: 'printful' | 'gelato' | 'unknown'
    catalogType: 'ai_customizable' | 'ready_to_buy'
    category: string
    basePrice: number
    sellPrice: number
    stripeFeeEstimate: number
    grossMargin: number
    netMargin: number
    netMarginPct: number
}

type ProviderSummary = {
    count: number
    avgBasePrice: number
    avgSellPrice: number
    avgStripeFee: number
    avgNetMargin: number
    avgNetMarginPct: number
}

function parseNumberEnv(name: string, fallback: number): number {
    const raw = (process.env[name] || '').trim()
    if (!raw) {
        return fallback
    }
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : fallback
}

function round2(value: number): number {
    return Math.round(value * 100) / 100
}

function detectProvider(printfulId: string): MarginRow['provider'] {
    if (printfulId.startsWith('gelato:')) {
        return 'gelato'
    }
    if (/^\d+$/.test(printfulId)) {
        return 'printful'
    }
    return 'unknown'
}

function estimateStripeFee(sellPrice: number, stripePercent: number, stripeFixed: number): number {
    return round2(sellPrice * stripePercent + stripeFixed)
}

function toCatalogType(name: string, printfulId: string, printArea: unknown): MarginRow['catalogType'] {
    return isMockupEligibleProduct({ name, printfulId, printArea }) ? 'ai_customizable' : 'ready_to_buy'
}

function toMarginRow(product: ProductRow, stripePercent: number, stripeFixed: number): MarginRow {
    const stripeFeeEstimate = estimateStripeFee(product.sellPrice, stripePercent, stripeFixed)
    const grossMargin = round2(product.sellPrice - product.basePrice)
    const netMargin = round2(grossMargin - stripeFeeEstimate)
    const netMarginPct = product.sellPrice > 0 ? round2((netMargin / product.sellPrice) * 100) : 0

    return {
        id: product.id,
        name: product.name,
        provider: detectProvider(product.printfulId),
        catalogType: toCatalogType(product.name, product.printfulId, product.printArea),
        category: product.category,
        basePrice: round2(product.basePrice),
        sellPrice: round2(product.sellPrice),
        stripeFeeEstimate,
        grossMargin,
        netMargin,
        netMarginPct,
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
        'stripeFeeEstimate',
        'grossMargin',
        'netMargin',
        'netMarginPct',
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
                row.stripeFeeEstimate.toFixed(2),
                row.grossMargin.toFixed(2),
                row.netMargin.toFixed(2),
                row.netMarginPct.toFixed(2),
            ]
                .map(escape)
                .join(',')
        )
    }

    return `${lines.join('\n')}\n`
}

function summarizeByProvider(rows: MarginRow[]): Record<string, ProviderSummary> {
    const groups = new Map<string, MarginRow[]>()
    for (const row of rows) {
        const existing = groups.get(row.provider) || []
        existing.push(row)
        groups.set(row.provider, existing)
    }

    const out: Record<string, ProviderSummary> = {}
    groups.forEach((providerRows, provider) => {
        const count = providerRows.length
        const avgBasePrice = round2(providerRows.reduce((sum, row) => sum + row.basePrice, 0) / count)
        const avgSellPrice = round2(providerRows.reduce((sum, row) => sum + row.sellPrice, 0) / count)
        const avgStripeFee = round2(providerRows.reduce((sum, row) => sum + row.stripeFeeEstimate, 0) / count)
        const avgNetMargin = round2(providerRows.reduce((sum, row) => sum + row.netMargin, 0) / count)
        const avgNetMarginPct = round2(providerRows.reduce((sum, row) => sum + row.netMarginPct, 0) / count)

        out[provider] = {
            count,
            avgBasePrice,
            avgSellPrice,
            avgStripeFee,
            avgNetMargin,
            avgNetMarginPct,
        }
    })

    return out
}

function toSummaryMarkdown(
    rows: MarginRow[],
    summary: Record<string, ProviderSummary>,
    stripePercent: number,
    stripeFixed: number,
    generatedAt: string
): string {
    const lines: string[] = []
    lines.push('# Margin Cheat Sheet')
    lines.push('')
    lines.push(`Generated at: ${generatedAt}`)
    lines.push('')
    lines.push(
        `Stripe fee model used: ${(stripePercent * 100).toFixed(2)}% + ${stripeFixed.toFixed(2)} per order item (estimate only).`
    )
    lines.push('')
    lines.push(`Active products analyzed: ${rows.length}`)
    lines.push('')
    lines.push('## Provider Summary')
    lines.push('')
    lines.push('| Provider | Products | Avg Base | Avg Sell | Avg Stripe Fee | Avg Net Margin | Avg Net Margin % |')
    lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: |')
    for (const provider of Object.keys(summary).sort()) {
        const row = summary[provider]
        lines.push(
            `| ${provider} | ${row.count} | ${row.avgBasePrice.toFixed(2)} | ${row.avgSellPrice.toFixed(2)} | ${row.avgStripeFee.toFixed(2)} | ${row.avgNetMargin.toFixed(2)} | ${row.avgNetMarginPct.toFixed(2)}% |`
        )
    }
    lines.push('')

    const topRows = [...rows].sort((a, b) => b.netMargin - a.netMargin).slice(0, 10)
    const riskRows = [...rows].sort((a, b) => a.netMargin - b.netMargin).slice(0, 10)

    lines.push('## Top Net Margin Products')
    lines.push('')
    lines.push('| Product | Provider | Sell | Net Margin | Net Margin % |')
    lines.push('| --- | --- | ---: | ---: | ---: |')
    for (const row of topRows) {
        lines.push(
            `| ${row.name} | ${row.provider} | ${row.sellPrice.toFixed(2)} | ${row.netMargin.toFixed(2)} | ${row.netMarginPct.toFixed(2)}% |`
        )
    }
    lines.push('')

    lines.push('## Lowest Net Margin Products')
    lines.push('')
    lines.push('| Product | Provider | Sell | Net Margin | Net Margin % |')
    lines.push('| --- | --- | ---: | ---: | ---: |')
    for (const row of riskRows) {
        lines.push(
            `| ${row.name} | ${row.provider} | ${row.sellPrice.toFixed(2)} | ${row.netMargin.toFixed(2)} | ${row.netMarginPct.toFixed(2)}% |`
        )
    }
    lines.push('')

    lines.push('CSV output path: `docs/pricing/MARGIN_CHEAT_SHEET.csv`')
    lines.push('')

    return `${lines.join('\n')}\n`
}

async function main() {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
        throw new Error('DATABASE_URL is required')
    }

    const stripePercent = parseNumberEnv('STRIPE_FEE_PERCENT', 0.029)
    const stripeFixed = parseNumberEnv('STRIPE_FEE_FIXED', 0.3)

    const adapter = new PrismaPg({ connectionString: databaseUrl })
    const prisma = new PrismaClient({ adapter })

    try {
        const products = (await prisma.product.findMany({
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

        const marginRows = products
            .map((product) => toMarginRow(product, stripePercent, stripeFixed))
            .sort((a, b) => b.netMargin - a.netMargin)

        const providerSummary = summarizeByProvider(marginRows)
        const generatedAt = new Date().toISOString()

        const docsDir = join(process.cwd(), 'docs', 'pricing')
        mkdirSync(docsDir, { recursive: true })

        const csvPath = join(docsDir, 'MARGIN_CHEAT_SHEET.csv')
        const mdPath = join(docsDir, 'MARGIN_CHEAT_SHEET.md')

        writeFileSync(csvPath, toCsv(marginRows), 'utf8')
        writeFileSync(mdPath, toSummaryMarkdown(marginRows, providerSummary, stripePercent, stripeFixed, generatedAt), 'utf8')

        console.log(`Margin cheat sheet written:`)
        console.log(`- ${csvPath}`)
        console.log(`- ${mdPath}`)
        console.log(`Rows: ${marginRows.length}`)
    } finally {
        await prisma.$disconnect()
    }
}

main().catch((error) => {
    console.error('Failed to build margin cheat sheet:', error)
    process.exitCode = 1
})
