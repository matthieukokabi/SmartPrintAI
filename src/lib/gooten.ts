const DEFAULT_GOOTEN_BASE_URL = 'https://api.print.io/api'

type RequestOptions = {
    method?: 'GET' | 'POST'
    body?: unknown
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
        const parsed = Number(value)
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

function isHttpUrl(value: unknown): value is string {
    return typeof value === 'string' && /^https?:\/\//i.test(value.trim())
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
        return this.request('/v/201608/products/')
    }

    async createProductPreview(payload: unknown): Promise<unknown> {
        return this.request('/v/201608/productpreview/', {
            method: 'POST',
            body: payload,
        })
    }

    async createOrder(payload: unknown): Promise<unknown> {
        return this.request('/v/201608/orders/', {
            method: 'POST',
            body: payload,
        })
    }
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

    return []
}

export function extractGootenProductId(productPayload: unknown): string | null {
    if (!isObject(productPayload)) return null
    return pickString(productPayload, ['Sku', 'SKU', 'ProductId', 'productId', 'Id', 'id'])
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
    return pickString(productPayload, ['Category', 'category', 'ProductCategory', 'Department'])
}

export function extractGootenProductImageUrl(productPayload: unknown): string | null {
    if (!isObject(productPayload)) return null

    const direct = pickString(productPayload, [
        'ImageUrl',
        'imageUrl',
        'ThumbnailUrl',
        'thumbnailUrl',
        'PreviewUrl',
        'previewUrl',
    ])
    if (isHttpUrl(direct)) {
        return direct
    }

    const arrayCandidates = [productPayload.Images, productPayload.images, productPayload.Thumbnails, productPayload.Media]
    for (const candidate of arrayCandidates) {
        if (!Array.isArray(candidate)) continue
        for (const item of candidate) {
            if (!isObject(item)) continue
            const nested = pickString(item, ['Url', 'url', 'ImageUrl', 'imageUrl', 'ThumbnailUrl', 'thumbnailUrl'])
            if (isHttpUrl(nested)) {
                return nested
            }
        }
    }

    return null
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
