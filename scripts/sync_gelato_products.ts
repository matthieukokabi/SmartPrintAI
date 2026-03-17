import * as dotenv from 'dotenv'
dotenv.config({ path: ['.env.local', '.env'] })

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import {
    GelatoClient,
    extractGelatoAttributesMap,
    extractGelatoCatalogUids,
    extractGelatoColorName,
    extractGelatoIsPrintable,
    extractGelatoMinUnitPrice,
    extractGelatoProductDescription,
    extractGelatoProductImageUrl,
    extractGelatoProductName,
    extractGelatoProductSizes,
    extractGelatoProductUids,
    extractGelatoStoreProductColorNames,
    extractGelatoStoreProductDescription,
    extractGelatoStoreProductImageUrl,
    extractGelatoStoreProductName,
    extractGelatoStoreProductColorPreviewMap,
    extractGelatoStoreProductSizes,
    extractGelatoStoreProductTemplateId,
    extractGelatoStoreProducts,
    extractGelatoStoreProductUid,
    extractGelatoStoreProductVariantUids,
    extractGelatoTemplatePlaceholderName,
    extractGelatoTemplateProductUids,
    extractGelatoStoreVariantMapping,
    extractGelatoVariantMapping,
} from '../src/lib/gelato'
import { buildCuratedColorPayloads } from '../src/lib/product-colors'
import { type GelatoTemplateMappingEntry, resolveGelatoStoreId, resolveGelatoTemplateMappings } from '../src/lib/gelato-template-mapping'

type SyncStats = {
    synced: number
    skippedNoPrice: number
    skippedUnavailable: number
    skippedUnprintable: number
    skippedDuplicates: number
    skippedFiltered: number
    skippedNoProducts: number
    syncedPrintfulIds: string[]
}

type TemplateIndex = {
    byTemplateId: Map<string, GelatoTemplateMappingEntry>
    byVariantUid: Map<string, GelatoTemplateMappingEntry>
    byTemplateName: Map<string, GelatoTemplateMappingEntry>
    validatedTemplateIds: Set<string>
    templatePlaceholderNames: Map<string, string>
    templateHasPlaceholders: Set<string>
}

const STORE_PRODUCTS_PAGE_LIMIT = Number(process.env.GELATO_STORE_PRODUCTS_PAGE_LIMIT || 50)

function classifyCategory(text: string): string {
    const v = text.toLowerCase()
    if (/(shirt|hoodie|sweatshirt|tank|apparel|tee|polo)/.test(v)) return 'apparel'
    if (/(mug|drink|bottle|cup)/.test(v)) return 'drinkware'
    if (/(canvas|poster|pillow|blanket|home|frame|wall)/.test(v)) return 'home'
    return 'accessories'
}

function classifyCategoryByProductType(productType: string, fallbackText: string): string {
    const normalizedType = productType.toLowerCase()
    if (normalizedType.includes('shirt') || normalizedType.includes('hoodie')) return 'apparel'
    if (normalizedType.includes('mug')) return 'drinkware'
    if (normalizedType.includes('poster') || normalizedType.includes('canvas')) return 'home'
    return classifyCategory(fallbackText)
}

function calcSellPrice(basePrice: number, multiplier: number, minMargin: number): number {
    const raw = Math.max(basePrice * multiplier, basePrice + minMargin)
    return Math.round(raw * 100) / 100
}

function parseBooleanEnv(value: string | undefined): boolean {
    return value === '1' || value?.toLowerCase() === 'true'
}

function normalizeToken(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function normalizeGarmentCut(value: string): string {
    const normalized = normalizeToken(value)

    if (['male', 'man', 'men', 'mens', 'm'].includes(normalized)) return 'mens'
    if (['female', 'woman', 'women', 'womens', 'ladies', 'lady', 'w'].includes(normalized)) return 'womens'
    if (['unisex', 'none', 'all', 'neutral'].includes(normalized)) return 'unisex'

    return normalized
}

function parseKeywordEnv(value: string | undefined): string[] {
    if (!value) {
        return []
    }

    return value
        .split(',')
        .map((keyword) => keyword.trim().toLowerCase())
        .filter(Boolean)
}

function containsAnyKeyword(sourceText: string, keywords: string[]): boolean {
    if (keywords.length === 0) {
        return false
    }

    const haystack = sourceText.toLowerCase()
    return keywords.some((keyword) => haystack.includes(keyword))
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

function parseExistingPrintArea(value: unknown): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return {}
    }
    return value as Record<string, unknown>
}

function buildFallbackName(productUid: string, catalogName: string): string {
    const normalizedCatalog = catalogName.trim() || 'Product'
    const tail = productUid.split('_').slice(-2).join(' ').replace(/-/g, ' ').trim()
    if (tail.length === 0) {
        return `Gelato ${normalizedCatalog}`
    }
    return `Gelato ${normalizedCatalog} ${tail}`
}

function isSkippableProductError(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false
    }

    const message = error.message.toLowerCase()
    return (
        message.includes('gelato api error 404') ||
        message.includes('prices not found for product') ||
        message.includes('gelato api error 403') ||
        message.includes('gelato ecommerce api error 404')
    )
}

function normalizeNameKey(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function sanitizeGelatoImageUrl(value: string | null | undefined): string {
    const normalized = (value || '').trim()
    if (!normalized || !/^https?:\/\//i.test(normalized)) {
        return ''
    }

    if (/printful/i.test(normalized)) {
        return ''
    }

    return normalized
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
    throw new Error('DATABASE_URL is required')
}

const gelatoApiKey = process.env.GELATO_API_KEY
if (!gelatoApiKey) {
    throw new Error('GELATO_API_KEY is required')
}

const GELATO_SYNC_MODE = (process.env.GELATO_SYNC_MODE || 'catalog').trim().toLowerCase()
const rawCatalogUids = (process.env.GELATO_CATALOG_UIDS || '').split(',').map((v) => v.trim()).filter(Boolean)
const GELATO_SYNC_CATALOG_AUTO_DISCOVER = parseBooleanEnv(
    process.env.GELATO_SYNC_CATALOG_AUTO_DISCOVER ?? (GELATO_SYNC_MODE === 'hybrid' ? '1' : '0')
)
const GELATO_CATALOG_DISCOVERY_LIMIT = Number(process.env.GELATO_CATALOG_DISCOVERY_LIMIT || 100)
const GELATO_CATALOG_DISCOVERY_MAX = Number(process.env.GELATO_CATALOG_DISCOVERY_MAX || 300)
const GELATO_SYNC_APPAREL_ONLY = process.env.GELATO_SYNC_APPAREL_ONLY !== '0'
const GELATO_SYNC_GARMENT_CUTS = (process.env.GELATO_SYNC_GARMENT_CUTS || 'mens,womens,unisex')
    .split(',')
    .map((value) => normalizeGarmentCut(value))
    .filter(Boolean)
const GELATO_SYNC_GARMENT_CUTS_SET = new Set(GELATO_SYNC_GARMENT_CUTS)

const GELATO_SYNC_PAGE_LIMIT = Number(process.env.GELATO_SYNC_PAGE_LIMIT || process.env.GELATO_SYNC_LIMIT || 100)
const GELATO_SYNC_OFFSET = Number(process.env.GELATO_SYNC_OFFSET || 0)
const GELATO_SYNC_MAX_PRODUCTS = Number(process.env.GELATO_SYNC_MAX_PRODUCTS || 0)
const GELATO_PRICE_COUNTRY = process.env.GELATO_PRICE_COUNTRY || 'US'
const GELATO_PRICE_CURRENCY = process.env.GELATO_PRICE_CURRENCY || 'USD'
const GELATO_SELL_PRICE_MULTIPLIER = Number(process.env.GELATO_SELL_PRICE_MULTIPLIER || 2.2)
const GELATO_MIN_MARGIN = Number(process.env.GELATO_MIN_MARGIN || 8)
const GELATO_SYNC_DEACTIVATE_MISSING = process.env.GELATO_SYNC_DEACTIVATE_MISSING !== '0'
const GELATO_SYNC_DEDUPE_BY_NAME = process.env.GELATO_SYNC_DEDUPE_BY_NAME !== '0'
const GELATO_SYNC_DRY_RUN = parseBooleanEnv(process.env.GELATO_SYNC_DRY_RUN)
const GELATO_SYNC_REQUIRE_IMAGE = process.env.GELATO_SYNC_REQUIRE_IMAGE !== '0'
const GELATO_SYNC_MIN_BASE_PRICE = Number(process.env.GELATO_SYNC_MIN_BASE_PRICE || 0)
const GELATO_SYNC_INCLUDE_KEYWORDS = parseKeywordEnv(process.env.GELATO_SYNC_INCLUDE_KEYWORDS)
const GELATO_SYNC_EXCLUDE_KEYWORDS = parseKeywordEnv(process.env.GELATO_SYNC_EXCLUDE_KEYWORDS)

const adapter = new PrismaPg({ connectionString: databaseUrl })
const prisma = new PrismaClient({ adapter })
const gelato = new GelatoClient(
    gelatoApiKey,
    process.env.GELATO_PRODUCTS_BASE_URL,
    process.env.GELATO_ECOMMERCE_BASE_URL
)

function isApparelCatalogProduct(catalogName: string, productName: string, attributesMap: Record<string, string>): boolean {
    if (attributesMap.garmentcategory || attributesMap.garmentsubcategory || attributesMap.garmentcut) {
        return true
    }

    const inferredCategory = classifyCategory(`${catalogName} ${productName}`)
    return inferredCategory === 'apparel'
}

function shouldIncludeCatalogProduct(
    catalogName: string,
    productName: string,
    productPayload: unknown
): { include: boolean; reason?: string } {
    const attributesMap = extractGelatoAttributesMap(productPayload)
    const searchableText = `${catalogName} ${productName} ${Object.values(attributesMap).join(' ')}`.toLowerCase()

    if (GELATO_SYNC_INCLUDE_KEYWORDS.length > 0 && !containsAnyKeyword(searchableText, GELATO_SYNC_INCLUDE_KEYWORDS)) {
        return { include: false, reason: 'keyword-miss' }
    }

    if (GELATO_SYNC_EXCLUDE_KEYWORDS.length > 0 && containsAnyKeyword(searchableText, GELATO_SYNC_EXCLUDE_KEYWORDS)) {
        return { include: false, reason: 'keyword-excluded' }
    }

    const isApparel = isApparelCatalogProduct(catalogName, productName, attributesMap)

    if (GELATO_SYNC_APPAREL_ONLY && !isApparel) {
        return { include: false, reason: 'non-apparel' }
    }

    if (isApparel && GELATO_SYNC_GARMENT_CUTS_SET.size > 0) {
        const cutSource = attributesMap.garmentcut || attributesMap.garmentgender || ''
        const normalizedCut = cutSource ? normalizeGarmentCut(cutSource) : ''

        if (normalizedCut && !GELATO_SYNC_GARMENT_CUTS_SET.has(normalizedCut)) {
            return { include: false, reason: `garment-cut:${normalizedCut}` }
        }
    }

    return { include: true }
}

async function discoverCatalogUids(): Promise<string[]> {
    const catalogUids: string[] = []
    const seen = new Set<string>()
    let offset = 0

    while (catalogUids.length < GELATO_CATALOG_DISCOVERY_MAX) {
        const payload = await gelato.listCatalogs({
            limit: GELATO_CATALOG_DISCOVERY_LIMIT,
            offset,
        })
        const batch = extractGelatoCatalogUids(payload)

        if (batch.length === 0) {
            break
        }

        let newCount = 0
        for (const uid of batch) {
            if (seen.has(uid)) {
                continue
            }
            seen.add(uid)
            catalogUids.push(uid)
            newCount += 1

            if (catalogUids.length >= GELATO_CATALOG_DISCOVERY_MAX) {
                break
            }
        }

        if (batch.length < GELATO_CATALOG_DISCOVERY_LIMIT || newCount === 0) {
            break
        }

        offset += batch.length
    }

    return catalogUids
}

async function syncCatalog(catalogUid: string): Promise<SyncStats> {
    const catalogPayload = await gelato.getCatalog(catalogUid)
    const catalogName = parseCatalogName(catalogPayload, `Gelato Catalog ${catalogUid}`)

    const productUids: string[] = []
    const seenProductUids = new Set<string>()
    let offset = Math.max(0, GELATO_SYNC_OFFSET)

    while (true) {
        const catalogSearchPayload = await gelato.searchCatalogProducts(catalogUid, {
            limit: GELATO_SYNC_PAGE_LIMIT,
            offset,
        })
        const batch = extractGelatoProductUids(catalogSearchPayload)

        if (batch.length === 0) {
            break
        }

        let newCount = 0
        for (const uid of batch) {
            if (seenProductUids.has(uid)) {
                continue
            }
            seenProductUids.add(uid)
            productUids.push(uid)
            newCount += 1
        }

        if (GELATO_SYNC_MAX_PRODUCTS > 0 && productUids.length >= GELATO_SYNC_MAX_PRODUCTS) {
            productUids.length = GELATO_SYNC_MAX_PRODUCTS
            break
        }

        if (batch.length < GELATO_SYNC_PAGE_LIMIT || newCount === 0) {
            break
        }

        offset += batch.length
    }

    if (productUids.length === 0) {
        console.log(`Catalog ${catalogUid}: no products returned.`)
        return {
            synced: 0,
            skippedNoPrice: 0,
            skippedUnavailable: 0,
            skippedUnprintable: 0,
            skippedDuplicates: 0,
            skippedFiltered: 0,
            skippedNoProducts: 1,
            syncedPrintfulIds: [],
        }
    }

    let synced = 0
    let skippedNoPrice = 0
    let skippedUnavailable = 0
    let skippedUnprintable = 0
    let skippedDuplicates = 0
    let skippedFiltered = 0
    const seenNameKeys = new Set<string>()
    const syncedPrintfulIds: string[] = []

    for (const productUid of productUids) {
        try {
            const productPayload = await gelato.getProduct(productUid)
            const productName = extractGelatoProductName(productPayload) || buildFallbackName(productUid, catalogName)
            const includeDecision = shouldIncludeCatalogProduct(catalogName, productName, productPayload)
            if (!includeDecision.include) {
                skippedFiltered += 1
                console.log(`Skip ${productUid}: filtered (${includeDecision.reason || 'not-matching'}).`)
                continue
            }

            const pricesPayload = await gelato.getProductPrices(productUid, {
                country: GELATO_PRICE_COUNTRY,
                currency: GELATO_PRICE_CURRENCY,
            })

            const isPrintable = extractGelatoIsPrintable(productPayload)
            if (!isPrintable) {
                skippedUnprintable += 1
                console.log(`Skip ${productUid}: product is not printable.`)
                continue
            }

            const basePrice = extractGelatoMinUnitPrice(pricesPayload)
            if (!basePrice || basePrice <= 0) {
                skippedNoPrice += 1
                console.log(`Skip ${productUid}: no unit price found.`)
                continue
            }

            if (GELATO_SYNC_MIN_BASE_PRICE > 0 && basePrice < GELATO_SYNC_MIN_BASE_PRICE) {
                skippedFiltered += 1
                console.log(
                    `Skip ${productUid}: base price ${basePrice.toFixed(2)} below minimum ${GELATO_SYNC_MIN_BASE_PRICE.toFixed(2)}.`
                )
                continue
            }

            const description = extractGelatoProductDescription(productPayload) || productName
            const sizes = extractGelatoProductSizes(productPayload)
            const printfulId = `gelato:${productUid}`
            const category = classifyCategory(`${catalogName} ${productName}`)
            const colorName = extractGelatoColorName(productPayload) || 'Default'
            const dedupeKey = `${catalogUid}:${category}:${normalizeNameKey(productName)}`

            if (GELATO_SYNC_DEDUPE_BY_NAME && seenNameKeys.has(dedupeKey)) {
                skippedDuplicates += 1
                continue
            }
            seenNameKeys.add(dedupeKey)

            const existing = await prisma.product.findUnique({ where: { printfulId } })
            const sellPrice = existing?.sellPrice ?? calcSellPrice(basePrice, GELATO_SELL_PRICE_MULTIPLIER, GELATO_MIN_MARGIN)
            const imageUrl = sanitizeGelatoImageUrl(extractGelatoProductImageUrl(productPayload))

            if (GELATO_SYNC_REQUIRE_IMAGE && !imageUrl) {
                skippedFiltered += 1
                console.log(`Skip ${productUid}: missing product image URL.`)
                continue
            }

            const data = {
                name: `${productName}`,
                printfulId,
                description,
                category,
                basePrice,
                sellPrice,
                sizes,
                colors: buildCuratedColorPayloads([colorName]),
                imageUrl,
                printArea: {
                    width: 4200,
                    height: 4800,
                    dpi: 300,
                    ...parseExistingPrintArea(existing?.printArea),
                    provider: 'gelato',
                    providerCatalogUid: catalogUid,
                    providerProductUid: productUid,
                    printable: isPrintable,
                    variantMapping: extractGelatoVariantMapping(productPayload),
                },
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
            syncedPrintfulIds.push(printfulId)
            console.log(`Synced ${printfulId} (${productName})`)
        } catch (error) {
            if (isSkippableProductError(error)) {
                skippedUnavailable += 1
                const reason = error instanceof Error ? error.message : 'unknown'
                console.log(`Skip ${productUid}: unavailable for sync (${reason}).`)
                continue
            }
            throw error
        }
    }

    return {
        synced,
        skippedNoPrice,
        skippedUnavailable,
        skippedUnprintable,
        skippedDuplicates,
        skippedFiltered,
        skippedNoProducts: 0,
        syncedPrintfulIds,
    }
}

async function buildTemplateIndex(templateMappings: GelatoTemplateMappingEntry[]): Promise<TemplateIndex> {
    const byTemplateId = new Map<string, GelatoTemplateMappingEntry>()
    const byVariantUid = new Map<string, GelatoTemplateMappingEntry>()
    const byTemplateName = new Map<string, GelatoTemplateMappingEntry>()
    const validatedTemplateIds = new Set<string>()
    const templatePlaceholderNames = new Map<string, string>()
    const templateHasPlaceholders = new Set<string>()

    for (const mapping of templateMappings) {
        byTemplateId.set(mapping.templateId, mapping)
        const templateNameKey = normalizeNameKey(mapping.templateName)
        if (templateNameKey && !byTemplateName.has(templateNameKey)) {
            byTemplateName.set(templateNameKey, mapping)
        }

        try {
            const templatePayload = await gelato.getTemplate(mapping.templateId)
            const variantUids = extractGelatoTemplateProductUids(templatePayload)
            validatedTemplateIds.add(mapping.templateId)
            const placeholderName = extractGelatoTemplatePlaceholderName(
                templatePayload,
                mapping.printAreaPlaceholder
            )
            if (placeholderName) {
                templateHasPlaceholders.add(mapping.templateId)
                templatePlaceholderNames.set(mapping.templateId, placeholderName)
            }
            if (variantUids.length === 0) {
                console.log(`Template ${mapping.templateId}: no variant product UIDs returned.`)
                continue
            }
            for (const variantUid of variantUids) {
                if (!byVariantUid.has(variantUid)) {
                    byVariantUid.set(variantUid, mapping)
                }
            }
        } catch (error) {
            if (isSkippableProductError(error)) {
                const reason = error instanceof Error ? error.message : 'unknown'
                console.log(`Template ${mapping.templateId}: unavailable (${reason}).`)
                continue
            }
            throw error
        }
    }

    return {
        byTemplateId,
        byVariantUid,
        byTemplateName,
        validatedTemplateIds,
        templatePlaceholderNames,
        templateHasPlaceholders,
    }
}

async function fetchStoreProducts(storeId: string): Promise<unknown[]> {
    const items: unknown[] = []
    let offset = 0

    while (true) {
        const payload = await gelato.listStoreProducts(storeId, {
            limit: STORE_PRODUCTS_PAGE_LIMIT,
            offset,
            orderBy: 'updatedAt',
            order: 'desc',
        })

        const batch = extractGelatoStoreProducts(payload)
        if (batch.length === 0) {
            break
        }

        items.push(...batch)
        if (batch.length < STORE_PRODUCTS_PAGE_LIMIT) {
            break
        }
        offset += batch.length
    }

    return items
}

async function resolveBasePriceFromVariantUids(variantUids: string[]): Promise<number | null> {
    for (const variantUid of variantUids) {
        try {
            const pricesPayload = await gelato.getProductPrices(variantUid, {
                country: GELATO_PRICE_COUNTRY,
                currency: GELATO_PRICE_CURRENCY,
            })
            const basePrice = extractGelatoMinUnitPrice(pricesPayload)
            if (basePrice && basePrice > 0) {
                return basePrice
            }
        } catch (error) {
            if (!isSkippableProductError(error)) {
                throw error
            }
        }
    }

    return null
}

function buildTemplatePrintfulId(templateId: string): string {
    return `gelato:template:${templateId}`
}

async function syncStoreTemplates(
    storeId: string,
    templateMappings: GelatoTemplateMappingEntry[]
): Promise<SyncStats> {
    const templateIndex = await buildTemplateIndex(templateMappings)
    const storeProducts = await fetchStoreProducts(storeId)

    if (storeProducts.length === 0) {
        console.log(`Store ${storeId}: no products returned.`)
        return {
            synced: 0,
            skippedNoPrice: 0,
            skippedUnavailable: 0,
            skippedUnprintable: 0,
            skippedDuplicates: 0,
            skippedFiltered: 0,
            skippedNoProducts: 1,
            syncedPrintfulIds: [],
        }
    }

    let synced = 0
    let skippedNoPrice = 0
    let skippedUnavailable = 0
    let skippedDuplicates = 0
    let skippedFiltered = 0
    const syncedPrintfulIds: string[] = []
    const syncedTemplateIds = new Set<string>()

    for (const storeProduct of storeProducts) {
        const variantUids = extractGelatoStoreProductVariantUids(storeProduct)
        const storeProductName = extractGelatoStoreProductName(storeProduct) || ''
        const storeProductNameKey = normalizeNameKey(storeProductName)
        const matchedMappings = variantUids
            .map((uid) => templateIndex.byVariantUid.get(uid))
            .filter((mapping): mapping is GelatoTemplateMappingEntry => Boolean(mapping))

        const templateMapping =
            matchedMappings[0] || (storeProductNameKey ? templateIndex.byTemplateName.get(storeProductNameKey) : undefined)
        if (!templateMapping) {
            continue
        }

        if (syncedTemplateIds.has(templateMapping.templateId)) {
            skippedDuplicates += 1
            continue
        }

        const printfulId = buildTemplatePrintfulId(templateMapping.templateId)
        const productName =
            storeProductName ||
            templateMapping.templateName ||
            `Gelato Template ${templateMapping.templateId}`
        const description = extractGelatoStoreProductDescription(storeProduct) || productName
        const imageUrl = sanitizeGelatoImageUrl(extractGelatoStoreProductImageUrl(storeProduct))
        const sizes = extractGelatoStoreProductSizes(storeProduct)
        const colorNames = extractGelatoStoreProductColorNames(storeProduct)
        const colorPreviewMap = extractGelatoStoreProductColorPreviewMap(storeProduct)
        const category = classifyCategoryByProductType(
            templateMapping.productType,
            `${templateMapping.productType} ${productName}`
        )

        const basePrice = await resolveBasePriceFromVariantUids(variantUids)
        if (!basePrice || basePrice <= 0) {
            skippedNoPrice += 1
            console.log(`Skip ${templateMapping.templateId}: no unit price found from mapped variants.`)
            continue
        }

        if (GELATO_SYNC_REQUIRE_IMAGE && !imageUrl) {
            skippedFiltered += 1
            console.log(`Skip ${templateMapping.templateId}: missing product image URL.`)
            continue
        }

        const existing = await prisma.product.findUnique({ where: { printfulId } })
        const sellPrice =
            existing?.sellPrice ?? calcSellPrice(basePrice, GELATO_SELL_PRICE_MULTIPLIER, GELATO_MIN_MARGIN)
        const storeProductUid = extractGelatoStoreProductUid(storeProduct) || templateMapping.templateId
        const storeTemplateId = extractGelatoStoreProductTemplateId(storeProduct)
        const resolvedTemplateId = storeTemplateId || templateMapping.templateId
        const templateValidated = templateIndex.validatedTemplateIds.has(resolvedTemplateId)
        const templateHasPlaceholders = templateIndex.templateHasPlaceholders.has(resolvedTemplateId)
        const templatePlaceholderName = templateIndex.templatePlaceholderNames.get(resolvedTemplateId) || null

        if (!templateValidated) {
            console.log(
                `Template ${resolvedTemplateId}: not validated by /v1/templates lookup; store-product title fallback used for ${productName}.`
            )
        }
        if (templateValidated && !templateHasPlaceholders) {
            console.log(`Template ${resolvedTemplateId}: validated but has no image placeholders.`)
        }

        const data = {
            name: productName,
            printfulId,
            description,
            category,
            basePrice,
            sellPrice,
            sizes: sizes.length > 0 ? sizes : ['Default'],
            colors: buildCuratedColorPayloads(colorNames, { previewByName: colorPreviewMap }),
            imageUrl,
            printArea: {
                width: 4200,
                height: 4800,
                dpi: 300,
                ...parseExistingPrintArea(existing?.printArea),
                provider: 'gelato',
                providerStoreId: storeId,
                providerStoreProductUid: storeProductUid,
                providerTemplateId: resolvedTemplateId,
                providerTemplateName: templateMapping.templateName,
                providerTemplateProductType: templateMapping.productType,
                providerPrintAreaPlaceholder: templateMapping.printAreaPlaceholder,
                providerTemplateValidated: templateValidated,
                providerTemplateHasPlaceholders: templateHasPlaceholders,
                providerTemplatePlaceholderName: templatePlaceholderName,
                printable: true,
                variantMapping: extractGelatoStoreVariantMapping(storeProduct),
            },
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
        syncedPrintfulIds.push(printfulId)
        syncedTemplateIds.add(templateMapping.templateId)
        console.log(`Synced ${printfulId} (${productName})`)
    }

    for (const mapping of Array.from(templateIndex.byTemplateId.values())) {
        if (!syncedTemplateIds.has(mapping.templateId)) {
            skippedUnavailable += 1
            console.log(`Template ${mapping.templateId}: no matching store product found yet.`)
        }
    }

    return {
        synced,
        skippedNoPrice,
        skippedUnavailable,
        skippedUnprintable: 0,
        skippedDuplicates,
        skippedFiltered,
        skippedNoProducts: 0,
        syncedPrintfulIds,
    }
}

async function deactivateMissingSyncedProducts(syncedPrintfulIds: Set<string>): Promise<number> {
    if (GELATO_SYNC_DRY_RUN || !GELATO_SYNC_DEACTIVATE_MISSING || syncedPrintfulIds.size === 0) {
        return 0
    }

    const result = await prisma.product.updateMany({
        where: {
            active: true,
            printfulId: {
                startsWith: 'gelato:',
                notIn: Array.from(syncedPrintfulIds),
            },
        },
        data: {
            active: false,
        },
    })

    return result.count
}

async function main() {
    console.log('Starting Gelato product sync...')
    console.log(
        `Config: mode=${GELATO_SYNC_MODE} pageLimit=${GELATO_SYNC_PAGE_LIMIT} offset=${GELATO_SYNC_OFFSET} maxProducts=${GELATO_SYNC_MAX_PRODUCTS || 'all'} country=${GELATO_PRICE_COUNTRY} currency=${GELATO_PRICE_CURRENCY} dedupeByName=${GELATO_SYNC_DEDUPE_BY_NAME} deactivateMissing=${GELATO_SYNC_DEACTIVATE_MISSING} dryRun=${GELATO_SYNC_DRY_RUN} apparelOnly=${GELATO_SYNC_APPAREL_ONLY} cuts=${GELATO_SYNC_GARMENT_CUTS.join('|') || 'all'} autoDiscoverCatalogs=${GELATO_SYNC_CATALOG_AUTO_DISCOVER} requireImage=${GELATO_SYNC_REQUIRE_IMAGE} minBasePrice=${GELATO_SYNC_MIN_BASE_PRICE} includeKeywords=${GELATO_SYNC_INCLUDE_KEYWORDS.join('|') || 'none'} excludeKeywords=${GELATO_SYNC_EXCLUDE_KEYWORDS.join('|') || 'none'}`
    )

    let totalSynced = 0
    let totalSkippedNoPrice = 0
    let totalSkippedUnavailable = 0
    let totalSkippedUnprintable = 0
    let totalSkippedDuplicates = 0
    let totalSkippedFiltered = 0
    let totalCatalogsWithoutProducts = 0
    const syncedPrintfulIds = new Set<string>()

    const mergeStats = (stats: SyncStats) => {
        totalSynced += stats.synced
        totalSkippedNoPrice += stats.skippedNoPrice
        totalSkippedUnavailable += stats.skippedUnavailable
        totalSkippedUnprintable += stats.skippedUnprintable
        totalSkippedDuplicates += stats.skippedDuplicates
        totalSkippedFiltered += stats.skippedFiltered
        totalCatalogsWithoutProducts += stats.skippedNoProducts
        for (const printfulId of stats.syncedPrintfulIds) {
            syncedPrintfulIds.add(printfulId)
        }
    }

    const shouldRunStoreTemplates = GELATO_SYNC_MODE === 'store-templates' || GELATO_SYNC_MODE === 'hybrid'
    const shouldRunCatalogs = GELATO_SYNC_MODE === 'catalog' || GELATO_SYNC_MODE === 'hybrid'

    if (!shouldRunStoreTemplates && !shouldRunCatalogs) {
        throw new Error(`Unsupported GELATO_SYNC_MODE: ${GELATO_SYNC_MODE}`)
    }

    if (shouldRunStoreTemplates) {
        const storeId = resolveGelatoStoreId()
        const templateMappings = resolveGelatoTemplateMappings()
        console.log(`Store mode: storeId=${storeId} templates=${templateMappings.length}`)

        const stats = await syncStoreTemplates(storeId, templateMappings)
        mergeStats(stats)
    }

    if (shouldRunCatalogs) {
        let catalogUids = rawCatalogUids
        if (catalogUids.length === 0 && GELATO_SYNC_CATALOG_AUTO_DISCOVER) {
            console.log(
                `Catalog mode: auto-discovering catalog UIDs (limit=${GELATO_CATALOG_DISCOVERY_LIMIT}, max=${GELATO_CATALOG_DISCOVERY_MAX})`
            )
            catalogUids = await discoverCatalogUids()
        }

        if (catalogUids.length === 0) {
            throw new Error(
                'GELATO_CATALOG_UIDS is required when no catalogs are auto-discovered. Set GELATO_CATALOG_UIDS or enable GELATO_SYNC_CATALOG_AUTO_DISCOVER=1.'
            )
        }

        console.log(`Catalog mode: ${catalogUids.join(', ')}`)
        for (const catalogUid of catalogUids) {
            const stats = await syncCatalog(catalogUid)
            mergeStats(stats)
        }
    }

    const deactivated = await deactivateMissingSyncedProducts(syncedPrintfulIds)

    console.log(
        `Gelato sync completed. synced=${totalSynced} skippedNoPrice=${totalSkippedNoPrice} skippedUnavailable=${totalSkippedUnavailable} skippedUnprintable=${totalSkippedUnprintable} skippedDuplicates=${totalSkippedDuplicates} skippedFiltered=${totalSkippedFiltered} emptyCatalogs=${totalCatalogsWithoutProducts} deactivated=${deactivated}`
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
