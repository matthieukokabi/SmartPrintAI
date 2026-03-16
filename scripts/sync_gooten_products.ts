import * as dotenv from 'dotenv'
dotenv.config({ path: ['.env.local', '.env'] })

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import {
    GootenClient,
    extractGootenMinPrice,
    extractGootenProductCategory,
    extractGootenProductColorNames,
    extractGootenProductDescription,
    extractGootenProductId,
    extractGootenProductImageUrl,
    extractGootenProductName,
    extractGootenProductSizes,
    extractGootenProducts,
    extractGootenVariantMapping,
} from '../src/lib/gooten'

function parseKeywordEnv(value: string | undefined): string[] {
    if (!value) {
        return []
    }

    return value
        .split(',')
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean)
}

function classifyCategory(text: string): string {
    const value = text.toLowerCase()
    if (/(shirt|hoodie|sweatshirt|tank|polo|apparel|tee)/.test(value)) return 'apparel'
    if (/(mug|drink|bottle|cup)/.test(value)) return 'drinkware'
    if (/(airpod|airpods|case|hat|cap|phone|accessor)/.test(value)) return 'accessories'
    if (/(canvas|poster|pillow|blanket|wall|home)/.test(value)) return 'home'
    return 'accessories'
}

function containsKeyword(text: string, keywords: string[]): boolean {
    if (keywords.length === 0) return false
    const haystack = text.toLowerCase()
    return keywords.some((keyword) => haystack.includes(keyword))
}

function calcSellPrice(basePrice: number, multiplier: number, minMargin: number): number {
    const raw = Math.max(basePrice * multiplier, basePrice + minMargin)
    return Math.round(raw * 100) / 100
}

function toColorPayloads(colorNames: string[]): Array<{ name: string; hex: string; printfulVariantId: number }> {
    const colors = colorNames.length > 0 ? colorNames : ['Default']
    return colors.map((name) => ({
        name,
        hex: '#FFFFFF',
        printfulVariantId: 0,
    }))
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
    throw new Error('DATABASE_URL is required')
}

const gootenRecipeId = (process.env.GOOTEN_RECIPE_ID || '').trim()
if (!gootenRecipeId) {
    throw new Error('GOOTEN_RECIPE_ID is required')
}

const GOOTEN_PARTNER_BILLING_KEY = (process.env.GOOTEN_PARTNER_BILLING_KEY || '').trim() || undefined
const GOOTEN_API_BASE_URL = (process.env.GOOTEN_API_BASE_URL || 'https://api.print.io/api').trim()
const GOOTEN_SYNC_MAX_PRODUCTS = Number(process.env.GOOTEN_SYNC_MAX_PRODUCTS || 40)
const GOOTEN_SYNC_MIN_BASE_PRICE = Number(process.env.GOOTEN_SYNC_MIN_BASE_PRICE || 10)
const GOOTEN_SELL_PRICE_MULTIPLIER = Number(process.env.GOOTEN_SELL_PRICE_MULTIPLIER || 2.2)
const GOOTEN_MIN_MARGIN = Number(process.env.GOOTEN_MIN_MARGIN || 8)
const GOOTEN_SYNC_DEACTIVATE_MISSING = process.env.GOOTEN_SYNC_DEACTIVATE_MISSING === '1'
const GOOTEN_SYNC_DRY_RUN = process.env.GOOTEN_SYNC_DRY_RUN === '1'
const GOOTEN_SYNC_ACTIVE_DEFAULT = process.env.GOOTEN_SYNC_ACTIVE_DEFAULT === '1'
const GOOTEN_SYNC_COUNTRY_CODE = (process.env.GOOTEN_SYNC_COUNTRY_CODE || 'US').trim().toUpperCase()
const GOOTEN_SYNC_CURRENCY_CODE = (process.env.GOOTEN_SYNC_CURRENCY_CODE || 'USD').trim().toUpperCase()
const GOOTEN_SYNC_INCLUDE_KEYWORDS = parseKeywordEnv(
    process.env.GOOTEN_SYNC_INCLUDE_KEYWORDS ||
        't-shirt,tee,hoodie,sweatshirt,tank,polo,mug,airpod,airpods,case,hat,cap'
)
const GOOTEN_SYNC_EXCLUDE_KEYWORDS = parseKeywordEnv(process.env.GOOTEN_SYNC_EXCLUDE_KEYWORDS)

const adapter = new PrismaPg({ connectionString: databaseUrl })
const prisma = new PrismaClient({ adapter })
const gooten = new GootenClient(gootenRecipeId, GOOTEN_PARTNER_BILLING_KEY, GOOTEN_API_BASE_URL)

async function main() {
    console.log('Starting Gooten product sync...')
    console.log(
        `Config: maxProducts=${GOOTEN_SYNC_MAX_PRODUCTS} minBasePrice=${GOOTEN_SYNC_MIN_BASE_PRICE} dryRun=${GOOTEN_SYNC_DRY_RUN} activeDefault=${GOOTEN_SYNC_ACTIVE_DEFAULT} country=${GOOTEN_SYNC_COUNTRY_CODE} currency=${GOOTEN_SYNC_CURRENCY_CODE} includeKeywords=${GOOTEN_SYNC_INCLUDE_KEYWORDS.join('|') || 'none'} excludeKeywords=${GOOTEN_SYNC_EXCLUDE_KEYWORDS.join('|') || 'none'}`
    )

    const productsPayload = await gooten.listProducts()
    const products = extractGootenProducts(productsPayload)

    if (products.length === 0) {
        console.log('No Gooten products returned; nothing to sync.')
        return
    }

    let synced = 0
    let skippedFiltered = 0
    let skippedNoPrice = 0
    let skippedNoImage = 0
    let skippedNoSkuMapping = 0
    let skippedVariantLookupFailed = 0
    const syncedPrintfulIds: string[] = []
    const seenNames = new Set<string>()

    for (const productPayload of products) {
        if (GOOTEN_SYNC_MAX_PRODUCTS > 0 && synced >= GOOTEN_SYNC_MAX_PRODUCTS) {
            break
        }

        const productId = extractGootenProductId(productPayload)
        const productName = extractGootenProductName(productPayload)
        if (!productId || !productName) {
            skippedFiltered += 1
            continue
        }

        const searchableText = `${productName} ${extractGootenProductCategory(productPayload) || ''}`.toLowerCase()
        if (
            GOOTEN_SYNC_INCLUDE_KEYWORDS.length > 0 &&
            !containsKeyword(searchableText, GOOTEN_SYNC_INCLUDE_KEYWORDS)
        ) {
            skippedFiltered += 1
            continue
        }

        if (
            GOOTEN_SYNC_EXCLUDE_KEYWORDS.length > 0 &&
            containsKeyword(searchableText, GOOTEN_SYNC_EXCLUDE_KEYWORDS)
        ) {
            skippedFiltered += 1
            continue
        }

        const dedupeKey = productName.trim().toLowerCase()
        if (seenNames.has(dedupeKey)) {
            skippedFiltered += 1
            continue
        }
        seenNames.add(dedupeKey)

        const basePrice = extractGootenMinPrice(productPayload)
        if (!basePrice || basePrice <= 0 || basePrice < GOOTEN_SYNC_MIN_BASE_PRICE) {
            skippedNoPrice += 1
            continue
        }

        const imageUrl = extractGootenProductImageUrl(productPayload) || ''
        if (!imageUrl) {
            skippedNoImage += 1
            continue
        }

        const printfulId = `gooten:${productId}`
        let variantsPayload: unknown
        try {
            variantsPayload = await gooten.listProductVariants(
                productId,
                GOOTEN_SYNC_COUNTRY_CODE,
                GOOTEN_SYNC_CURRENCY_CODE
            )
        } catch (error) {
            skippedVariantLookupFailed += 1
            console.warn(`Skipping ${printfulId} due to variant lookup failure:`, error)
            continue
        }
        const variantMapping = extractGootenVariantMapping(variantsPayload)
        if (!variantMapping.defaultSku) {
            skippedNoSkuMapping += 1
            continue
        }

        const existing = await prisma.product.findUnique({ where: { printfulId } })
        const sellPrice = existing?.sellPrice ?? calcSellPrice(basePrice, GOOTEN_SELL_PRICE_MULTIPLIER, GOOTEN_MIN_MARGIN)
        const category = classifyCategory(`${productName} ${extractGootenProductCategory(productPayload) || ''}`)
        const sizes =
            variantMapping.sizes.length > 0 ? variantMapping.sizes : extractGootenProductSizes(productPayload)
        const colors = toColorPayloads(
            variantMapping.colors.length > 0
                ? variantMapping.colors
                : extractGootenProductColorNames(productPayload)
        )
        const description = extractGootenProductDescription(productPayload) || productName

        const data = {
            name: productName,
            printfulId,
            description,
            category,
            basePrice,
            sellPrice,
            sizes: sizes.length > 0 ? sizes : ['One Size'],
            colors,
            imageUrl,
            printArea: {
                width: 4200,
                height: 4800,
                dpi: 300,
                provider: 'gooten',
                providerProductId: productId,
                providerDefaultSku: variantMapping.defaultSku,
                providerCountryCode: GOOTEN_SYNC_COUNTRY_CODE,
                providerCurrencyCode: GOOTEN_SYNC_CURRENCY_CODE,
                providerRecipeId: gootenRecipeId,
                variantMapping: variantMapping.variantMapping,
            },
            active: GOOTEN_SYNC_ACTIVE_DEFAULT,
        }

        if (GOOTEN_SYNC_DRY_RUN) {
            console.log(`[dry-run] upsert ${printfulId} (${productName})`)
            synced += 1
            syncedPrintfulIds.push(printfulId)
            continue
        }

        await prisma.product.upsert({
            where: { printfulId },
            update: data,
            create: data,
        })
        synced += 1
        syncedPrintfulIds.push(printfulId)
        console.log(`Synced ${printfulId} (${productName})`)
    }

    let deactivated = 0
    if (!GOOTEN_SYNC_DRY_RUN && GOOTEN_SYNC_DEACTIVATE_MISSING && syncedPrintfulIds.length > 0) {
        const result = await prisma.product.updateMany({
            where: {
                active: true,
                printfulId: {
                    startsWith: 'gooten:',
                    notIn: syncedPrintfulIds,
                },
            },
            data: {
                active: false,
            },
        })
        deactivated = result.count
    }

    console.log(
        `Gooten sync completed. synced=${synced} skippedFiltered=${skippedFiltered} skippedNoPrice=${skippedNoPrice} skippedNoImage=${skippedNoImage} skippedNoSkuMapping=${skippedNoSkuMapping} skippedVariantLookupFailed=${skippedVariantLookupFailed} deactivated=${deactivated}`
    )
}

main()
    .catch((error) => {
        console.error('Gooten sync failed:', error)
        process.exitCode = 1
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
