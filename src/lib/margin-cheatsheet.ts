import { isMockupEligibleProduct } from './mockup-eligibility'
import { detectProductProvider, type ProductProvider } from './product-provider'

export type ProductRow = {
    id: string
    name: string
    printfulId: string
    printArea: unknown
    category: string
    basePrice: number
    sellPrice: number
}

export type CatalogType = 'ai_customizable' | 'ready_to_buy'

export type MarginAssumptions = {
    stripePercent: number
    stripeFixed: number
    customerShippingCharge: number
    aiGenerationCostPerOrder: number
    providerShippingCostByProvider: Record<ProductProvider, number>
}

export type MarginRow = {
    id: string
    name: string
    provider: ProductProvider
    catalogType: CatalogType
    category: string
    basePrice: number
    sellPrice: number
    customerShippingCharge: number
    providerShippingCost: number
    aiGenerationCost: number
    stripeFeeEstimate: number
    shippingSpread: number
    grossMargin: number
    totalRevenue: number
    totalCost: number
    netEarnings: number
    netEarningsPct: number
}

export type ProviderSummary = {
    count: number
    avgBasePrice: number
    avgSellPrice: number
    avgCustomerShipping: number
    avgProviderShipping: number
    avgAiGenerationCost: number
    avgStripeFee: number
    avgTotalRevenue: number
    avgTotalCost: number
    avgNetEarnings: number
    avgNetEarningsPct: number
}

export function round2(value: number): number {
    return Math.round(value * 100) / 100
}

export function estimateStripeFee(totalCharge: number, stripePercent: number, stripeFixed: number): number {
    return round2(totalCharge * stripePercent + stripeFixed)
}

export function toCatalogType(product: ProductRow): CatalogType {
    return isMockupEligibleProduct({
        name: product.name,
        printfulId: product.printfulId,
        printArea: product.printArea,
    })
        ? 'ai_customizable'
        : 'ready_to_buy'
}

export function toMarginRow(product: ProductRow, assumptions: MarginAssumptions): MarginRow {
    const provider = detectProductProvider(product.printfulId)
    const catalogType = toCatalogType(product)
    const providerShippingCost = round2(assumptions.providerShippingCostByProvider[provider])
    const aiGenerationCost =
        catalogType === 'ai_customizable' ? round2(assumptions.aiGenerationCostPerOrder) : 0
    const customerShippingCharge = round2(assumptions.customerShippingCharge)
    const shippingSpread = round2(customerShippingCharge - providerShippingCost)
    const totalRevenue = round2(product.sellPrice + customerShippingCharge)
    const stripeFeeEstimate = estimateStripeFee(totalRevenue, assumptions.stripePercent, assumptions.stripeFixed)
    const grossMargin = round2(product.sellPrice - product.basePrice)
    const totalCost = round2(product.basePrice + providerShippingCost + aiGenerationCost + stripeFeeEstimate)
    const netEarnings = round2(totalRevenue - totalCost)
    const netEarningsPct = totalRevenue > 0 ? round2((netEarnings / totalRevenue) * 100) : 0

    return {
        id: product.id,
        name: product.name,
        provider,
        catalogType,
        category: product.category,
        basePrice: round2(product.basePrice),
        sellPrice: round2(product.sellPrice),
        customerShippingCharge,
        providerShippingCost,
        aiGenerationCost,
        stripeFeeEstimate,
        shippingSpread,
        grossMargin,
        totalRevenue,
        totalCost,
        netEarnings,
        netEarningsPct,
    }
}

export function summarizeByProvider(rows: MarginRow[]): Record<string, ProviderSummary> {
    const groups = new Map<string, MarginRow[]>()
    for (const row of rows) {
        const providerRows = groups.get(row.provider) || []
        providerRows.push(row)
        groups.set(row.provider, providerRows)
    }

    const out: Record<string, ProviderSummary> = {}
    groups.forEach((providerRows, provider) => {
        const count = providerRows.length
        const avg = (pick: (row: MarginRow) => number) =>
            round2(providerRows.reduce((sum, row) => sum + pick(row), 0) / count)

        out[provider] = {
            count,
            avgBasePrice: avg((row) => row.basePrice),
            avgSellPrice: avg((row) => row.sellPrice),
            avgCustomerShipping: avg((row) => row.customerShippingCharge),
            avgProviderShipping: avg((row) => row.providerShippingCost),
            avgAiGenerationCost: avg((row) => row.aiGenerationCost),
            avgStripeFee: avg((row) => row.stripeFeeEstimate),
            avgTotalRevenue: avg((row) => row.totalRevenue),
            avgTotalCost: avg((row) => row.totalCost),
            avgNetEarnings: avg((row) => row.netEarnings),
            avgNetEarningsPct: avg((row) => row.netEarningsPct),
        }
    })

    return out
}
