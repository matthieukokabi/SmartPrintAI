import * as dotenv from 'dotenv'
dotenv.config({ path: ['.env.local', '.env'] })

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import {
    GelatoClient,
    extractGelatoMinUnitPrice,
    extractGelatoProductDescription,
    extractGelatoProductImageUrl,
    extractGelatoProductName,
    extractGelatoProductSizes,
    extractGelatoProductUids,
} from '../src/lib/gelato'

type CatalogSyncStats = {
    synced: number
    skippedNoPrice: number
    skippedNoProducts: number
}

function classifyCategory(text: string): string {
    const v = text.toLowerCase()
    if (/(shirt|hoodie|sweatshirt|tank|apparel|tee|polo)/.test(v)) return 'apparel'
    if (/(mug|drink|bottle|cup)/.test(v)) return 'drinkware'
    if (/(canvas|poster|pillow|blanket|home|frame|wall)/.test(v)) return 'home'
    return 'accessories'
}

function calcSellPrice(basePrice: number, multiplier: number, minMargin: number): number {
    const raw = Math.max(basePrice * multiplier, basePrice + minMargin)
    return Math.round(raw * 100) / 100
}

function parseBooleanEnv(value: string | undefined): boolean {
    return value === '1' || value?.toLowerCase() === 'true'
}

function parseCatalogName(payload: unknown, fallback: string): string {
    if (typeof payload !== 'object' || payload === null) {
        return fallback
    }

    const record = payload as Record<string, unknown>
    const directName = record.name
    if (typeof directName === 'string' && directName.trim()) {
        return directName.trim()
    }

    const title = record.title
    if (typeof title === 'string' && title.trim()) {
        return title.trim()
    }

    return fallback
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
    throw new Error('DATABASE_URL is required')
}

const gelatoApiKey = process.env.GELATO_API_KEY
if (!gelatoApiKey) {
    throw new Error('GELATO_API_KEY is required')
}

const rawCatalogUids = (process.env.GELATO_CATALOG_UIDS || '').split(',').map((v) => v.trim()).filter(Boolean)
if (rawCatalogUids.length === 0) {
    throw new Error('GELATO_CATALOG_UIDS is required (comma-separated list)')
}

const GELATO_SYNC_LIMIT = Number(process.env.GELATO_SYNC_LIMIT || 20)
const GELATO_SYNC_OFFSET = Number(process.env.GELATO_SYNC_OFFSET || 0)
const GELATO_PRICE_COUNTRY = process.env.GELATO_PRICE_COUNTRY || 'US'
const GELATO_PRICE_CURRENCY = process.env.GELATO_PRICE_CURRENCY || 'USD'
const GELATO_SELL_PRICE_MULTIPLIER = Number(process.env.GELATO_SELL_PRICE_MULTIPLIER || 2.2)
const GELATO_MIN_MARGIN = Number(process.env.GELATO_MIN_MARGIN || 8)
const GELATO_SYNC_DRY_RUN = parseBooleanEnv(process.env.GELATO_SYNC_DRY_RUN)

const adapter = new PrismaPg({ connectionString: databaseUrl })
const prisma = new PrismaClient({ adapter })
const gelato = new GelatoClient(gelatoApiKey, process.env.GELATO_PRODUCTS_BASE_URL)

async function syncCatalog(catalogUid: string): Promise<CatalogSyncStats> {
    const catalogPayload = await gelato.getCatalog(catalogUid)
    const catalogName = parseCatalogName(catalogPayload, `Gelato Catalog ${catalogUid}`)

    const catalogSearchPayload = await gelato.searchCatalogProducts(catalogUid, {
        limit: GELATO_SYNC_LIMIT,
        offset: GELATO_SYNC_OFFSET,
    })
    const productUids = extractGelatoProductUids(catalogSearchPayload)

    if (productUids.length === 0) {
        console.log(`Catalog ${catalogUid}: no products returned.`)
        return { synced: 0, skippedNoPrice: 0, skippedNoProducts: 1 }
    }

    let synced = 0
    let skippedNoPrice = 0

    for (const productUid of productUids) {
        const [productPayload, pricesPayload] = await Promise.all([
            gelato.getProduct(productUid),
            gelato.getProductPrices(productUid, {
                country: GELATO_PRICE_COUNTRY,
                currency: GELATO_PRICE_CURRENCY,
            }),
        ])

        const basePrice = extractGelatoMinUnitPrice(pricesPayload)
        if (!basePrice || basePrice <= 0) {
            skippedNoPrice += 1
            console.log(`Skip ${productUid}: no unit price found.`)
            continue
        }

        const productName = extractGelatoProductName(productPayload) || `Gelato Product ${productUid}`
        const description = extractGelatoProductDescription(productPayload) || productName
        const imageUrl = extractGelatoProductImageUrl(productPayload) || ''
        const sizes = extractGelatoProductSizes(productPayload)
        const printfulId = `gelato:${productUid}`
        const category = classifyCategory(`${catalogName} ${productName}`)

        const existing = await prisma.product.findUnique({ where: { printfulId } })
        const sellPrice = existing?.sellPrice ?? calcSellPrice(basePrice, GELATO_SELL_PRICE_MULTIPLIER, GELATO_MIN_MARGIN)

        const data = {
            name: `${productName}`,
            printfulId,
            description,
            category,
            basePrice,
            sellPrice,
            sizes,
            colors: [
                {
                    name: 'Default',
                    hex: '#FFFFFF',
                    printfulVariantId: 0,
                },
            ],
            imageUrl,
            printArea: existing?.printArea || { width: 4200, height: 4800, dpi: 300 },
            active: true,
        }

        if (GELATO_SYNC_DRY_RUN) {
            console.log(`[dry-run] upsert ${printfulId} (${productName})`)
            continue
        }

        await prisma.product.upsert({
            where: { printfulId },
            update: data,
            create: data,
        })
        synced += 1
        console.log(`Synced ${printfulId} (${productName})`)
    }

    return { synced, skippedNoPrice, skippedNoProducts: 0 }
}

async function main() {
    console.log('Starting Gelato product sync...')
    console.log(`Catalogs: ${rawCatalogUids.join(', ')}`)
    console.log(
        `Config: limit=${GELATO_SYNC_LIMIT} offset=${GELATO_SYNC_OFFSET} country=${GELATO_PRICE_COUNTRY} currency=${GELATO_PRICE_CURRENCY} dryRun=${GELATO_SYNC_DRY_RUN}`
    )

    let totalSynced = 0
    let totalSkippedNoPrice = 0
    let totalCatalogsWithoutProducts = 0

    for (const catalogUid of rawCatalogUids) {
        const stats = await syncCatalog(catalogUid)
        totalSynced += stats.synced
        totalSkippedNoPrice += stats.skippedNoPrice
        totalCatalogsWithoutProducts += stats.skippedNoProducts
    }

    console.log(
        `Gelato sync completed. synced=${totalSynced} skippedNoPrice=${totalSkippedNoPrice} emptyCatalogs=${totalCatalogsWithoutProducts}`
    )
}

main()
    .catch((error) => {
        console.error('Gelato sync failed:', error)
        process.exitCode = 1
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

