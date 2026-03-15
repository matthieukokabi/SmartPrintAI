const DEFAULT_GELATO_PRODUCTS_BASE_URL = 'https://product.gelatoapis.com'
const DEFAULT_GELATO_ECOMMERCE_BASE_URL = 'https://ecommerce.gelatoapis.com'

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

export function extractGelatoAttributesMap(productPayload: unknown): Record<string, string> {
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

export function extractGelatoCatalogUids(catalogsPayload: unknown): string[] {
    if (!isObject(catalogsPayload)) {
        return []
    }

    const listCandidates = [
        catalogsPayload.catalogs,
        catalogsPayload.items,
        catalogsPayload.results,
        catalogsPayload.data,
    ]

    for (const candidate of listCandidates) {
        if (!Array.isArray(candidate)) {
            continue
        }

        const uids = candidate
            .map((entry) => {
                if (!isObject(entry)) return null
                return pickString(entry, ['catalogUid', 'uid', 'id'])
            })
            .filter((value): value is string => Boolean(value))

        if (uids.length > 0) {
            return collectStrings(uids)
        }
    }

    return []
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

export function extractGelatoStoreProducts(storeProductsPayload: unknown): unknown[] {
    if (!isObject(storeProductsPayload)) {
        return []
    }

    const listCandidates = [
        storeProductsPayload.products,
        storeProductsPayload.items,
        storeProductsPayload.results,
        storeProductsPayload.data,
    ]

    for (const candidate of listCandidates) {
        if (Array.isArray(candidate)) {
            return candidate
        }
    }

    return []
}

export function extractGelatoStoreProductUid(storeProductPayload: unknown): string | null {
    if (!isObject(storeProductPayload)) {
        return null
    }

    return pickString(storeProductPayload, ['id', 'uid', 'productUid', 'storeProductUid'])
}

export function extractGelatoStoreProductName(storeProductPayload: unknown): string | null {
    if (!isObject(storeProductPayload)) {
        return null
    }

    return pickString(storeProductPayload, ['title', 'name', 'productName', 'displayName'])
}

export function extractGelatoStoreProductTemplateId(storeProductPayload: unknown): string | null {
    if (!isObject(storeProductPayload)) {
        return null
    }

    return pickString(storeProductPayload, ['parentTemplateId', 'templateId', 'productTemplateId'])
}

export function extractGelatoStoreProductDescription(storeProductPayload: unknown): string | null {
    if (!isObject(storeProductPayload)) {
        return null
    }

    return pickString(storeProductPayload, ['description', 'summary', 'shortDescription'])
}

export function extractGelatoStoreProductImageUrl(storeProductPayload: unknown): string | null {
    if (!isObject(storeProductPayload)) {
        return null
    }

    const direct = asHttpUrl(
        pickString(storeProductPayload, ['previewUrl', 'externalThumbnailUrl', 'thumbnailUrl', 'imageUrl'])
    )
    if (direct) {
        return direct
    }

    return findImageUrlDeep(storeProductPayload, 0)
}

export function extractGelatoStoreProductVariantUids(storeProductPayload: unknown): string[] {
    if (!isObject(storeProductPayload)) {
        return []
    }

    const variants = storeProductPayload.variants
    if (!Array.isArray(variants)) {
        return []
    }

    const productUids: string[] = []

    for (const variant of variants) {
        if (!isObject(variant)) {
            continue
        }

        const directUid = pickString(variant, ['productUid', 'uid'])
        if (directUid) {
            productUids.push(directUid)
        }

        if (isObject(variant.product)) {
            const nestedUid = pickString(variant.product, ['productUid', 'uid', 'id'])
            if (nestedUid) {
                productUids.push(nestedUid)
            }
        }
    }

    return collectStrings(productUids)
}

export function extractGelatoStoreVariantMapping(payload: unknown): Record<string, string> {
    const variants = (payload as { variants?: Array<Record<string, unknown>> })?.variants || []
    const mapping: Record<string, string> = {}

    for (const v of variants) {
        if (!v || typeof v !== 'object' || !v.productUid || typeof v.productUid !== 'string') continue

        const attributes = (v.attributes as Record<string, string | undefined>) || {}
        const size = (attributes.GarmentSize || attributes.Size || '').trim().toLowerCase()
        const color = (attributes.GarmentColor || attributes.Color || '').trim().toLowerCase()

        if (size && color) {
            mapping[`${size}:${color}`] = v.productUid
        } else if (size) {
            mapping[size] = v.productUid
        } else if (color) {
            mapping[color] = v.productUid
        }
    }

    return mapping
}

export function extractGelatoVariantMapping(payload: unknown): Record<string, string> {
    const variants = (payload as { variants?: Array<Record<string, unknown>> })?.variants || []
    const mapping: Record<string, string> = {}

    for (const v of variants) {
        if (!v || typeof v !== 'object' || !v.productUid || typeof v.productUid !== 'string') continue

        const attributes = (v.attributes as Record<string, string | undefined>) || {}
        const size = (attributes.GarmentSize || attributes.Size || '').trim().toLowerCase()
        const color = (attributes.GarmentColor || attributes.Color || '').trim().toLowerCase()

        if (size && color) {
            mapping[`${size}:${color}`] = v.productUid
        } else if (size) {
            mapping[size] = v.productUid
        } else if (color) {
            mapping[color] = v.productUid
        }
    }

    return mapping
}

function extractGelatoStoreProductOptionValues(
    storeProductPayload: unknown,
    optionNamePattern: RegExp
): string[] {
    if (!isObject(storeProductPayload)) {
        return []
    }

    const rawOptions = storeProductPayload.productVariantOptions
    if (!Array.isArray(rawOptions)) {
        return []
    }

    const values: string[] = []
    for (const option of rawOptions) {
        if (!isObject(option)) {
            continue
        }

        const optionName = pickString(option, ['name', 'optionName'])
        if (!optionNamePattern.test((optionName || '').toLowerCase())) {
            continue
        }

        const optionValues = option.values
        if (!Array.isArray(optionValues)) {
            continue
        }

        for (const optionValue of optionValues) {
            if (isObject(optionValue)) {
                const valueName = pickString(optionValue, ['value', 'name', 'label'])
                if (valueName) {
                    values.push(valueName)
                }
            } else {
                const primitiveValue = asNonEmptyString(optionValue)
                if (primitiveValue) {
                    values.push(primitiveValue)
                }
            }
        }
    }

    return collectStrings(values)
}

export function extractGelatoStoreProductSizes(storeProductPayload: unknown): string[] {
    const values = extractGelatoStoreProductOptionValues(storeProductPayload, /(size|format|paper)/i)
    if (values.length === 0) {
        return []
    }

    return values.map((value) => toReadableSize(value))
}

export function extractGelatoStoreProductColorNames(storeProductPayload: unknown): string[] {
    const values = extractGelatoStoreProductOptionValues(storeProductPayload, /color/i)
    if (values.length === 0) {
        return []
    }

    return values.map((value) => toTitleCase(value))
}

export function extractGelatoTemplateProductUids(templatePayload: unknown): string[] {
    if (!isObject(templatePayload)) {
        return []
    }

    const variants = templatePayload.variants
    if (!Array.isArray(variants)) {
        return []
    }

    const productUids: string[] = []
    for (const variant of variants) {
        if (!isObject(variant)) {
            continue
        }
        const productUid = pickString(variant, ['productUid'])
        if (productUid) {
            productUids.push(productUid)
        }
    }

    return collectStrings(productUids)
}

export function extractGelatoTemplatePlaceholderName(
    templatePayload: unknown,
    preferredPrintArea?: string
): string | null {
    if (!isObject(templatePayload)) {
        return null
    }

    const normalizedPreferredArea = asNonEmptyString(preferredPrintArea)?.toLowerCase() || null
    const variants = templatePayload.variants
    if (!Array.isArray(variants)) {
        return null
    }

    let fallbackPlaceholderName: string | null = null

    for (const variant of variants) {
        if (!isObject(variant)) {
            continue
        }

        const rawPlaceholders = variant.imagePlaceholders
        if (!Array.isArray(rawPlaceholders)) {
            continue
        }

        for (const placeholder of rawPlaceholders) {
            if (!isObject(placeholder)) {
                continue
            }

            const placeholderName = pickString(placeholder, ['name', 'placeholderName', 'id'])
            if (!placeholderName) {
                continue
            }

            if (!fallbackPlaceholderName) {
                fallbackPlaceholderName = placeholderName
            }

            if (!normalizedPreferredArea) {
                continue
            }

            const placeholderArea = pickString(placeholder, ['printArea', 'area'])?.toLowerCase()
            if (placeholderArea === normalizedPreferredArea) {
                return placeholderName
            }
        }
    }

    return fallbackPlaceholderName
}

export function extractGelatoCreatedStoreProductUid(payload: unknown): string | null {
    if (!isObject(payload)) {
        return null
    }

    const directUid = pickString(payload, ['id', 'uid', 'storeProductUid', 'productUid'])
    if (directUid) {
        return directUid
    }

    const nestedProduct = payload.product
    if (isObject(nestedProduct)) {
        const nestedUid = pickString(nestedProduct, ['id', 'uid', 'storeProductUid', 'productUid'])
        if (nestedUid) {
            return nestedUid
        }
    }

    return null
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
    private readonly ecommerceBaseUrl: string

    constructor(
        apiKey = process.env.GELATO_API_KEY,
        baseUrl = process.env.GELATO_PRODUCTS_BASE_URL,
        ecommerceBaseUrl = process.env.GELATO_ECOMMERCE_BASE_URL
    ) {
        this.apiKey = (apiKey || '').trim()
        this.baseUrl = (baseUrl || DEFAULT_GELATO_PRODUCTS_BASE_URL).trim().replace(/\/+$/, '')
        this.ecommerceBaseUrl = (ecommerceBaseUrl || DEFAULT_GELATO_ECOMMERCE_BASE_URL).trim().replace(/\/+$/, '')
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

    private async ecommerceRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
        const method = options.method || 'GET'
        const res = await fetch(`${this.ecommerceBaseUrl}${path}`, {
            method,
            headers: this.buildHeaders(),
            body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        })

        const text = await res.text()
        let payload: unknown
        try {
            payload = text ? JSON.parse(text) : {}
        } catch {
            throw new Error(`Gelato ecommerce API returned invalid JSON for ${path}`)
        }

        if (!res.ok) {
            const message = isObject(payload)
                ? pickString(payload, ['message', 'error', 'detail']) || text
                : text
            throw new Error(`Gelato ecommerce API error ${res.status} for ${path}: ${message}`)
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

    async listCatalogs(params: { limit?: number; offset?: number } = {}) {
        const searchParams = new URLSearchParams()
        searchParams.set('limit', String(params.limit ?? 100))
        searchParams.set('offset', String(params.offset ?? 0))

        return this.request<unknown>(`/v3/catalogs?${searchParams.toString()}`)
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

    async listStoreProducts(
        storeId: string,
        params: { limit?: number; offset?: number; orderBy?: string; order?: 'asc' | 'desc' } = {}
    ) {
        const uid = storeId.trim()
        if (!uid) {
            throw new Error('storeId is required')
        }

        const searchParams = new URLSearchParams()
        searchParams.set('limit', String(params.limit ?? 25))
        searchParams.set('offset', String(params.offset ?? 0))
        if (params.orderBy) {
            searchParams.set('orderBy', params.orderBy)
        }
        if (params.order) {
            searchParams.set('order', params.order)
        }

        return this.ecommerceRequest<unknown>(
            `/v1/stores/${encodeURIComponent(uid)}/products?${searchParams.toString()}`
        )
    }

    async getStoreProduct(storeId: string, storeProductUid: string) {
        const uid = storeId.trim()
        const productUid = storeProductUid.trim()
        if (!uid) {
            throw new Error('storeId is required')
        }
        if (!productUid) {
            throw new Error('storeProductUid is required')
        }

        return this.ecommerceRequest<unknown>(
            `/v1/stores/${encodeURIComponent(uid)}/products/${encodeURIComponent(productUid)}`
        )
    }

    async getTemplate(templateId: string) {
        const uid = templateId.trim()
        if (!uid) {
            throw new Error('templateId is required')
        }

        return this.ecommerceRequest<unknown>(`/v1/templates/${encodeURIComponent(uid)}`)
    }

    async createProductFromTemplate(
        storeId: string,
        templateId: string,
        params: {
            productName?: string
            description?: string
            placeholders: Array<{ name: string; fileUrl: string }>
            publish?: boolean
        }
    ) {
        if (!storeId.trim()) throw new Error('storeId is required')
        if (!templateId.trim()) throw new Error('templateId is required')
        if (!params.placeholders?.length) throw new Error('placeholders are required')

        return this.ecommerceRequest<unknown>(`/v1/stores/${encodeURIComponent(storeId)}/products:create-from-template`, {
            method: 'POST',
            body: {
                templateId: templateId.trim(),
                productName: params.productName,
                description: params.description,
                placeholders: params.placeholders,
                publish: params.publish ?? true,
            },
        })
    }

    async createOrder(params: {
        orderReferenceId: string
        currency: string
        customerEmail: string
        shippingAddress: {
            firstName: string
            lastName: string
            companyName?: string
            addressLine1: string
            addressLine2?: string
            city: string
            postcode: string
            stateCode?: string
            countryCode: string
            email: string
            phone?: string
        }
        items: Array<{
            itemReferenceId?: string
            productUid: string
            quantity: number
            fileUrl?: string
        }>
    }) {
        if (!params.orderReferenceId?.trim()) throw new Error('orderReferenceId is required')
        if (!params.currency?.trim()) throw new Error('currency is required')
        if (!params.customerEmail) throw new Error('customerEmail is required')
        if (!params.items?.length) throw new Error('items are required')

        return this.request<unknown>(`/v3/orders`, {
            method: 'POST',
            body: {
                orderReferenceId: params.orderReferenceId.trim(),
                currency: params.currency.trim().toUpperCase(),
                customerEmail: params.customerEmail,
                shippingAddress: params.shippingAddress,
                items: params.items,
            },
        })
    }
}

export const gelato = new GelatoClient()
