const DEFAULT_GELATO_PRODUCTS_BASE_URL = 'https://product.gelatoapis.com'

type RequestOptions = {
    method?: 'GET' | 'POST'
    body?: unknown
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null
    }
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
}

function asFiniteNumber(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return null
    }
    return value
}

function pickString(record: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
        const value = asNonEmptyString(record[key])
        if (value) {
            return value
        }
    }
    return null
}

function collectStrings(values: unknown[]): string[] {
    const seen = new Set<string>()
    const out: string[] = []

    for (const value of values) {
        const normalized = asNonEmptyString(value)
        if (!normalized || seen.has(normalized)) {
            continue
        }
        seen.add(normalized)
        out.push(normalized)
    }

    return out
}

export function extractGelatoProductUids(searchPayload: unknown): string[] {
    if (!isObject(searchPayload)) {
        return []
    }

    const listCandidates = [
        searchPayload.products,
        searchPayload.items,
        searchPayload.results,
        searchPayload.catalogProducts,
    ]

    for (const candidate of listCandidates) {
        if (!Array.isArray(candidate)) {
            continue
        }

        const uids = candidate
            .map((entry) => {
                if (!isObject(entry)) return null
                return pickString(entry, ['productUid', 'uid', 'id', 'productUID'])
            })
            .filter((value): value is string => Boolean(value))

        if (uids.length > 0) {
            return collectStrings(uids)
        }
    }

    return []
}

export function extractGelatoProductName(productPayload: unknown): string | null {
    if (!isObject(productPayload)) {
        return null
    }

    const direct = pickString(productPayload, [
        'title',
        'name',
        'productName',
        'displayName',
        'productTemplateName',
    ])
    if (direct) {
        return direct
    }

    const productTemplate = productPayload.productTemplate
    if (isObject(productTemplate)) {
        return pickString(productTemplate, ['name', 'title', 'displayName'])
    }

    return null
}

export function extractGelatoProductDescription(productPayload: unknown): string | null {
    if (!isObject(productPayload)) {
        return null
    }

    const direct = pickString(productPayload, ['description', 'shortDescription', 'summary'])
    if (direct) {
        return direct
    }

    const productTemplate = productPayload.productTemplate
    if (isObject(productTemplate)) {
        return pickString(productTemplate, ['description', 'shortDescription'])
    }

    return null
}

export function extractGelatoProductImageUrl(productPayload: unknown): string | null {
    if (!isObject(productPayload)) {
        return null
    }

    const direct = pickString(productPayload, ['imageUrl', 'thumbnailUrl', 'previewUrl'])
    if (direct) {
        return direct
    }

    const images = productPayload.images
    if (Array.isArray(images)) {
        for (const image of images) {
            if (!isObject(image)) continue
            const url = pickString(image, ['url', 'imageUrl', 'thumbnailUrl', 'previewUrl'])
            if (url) {
                return url
            }
        }
    }

    return null
}

export function extractGelatoProductSizes(productPayload: unknown): string[] {
    if (!isObject(productPayload)) {
        return ['Default']
    }

    const attributes = productPayload.attributes
    if (!Array.isArray(attributes)) {
        return ['Default']
    }

    const sizeCandidates: string[] = []

    for (const attribute of attributes) {
        if (!isObject(attribute)) continue
        const attributeName = pickString(attribute, ['name', 'code', 'attributeName'])?.toLowerCase() || ''
        if (!attributeName.includes('size') && !attributeName.includes('format')) {
            continue
        }

        const values = Array.isArray(attribute.values) ? attribute.values : []
        for (const value of values) {
            if (isObject(value)) {
                const label = pickString(value, ['label', 'name', 'value', 'displayName'])
                if (label) {
                    sizeCandidates.push(label)
                }
            } else {
                const normalized = asNonEmptyString(value)
                if (normalized) {
                    sizeCandidates.push(normalized)
                }
            }
        }
    }

    const unique = collectStrings(sizeCandidates)
    return unique.length > 0 ? unique : ['Default']
}

export function extractGelatoMinUnitPrice(pricePayload: unknown): number | null {
    if (Array.isArray(pricePayload)) {
        const unitPrices = pricePayload
            .map((entry) => {
                if (!isObject(entry)) return null
                return asFiniteNumber(entry.unitPrice ?? entry.price ?? entry.amount)
            })
            .filter((price): price is number => typeof price === 'number' && price > 0)

        if (unitPrices.length > 0) {
            return Math.min(...unitPrices)
        }
        return null
    }

    if (!isObject(pricePayload)) {
        return null
    }

    const direct = asFiniteNumber(pricePayload.unitPrice)
    if (direct && direct > 0) {
        return direct
    }

    const priceCandidates = [pricePayload.prices, pricePayload.priceBreakdown, pricePayload.tiers]
    for (const candidate of priceCandidates) {
        if (!Array.isArray(candidate)) {
            continue
        }

        const unitPrices = candidate
            .map((entry) => {
                if (!isObject(entry)) return null
                return asFiniteNumber(entry.unitPrice ?? entry.price ?? entry.amount)
            })
            .filter((price): price is number => typeof price === 'number' && price > 0)

        if (unitPrices.length > 0) {
            return Math.min(...unitPrices)
        }
    }

    return null
}

export class GelatoClient {
    private readonly apiKey: string
    private readonly baseUrl: string

    constructor(apiKey = process.env.GELATO_API_KEY, baseUrl = process.env.GELATO_PRODUCTS_BASE_URL) {
        this.apiKey = (apiKey || '').trim()
        this.baseUrl = (baseUrl || DEFAULT_GELATO_PRODUCTS_BASE_URL).trim().replace(/\/+$/, '')
    }

    private buildHeaders() {
        if (!this.apiKey) {
            throw new Error('GELATO_API_KEY is required')
        }

        return {
            'X-API-KEY': this.apiKey,
            'Content-Type': 'application/json',
        }
    }

    private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
        const method = options.method || 'GET'
        const res = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers: this.buildHeaders(),
            body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        })

        const text = await res.text()
        let payload: unknown
        try {
            payload = text ? JSON.parse(text) : {}
        } catch {
            throw new Error(`Gelato API returned invalid JSON for ${path}`)
        }

        if (!res.ok) {
            const message = isObject(payload)
                ? pickString(payload, ['message', 'error', 'detail']) || text
                : text
            throw new Error(`Gelato API error ${res.status} for ${path}: ${message}`)
        }

        return payload as T
    }

    async searchCatalogProducts(catalogUid: string, params: { limit?: number; offset?: number } = {}) {
        const uid = catalogUid.trim()
        if (!uid) {
            throw new Error('catalogUid is required')
        }

        return this.request<unknown>(`/v3/catalogs/${encodeURIComponent(uid)}/products:search`, {
            method: 'POST',
            body: {
                limit: params.limit ?? 20,
                offset: params.offset ?? 0,
            },
        })
    }

    async getCatalog(catalogUid: string) {
        const uid = catalogUid.trim()
        if (!uid) {
            throw new Error('catalogUid is required')
        }

        return this.request<unknown>(`/v3/catalogs/${encodeURIComponent(uid)}`)
    }

    async getProduct(productUid: string) {
        const uid = productUid.trim()
        if (!uid) {
            throw new Error('productUid is required')
        }

        return this.request<unknown>(`/v3/products/${encodeURIComponent(uid)}`)
    }

    async getProductPrices(productUid: string, params: { country?: string; currency?: string } = {}) {
        const uid = productUid.trim()
        if (!uid) {
            throw new Error('productUid is required')
        }

        const searchParams = new URLSearchParams()
        searchParams.set('country', (params.country || 'US').trim())
        searchParams.set('currency', (params.currency || 'USD').trim())
        return this.request<unknown>(
            `/v3/products/${encodeURIComponent(uid)}/prices?${searchParams.toString()}`
        )
    }
}

export const gelato = new GelatoClient()
