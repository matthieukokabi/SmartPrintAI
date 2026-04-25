const DEFAULT_GOOTEN_BASE_URL = 'https://api.print.io/api'
const GOOTEN_CATALOG_URL = 'https://gtnadminassets.blob.core.windows.net/productdatav3/catalog.json'
const GOOTEN_RELIABLE_MEDIA_HOSTS = new Set(['appassets.azureedge.net'])
const GOOTEN_RELIABLE_MEDIA_HOST_SUFFIXES = ['.cdn.gooten.com']
const GOOTEN_IMAGE_PATH_PATTERN = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i

type RequestOptions = {
    method?: 'GET' | 'POST'
    body?: unknown
}

type GootenVariantMapping = {
    defaultSku: string | null
    variantMapping: Record<string, string>
    colors: string[]
    sizes: string[]
    colorPreviewUrls: Record<string, string>
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
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
        const normalized = value.replace(/[^0-9.,-]/g, '').replace(/,/g, '')
        const parsed = Number(normalized)
        if (Number.isFinite(parsed)) {
            return parsed
        }
    }
    return null
}

function pickString(record: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
        const candidate = asString(record[key])
        if (candidate) {
            return candidate
        }
    }
    return null
}

function normalizeMatchKey(value: string): string {
    return value.trim().toLowerCase()
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
    const seen = new Set<string>()
    const out: string[] = []

    for (const value of values) {
        const normalized = asString(value)
        if (!normalized) continue
        if (seen.has(normalized.toLowerCase())) continue
        seen.add(normalized.toLowerCase())
        out.push(normalized)
    }

    return out
}

function isReliableGootenMediaHost(hostname: string): boolean {
    const normalized = hostname.trim().toLowerCase()
    if (GOOTEN_RELIABLE_MEDIA_HOSTS.has(normalized)) {
        return true
    }
    return GOOTEN_RELIABLE_MEDIA_HOST_SUFFIXES.some((suffix) => normalized.endsWith(suffix))
}

function sanitizeGootenImageUrl(value: unknown, options: { requireReliableHost?: boolean } = {}): string | null {
    const raw = asString(value)
    if (!raw) {
        return null
    }

    let candidate = raw
    const normalized = raw.toLowerCase()
    const nestedProtocolIndexes = [normalized.indexOf('https://', 8), normalized.indexOf('http://', 8)].filter(
        (index) => index > -1
    )
    if (nestedProtocolIndexes.length > 0) {
        candidate = raw.slice(Math.min(...nestedProtocolIndexes))
    }

    let parsed: URL
    try {
        parsed = new URL(candidate)
    } catch {
        return null
    }

    if (!/^https?:$/.test(parsed.protocol)) {
        return null
    }

    if (options.requireReliableHost && !isReliableGootenMediaHost(parsed.hostname)) {
        return null
    }

    const pathLower = parsed.pathname.toLowerCase()
    if (options.requireReliableHost && !/\.(jpe?g|png|gif|webp|svg|avif)$/.test(pathLower)) {
        return null
    }

    if (!GOOTEN_IMAGE_PATH_PATTERN.test(parsed.pathname)) {
        return null
    }

    return parsed.toString()
}

export class GootenClient {
    private readonly baseUrl: string
    private readonly recipeId: string
    private readonly partnerBillingKey?: string

    constructor(recipeId: string, partnerBillingKey?: string, baseUrl = DEFAULT_GOOTEN_BASE_URL) {
        const normalizedRecipeId = recipeId.trim()
        if (!normalizedRecipeId) {
            throw new Error('GOOTEN_RECIPE_ID is required')
        }

        this.baseUrl = baseUrl.replace(/\/+$/, '')
        this.recipeId = normalizedRecipeId
        this.partnerBillingKey = partnerBillingKey?.trim() || undefined
    }

    private buildUrl(path: string): URL {
        const url = new URL(`${this.baseUrl}${path}`)
        url.searchParams.set('recipeId', this.recipeId)
        if (this.partnerBillingKey) {
            url.searchParams.set('partnerBillingKey', this.partnerBillingKey)
        }
        return url
    }

    private async request(path: string, options: RequestOptions = {}): Promise<unknown> {
        const method = options.method || 'GET'
        const url = this.buildUrl(path)

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            ...(options.body ? { body: JSON.stringify(options.body) } : {}),
        })

        const raw = await response.text()
        let parsed: unknown
        try {
            parsed = JSON.parse(raw)
        } catch {
            throw new Error(`Gooten API invalid JSON for ${path}`)
        }

        if (!response.ok) {
            const message =
                (isObject(parsed) && asString(parsed.Message)) ||
                (isObject(parsed) && asString(parsed.message)) ||
                raw
            throw new Error(`Gooten API error ${response.status} for ${path}: ${message}`)
        }

        return parsed
    }

    async listProducts(): Promise<unknown> {
        try {
            return await this.request('/v/201608/products/')
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            // Some partner accounts receive 405/500 on legacy /products listing.
            // Fall back to Gooten's public catalog feed and keep variant/preview calls on API.
            if (!/Gooten API error (405|500)/.test(message)) {
                throw error
            }
            return this.requestCatalogFeed()
        }
    }

    async createProductPreview(payload: unknown): Promise<unknown> {
        return this.request('/v/201608/productpreview/', {
            method: 'POST',
            body: payload,
        })
    }

    async listProductVariants(productId: string, countryCode = 'US', currencyCode = 'USD'): Promise<unknown> {
        const normalizedProductId = productId.trim()
        if (!normalizedProductId) {
            throw new Error('Gooten productId is required for variant lookup')
        }
        const normalizedCountryCode = countryCode.trim().toUpperCase() || 'US'
        const normalizedCurrencyCode = currencyCode.trim().toUpperCase() || 'USD'

        return this.request(
            `/v/201608/productvariants/?productId=${encodeURIComponent(normalizedProductId)}&countryCode=${encodeURIComponent(normalizedCountryCode)}&currencyCode=${encodeURIComponent(normalizedCurrencyCode)}`
        )
    }

    async createOrder(payload: unknown): Promise<unknown> {
        return this.request('/v/201608/orders/', {
            method: 'POST',
            body: payload,
        })
    }

    /**
     * Retrieve a Gooten order by its full id (the value Gooten returned
     * from createOrder, in the form "<recipeId>-<orderUuid>").
     * Returns the parsed JSON or throws on non-2xx.
     * Tested against the V1 API endpoint:
     *   GET /v/201608/orders/<orderId>?recipeid=…&partnerBillingKey=…
     */
    async getOrder(orderId: string): Promise<unknown> {
        return this.request(`/v/201608/orders/${encodeURIComponent(orderId)}`, {
            method: 'GET',
        })
    }

    private async requestCatalogFeed(): Promise<unknown> {
        const response = await fetch(GOOTEN_CATALOG_URL)
        const raw = await response.text()
        let parsed: unknown
        try {
            parsed = JSON.parse(raw)
        } catch {
            throw new Error('Gooten catalog feed returned invalid JSON')
        }
        if (!response.ok) {
            throw new Error(`Gooten catalog feed error ${response.status}`)
        }
        return parsed
    }
}

function flattenCatalogTree(items: unknown[], categoryHint: string | null = null): unknown[] {
    const out: unknown[] = []

    for (const item of items) {
        if (!isObject(item)) continue

        const itemCategory = pickString(item, ['Category', 'category', 'name']) || categoryHint
        const productId =
            pickString(item, ['product_id', 'ProductId', 'productId', 'id', 'Id']) ||
            (() => {
                const parsed = asNumber(item.product_id)
                return parsed !== null ? String(parsed) : null
            })()

        const childCollections = [item.items, item.Items]
        for (const child of childCollections) {
            if (Array.isArray(child)) {
                out.push(...flattenCatalogTree(child, itemCategory))
            }
        }

        if (!productId) {
            continue
        }

        const normalized = {
            ...item,
            ProductId: productId,
            Category: pickString(item, ['Category', 'category']) || itemCategory || 'catalog',
            ImageUrl:
                pickString(item, ['ImageUrl', 'imageUrl', 'ThumbnailUrl', 'thumbnailUrl', 'url', 'Url']) || null,
            MinPrice:
                asNumber(item.cheapest_price) ??
                asNumber(item.MinPrice) ??
                asNumber(item.minPrice) ??
                asNumber(item.Price) ??
                asNumber(item.price),
        }
        out.push(normalized)
    }

    return out
}

export function extractGootenProducts(payload: unknown): unknown[] {
    if (!isObject(payload)) {
        return []
    }

    const directCandidates = [payload.Products, payload.products, payload.items, payload.data]
    for (const candidate of directCandidates) {
        if (Array.isArray(candidate)) {
            return candidate
        }
    }

    if (isObject(payload.Result)) {
        const nested = payload.Result
        const nestedCandidates = [nested.Products, nested.products, nested.items, nested.data]
        for (const candidate of nestedCandidates) {
            if (Array.isArray(candidate)) {
                return candidate
            }
        }
    }

    if (Array.isArray(payload['product-catalog'])) {
        return flattenCatalogTree(payload['product-catalog'])
    }

    return []
}

export function extractGootenVariants(payload: unknown): unknown[] {
    if (!isObject(payload)) {
        return []
    }

    const directCandidates = [
        payload.ProductVariants,
        payload.productVariants,
        payload.Variants,
        payload.variants,
        payload.Items,
        payload.items,
        payload.data,
    ]
    for (const candidate of directCandidates) {
        if (Array.isArray(candidate)) {
            return candidate
        }
    }

    if (isObject(payload.Result)) {
        const nested = payload.Result
        const nestedCandidates = [
            nested.ProductVariants,
            nested.productVariants,
            nested.Variants,
            nested.variants,
            nested.Items,
            nested.items,
            nested.data,
        ]
        for (const candidate of nestedCandidates) {
            if (Array.isArray(candidate)) {
                return candidate
            }
        }
    }

    return []
}

export function extractGootenProductId(productPayload: unknown): string | null {
    if (!isObject(productPayload)) return null
    return pickString(productPayload, ['Sku', 'SKU', 'ProductId', 'productId', 'product_id', 'Id', 'id'])
}

function extractGootenVariantSku(variantPayload: unknown): string | null {
    if (!isObject(variantPayload)) return null
    return pickString(variantPayload, [
        'Sku',
        'SKU',
        'ProductId',
        'productId',
        'ProductVariantId',
        'productVariantId',
        'Id',
        'id',
    ])
}

function extractOptionValueByKeyword(variantPayload: unknown, keyword: string): string | null {
    if (!isObject(variantPayload)) {
        return null
    }

    const optionCandidates = [
        variantPayload.Options,
        variantPayload.options,
        variantPayload.Attributes,
        variantPayload.attributes,
    ]

    for (const candidate of optionCandidates) {
        if (!Array.isArray(candidate)) continue
        for (const option of candidate) {
            if (!isObject(option)) continue
            const optionName = pickString(option, ['Name', 'name', 'OptionName', 'optionName', 'Attribute']) || ''
            if (!optionName.toLowerCase().includes(keyword)) continue
            const optionValue = pickString(option, ['Value', 'value', 'Code', 'code', 'Name', 'name'])
            if (optionValue) {
                return optionValue
            }
        }
    }

    return null
}

function extractGootenVariantColor(variantPayload: unknown): string | null {
    if (!isObject(variantPayload)) return null
    return (
        pickString(variantPayload, ['Color', 'color', 'ColorName', 'colorName', 'Colour', 'colour']) ||
        extractOptionValueByKeyword(variantPayload, 'color')
    )
}

function extractGootenVariantSize(variantPayload: unknown): string | null {
    if (!isObject(variantPayload)) return null
    return (
        pickString(variantPayload, ['Size', 'size', 'SizeName', 'sizeName']) ||
        extractOptionValueByKeyword(variantPayload, 'size')
    )
}

function mapUniqueRecordKey(mapping: Record<string, string>, key: string, sku: string): void {
    const normalizedKey = normalizeMatchKey(key)
    if (!normalizedKey) return
    if (!mapping[normalizedKey]) {
        mapping[normalizedKey] = sku
    }
}

function extractGootenColorOptionImageUrl(variant: unknown): string | null {
    if (!variant || typeof variant !== "object") return null
    const options = (variant as Record<string, unknown>).Options || (variant as Record<string, unknown>).options
    if (!Array.isArray(options)) return null
    for (const opt of options) {
        if (!opt || typeof opt !== "object") continue
        const name = ((opt as Record<string, unknown>).Name || (opt as Record<string, unknown>).name || "") as string
        if (name.toLowerCase() === "color") {
            const url = ((opt as Record<string, unknown>).ImageUrl || (opt as Record<string, unknown>).imageUrl || "") as string
            if (url.trim()) return url.trim()
        }
    }
    return null
}

export function extractGootenVariantMapping(payload: unknown): GootenVariantMapping {
    const variants = extractGootenVariants(payload)
    const mapping: Record<string, string> = {}
    const colors: string[] = []
    const sizes: string[] = []
    const colorPreviewUrls: Record<string, string> = {}
    let defaultSku: string | null = null

    for (const variant of variants) {
        const sku = extractGootenVariantSku(variant)
        if (!sku) continue

        if (!defaultSku) {
            defaultSku = sku
        }

        const color = extractGootenVariantColor(variant)
        const size = extractGootenVariantSize(variant)
        const variantPreviewUrl = sanitizeGootenImageUrl(extractGootenPreviewUrl(variant), { requireReliableHost: true })
        const colorOptionImageUrl = extractGootenColorOptionImageUrl(variant)
        const previewImageUrl = variantPreviewUrl || sanitizeGootenImageUrl(colorOptionImageUrl, { requireReliableHost: true })

        if (color) {
            mapUniqueRecordKey(mapping, color, sku)
            if (!colors.some((value) => normalizeMatchKey(value) === normalizeMatchKey(color))) {
                colors.push(color)
            }
            const normalizedColor = normalizeMatchKey(color)
            if (!colorPreviewUrls[normalizedColor] && previewImageUrl) {
                colorPreviewUrls[normalizedColor] = previewImageUrl
            }
        }

        if (size) {
            mapUniqueRecordKey(mapping, size, sku)
            if (!sizes.some((value) => normalizeMatchKey(value) === normalizeMatchKey(size))) {
                sizes.push(size)
            }
        }

        if (color && size) {
            mapUniqueRecordKey(mapping, `${size}:${color}`, sku)
        }
    }

    return {
        defaultSku,
        variantMapping: mapping,
        colors,
        sizes,
        colorPreviewUrls,
    }
}

export function extractGootenProductName(productPayload: unknown): string | null {
    if (!isObject(productPayload)) return null
    return pickString(productPayload, ['Name', 'name', 'ProductName', 'productName', 'Title', 'title'])
}

export function extractGootenProductDescription(productPayload: unknown): string | null {
    if (!isObject(productPayload)) return null
    return pickString(productPayload, ['Description', 'description', 'ShortDescription', 'summary'])
}

export function extractGootenProductCategory(productPayload: unknown): string | null {
    if (!isObject(productPayload)) return null
    return pickString(productPayload, ['Category', 'category', 'ProductCategory', 'Department', 'type'])
}

export function extractGootenModelImageUrl(variantsPayload: unknown): string | null {
    const variants = extractGootenVariants(variantsPayload)
    for (const variant of variants) {
        if (!isObject(variant)) continue
        const options = (variant as Record<string, unknown>).Options || (variant as Record<string, unknown>).options
        if (!Array.isArray(options)) continue
        for (const opt of options) {
            if (!isObject(opt)) continue
            const name = ((opt as Record<string, unknown>).Name || (opt as Record<string, unknown>).name || "") as string
            if (name === "Model") {
                const url = sanitizeGootenImageUrl(
                    ((opt as Record<string, unknown>).ImageUrl || (opt as Record<string, unknown>).imageUrl || "") as string,
                    { requireReliableHost: true }
                )
                if (url) return url
            }
        }
    }
    return null
}

export function extractGootenProductImageUrl(productPayload: unknown): string | null {
    if (!isObject(productPayload)) return null

    const direct = sanitizeGootenImageUrl(
        pickString(productPayload, [
            'ImageUrl',
            'imageUrl',
            'ThumbnailUrl',
            'thumbnailUrl',
            'PreviewUrl',
            'previewUrl',
            'url',
        ]),
        { requireReliableHost: true }
    )
    if (direct) {
        return direct
    }

    const arrayCandidates = [productPayload.Images, productPayload.images, productPayload.Thumbnails, productPayload.Media]
    for (const candidate of arrayCandidates) {
        if (!Array.isArray(candidate)) continue
        for (const item of candidate) {
            if (!isObject(item)) continue
            const nested = sanitizeGootenImageUrl(
                pickString(item, ['Url', 'url', 'ImageUrl', 'imageUrl', 'ThumbnailUrl', 'thumbnailUrl']),
                { requireReliableHost: true }
            )
            if (nested) {
                return nested
            }
        }
    }

    return null
}

export function extractGootenPreviewUrl(payload: unknown): string | null {
    if (!isObject(payload)) {
        return null
    }

    const direct = sanitizeGootenImageUrl(
        pickString(payload, ['Url', 'url', 'ImageUrl', 'imageUrl', 'PreviewUrl', 'previewUrl'])
    )
    if (direct) {
        return direct
    }

    const imageCandidates = [payload.Images, payload.images]
    for (const candidate of imageCandidates) {
        if (!Array.isArray(candidate)) continue
        for (const image of candidate) {
            if (!isObject(image)) continue
            const imageUrl = sanitizeGootenImageUrl(pickString(image, ['Url', 'url', 'ImageUrl', 'imageUrl']))
            if (imageUrl) {
                return imageUrl
            }
        }
    }

    if (isObject(payload.Result)) {
        return extractGootenPreviewUrl(payload.Result)
    }

    return null
}

export function extractGootenSpaceIdOptionsFromError(error: unknown): string[] {
    const message =
        error instanceof Error
            ? error.message
            : typeof error === 'string'
                ? error
                : isObject(error)
                    ? JSON.stringify(error)
                    : ''

    if (!message) {
        return []
    }

    const options = new Set<string>()
    const validOptionPattern = /Valid options are\s+([A-Za-z0-9\s,]+)/gi
    const errorEntryPattern = /"PropertyName":"([^"]+)","ErrorMessage":"([^"]+)"/g

    const collectOptions = (source: string) => {
        let match = validOptionPattern.exec(source)
        while (match) {
            const group = match[1] || ''
            for (const raw of group.split(',')) {
                const candidate = raw.trim().toUpperCase()
                if (/^[A-Z0-9]{3,}$/.test(candidate)) {
                    options.add(candidate)
                }
            }
            match = validOptionPattern.exec(source)
        }
    }

    let entryMatch = errorEntryPattern.exec(message)
    while (entryMatch) {
        const propertyName = (entryMatch[1] || '').trim()
        const errorMessage = entryMatch[2] || ''
        if (/spaceid/i.test(propertyName)) {
            collectOptions(errorMessage)
        }
        entryMatch = errorEntryPattern.exec(message)
    }

    if (options.size === 0 && /spaceid/i.test(message)) {
        collectOptions(message)
    }

    return Array.from(options)
}

export function extractGootenLayerIdOptionsFromError(error: unknown): string[] {
    const message =
        error instanceof Error
            ? error.message
            : typeof error === 'string'
                ? error
                : isObject(error)
                    ? JSON.stringify(error)
                    : ''

    if (!message) {
        return []
    }

    const options = new Set<string>()
    const validOptionPattern = /Valid options are\s+([A-Za-z0-9\s,]+)/gi
    const errorEntryPattern = /"PropertyName":"([^"]+)","ErrorMessage":"([^"]+)"/g

    const collectOptions = (source: string) => {
        let match = validOptionPattern.exec(source)
        while (match) {
            const group = match[1] || ''
            for (const raw of group.split(',')) {
                const candidate = raw.trim().toUpperCase()
                if (/^[A-Z0-9]{3,}$/.test(candidate)) {
                    options.add(candidate)
                }
            }
            match = validOptionPattern.exec(source)
        }
    }

    let entryMatch = errorEntryPattern.exec(message)
    while (entryMatch) {
        const propertyName = (entryMatch[1] || '').trim()
        const errorMessage = entryMatch[2] || ''
        if (/layerid/i.test(propertyName)) {
            collectOptions(errorMessage)
        }
        entryMatch = errorEntryPattern.exec(message)
    }

    if (options.size === 0 && /layerid/i.test(message)) {
        collectOptions(message)
    }

    return Array.from(options)
}

let cachedClient: GootenClient | null = null
let cachedClientKey = ''

export function getGootenClient(): GootenClient {
    const recipeId = (process.env.GOOTEN_RECIPE_ID || '').trim()
    if (!recipeId) {
        throw new Error('GOOTEN_RECIPE_ID is required')
    }

    const partnerBillingKey = (process.env.GOOTEN_PARTNER_BILLING_KEY || '').trim() || undefined
    const apiBaseUrl = (process.env.GOOTEN_API_BASE_URL || DEFAULT_GOOTEN_BASE_URL).trim()
    const cacheKey = `${recipeId}::${partnerBillingKey || ''}::${apiBaseUrl}`

    if (cachedClient && cachedClientKey === cacheKey) {
        return cachedClient
    }

    cachedClient = new GootenClient(recipeId, partnerBillingKey, apiBaseUrl)
    cachedClientKey = cacheKey
    return cachedClient
}

function collectOptionValuesByName(productPayload: unknown, keyword: string): string[] {
    if (!isObject(productPayload)) {
        return []
    }

    const optionsCandidates = [productPayload.Options, productPayload.options, productPayload.ProductOptions]
    const values: string[] = []

    for (const candidate of optionsCandidates) {
        if (!Array.isArray(candidate)) continue
        for (const option of candidate) {
            if (!isObject(option)) continue
            const optionName = pickString(option, ['Name', 'name', 'OptionName', 'optionName']) || ''
            if (!optionName.toLowerCase().includes(keyword)) {
                continue
            }

            const optionValues = option.Values || option.values
            if (Array.isArray(optionValues)) {
                for (const optionValue of optionValues) {
                    if (isObject(optionValue)) {
                        values.push(
                            pickString(optionValue, ['Name', 'name', 'Value', 'value', 'Code', 'code']) || ''
                        )
                        continue
                    }
                    values.push(asString(optionValue) || '')
                }
            }
        }
    }

    return uniqueStrings(values)
}

export function extractGootenProductSizes(productPayload: unknown): string[] {
    const fromOptions = collectOptionValuesByName(productPayload, 'size')
    if (fromOptions.length > 0) {
        return fromOptions
    }
    return ['One Size']
}

export function extractGootenProductColorNames(productPayload: unknown): string[] {
    const fromOptions = collectOptionValuesByName(productPayload, 'color')
    if (fromOptions.length > 0) {
        return fromOptions
    }
    return ['Default']
}

export function extractGootenMinPrice(productPayload: unknown): number | null {
    if (!isObject(productPayload)) {
        return null
    }

    const directNumericKeys = [
        'MinPrice',
        'minPrice',
        'LowestPrice',
        'lowestPrice',
        'BasePrice',
        'basePrice',
        'Price',
        'price',
        'UnitPrice',
        'unitPrice',
        'cheapest_price',
        'cheapestPrice',
    ]

    const prices: number[] = []
    for (const key of directNumericKeys) {
        const parsed = asNumber(productPayload[key])
        if (parsed && parsed > 0) {
            prices.push(parsed)
        }
    }

    const variantCandidates = [productPayload.Variants, productPayload.variants]
    for (const candidate of variantCandidates) {
        if (!Array.isArray(candidate)) continue
        for (const variant of candidate) {
            if (!isObject(variant)) continue
            for (const key of directNumericKeys) {
                const parsed = asNumber(variant[key])
                if (parsed && parsed > 0) {
                    prices.push(parsed)
                }
            }
        }
    }

    if (prices.length === 0) {
        return null
    }

    return Math.min(...prices)
}
