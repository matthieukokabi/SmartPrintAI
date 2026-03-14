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

function toTitleCase(value: string): string {
    return value
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .map((part) => {
            if (part.length === 0) return part
            return part[0].toUpperCase() + part.slice(1).toLowerCase()
        })
        .join(' ')
}

function normalizeAttributeKey(value: string): string {
    return value.replace(/[^a-z0-9]/gi, '').toLowerCase()
}

function asHttpUrl(value: unknown): string | null {
    const normalized = asNonEmptyString(value)
    if (!normalized) {
        return null
    }

    if (!/^https?:\/\//i.test(normalized)) {
        return null
    }

    return normalized
}

function toReadableQuality(value: string): string {
    const normalized = value.trim().toLowerCase()
    const map: Record<string, string> = {
        prm: 'Premium',
        premium: 'Premium',
        classic: 'Classic',
        organic: 'Organic',
        performance: 'Performance',
    }
    return map[normalized] || toTitleCase(value)
}

function toReadableSize(value: string): string {
    const normalized = value.trim()
    if (/^\d*xl$/i.test(normalized) || /^(xs|s|m|l|xl|xxl|xxxl|onesize)$/i.test(normalized)) {
        return normalized.toUpperCase().replace(/^ONESIZE$/, 'One Size')
    }
    return toTitleCase(normalized)
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

function extractGelatoAttributesMap(productPayload: unknown): Record<string, string> {
    if (!isObject(productPayload)) {
        return {}
    }

    const attributes = productPayload.attributes
    const out: Record<string, string> = {}

    if (Array.isArray(attributes)) {
        for (const attribute of attributes) {
            if (!isObject(attribute)) continue
            const rawKey = pickString(attribute, ['name', 'code', 'attributeName', 'id'])
            if (!rawKey) continue
            const key = normalizeAttributeKey(rawKey)
            const value =
                pickString(attribute, ['value', 'label', 'displayName']) ||
                (Array.isArray(attribute.values) ? asNonEmptyString(attribute.values[0]) : null)
            if (!value || out[key]) continue
            out[key] = value
        }
        return out
    }

    if (isObject(attributes)) {
        for (const [rawKey, rawValue] of Object.entries(attributes)) {
            const key = normalizeAttributeKey(rawKey)
            const value = asNonEmptyString(rawValue)
            if (!value || out[key]) continue
            out[key] = value
        }
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
        const templateName = pickString(productTemplate, ['name', 'title', 'displayName'])
        if (templateName) {
            return templateName
        }
    }

    const attrs = extractGelatoAttributesMap(productPayload)
    const apparelCategory = attrs.garmentcategory
    const apparelSubcategory = attrs.garmentsubcategory
    const garmentCut = attrs.garmentcut
    const garmentQuality = attrs.garmentquality
    const apparelManufacturer = attrs.apparelmanufacturer

    if (apparelCategory) {
        const parts: string[] = []
        const qualityNormalized = asNonEmptyString(garmentQuality)?.toLowerCase()
        if (qualityNormalized && qualityNormalized !== 'classic') {
            parts.push(toReadableQuality(garmentQuality!))
        }
        if (garmentCut && garmentCut.toLowerCase() !== 'none') {
            parts.push(toTitleCase(garmentCut))
        }
        if (apparelSubcategory && apparelSubcategory.toLowerCase() !== apparelCategory.toLowerCase()) {
            parts.push(toTitleCase(apparelSubcategory))
        }
        parts.push(toTitleCase(apparelCategory))

        let base = parts.join(' ').trim()
        if (!base) {
            base = toTitleCase(apparelCategory)
        }
        if (apparelManufacturer && apparelManufacturer.toLowerCase() !== 'none') {
            base += ` (${toTitleCase(apparelManufacturer)})`
        }
        return base
    }

    if (attrs.bagsubcategory) {
        const quality = attrs.bagquality && attrs.bagquality.toLowerCase() !== 'none' ? `${toTitleCase(attrs.bagquality)} ` : ''
        return `${quality}${toTitleCase(attrs.bagsubcategory)}`
    }

    if (attrs.phonemodel) {
        return `${toTitleCase(attrs.phonemodel)} Phone Case`
    }

    if (attrs.mugsize) {
        return `${toTitleCase(attrs.mugsize)} Mug`
    }

    if (attrs.unifiedcanvasformat) {
        return `${toTitleCase(attrs.unifiedcanvasformat)} Canvas`
    }

    if (attrs.paperformat) {
        return `${toTitleCase(attrs.paperformat)} Poster`
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

    const direct = asHttpUrl(pickString(productPayload, ['imageUrl', 'thumbnailUrl', 'previewUrl']))
    if (direct) {
        return direct
    }

    const candidates = [
        productPayload.images,
        productPayload.previews,
        productPayload.thumbnails,
        productPayload.mockups,
        productPayload.media,
        productPayload.assets,
        productPayload.productTemplate,
        productPayload.productType,
        productPayload.productTypeUid,
    ]

    for (const candidate of candidates) {
        const url = findImageUrlDeep(candidate, 0)
        if (url) {
            return url
        }
    }

    return null
}

export function extractGelatoProductSizes(productPayload: unknown): string[] {
    const attrs = extractGelatoAttributesMap(productPayload)
    const sizeCandidates = [
        attrs.garmentsize,
        attrs.bagsize,
        attrs.mugsize,
        attrs.paperformat,
        attrs.unifiedcanvasformat,
        attrs.size,
        attrs.format,
    ]
        .map((value) => asNonEmptyString(value))
        .filter((value): value is string => Boolean(value))
        .map((value) => toReadableSize(value))

    return sizeCandidates.length > 0 ? collectStrings(sizeCandidates) : ['Default']
}

export function extractGelatoColorName(productPayload: unknown): string | null {
    const attrs = extractGelatoAttributesMap(productPayload)
    const color = attrs.garmentcolor || attrs.bagcolor || attrs.colortype || attrs.color
    const normalized = asNonEmptyString(color)
    return normalized ? toTitleCase(normalized) : null
}

export function extractGelatoIsPrintable(productPayload: unknown): boolean {
    if (!isObject(productPayload)) {
        return true
    }

    if (typeof productPayload.isPrintable === 'boolean') {
        return productPayload.isPrintable
    }

    return true
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

function findImageUrlDeep(candidate: unknown, depth: number): string | null {
    if (depth > 4 || candidate == null) {
        return null
    }

    if (Array.isArray(candidate)) {
        for (const entry of candidate) {
            const nested = findImageUrlDeep(entry, depth + 1)
            if (nested) {
                return nested
            }
        }
        return null
    }

    if (!isObject(candidate)) {
        return asHttpUrl(candidate)
    }

    for (const [key, value] of Object.entries(candidate)) {
        if (typeof value === 'string' && /image|thumb|preview|mockup|photo|url/i.test(key)) {
            const direct = asHttpUrl(value)
            if (direct) {
                return direct
            }
        }
    }

    for (const value of Object.values(candidate)) {
        const nested = findImageUrlDeep(value, depth + 1)
        if (nested) {
            return nested
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
