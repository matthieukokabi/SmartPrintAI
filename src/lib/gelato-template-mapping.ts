export type GelatoTemplateMappingEntry = {
    templateName: string
    templateId: string
    productType: string
    printAreaPlaceholder: string
}

const DEFAULT_GELATO_STORE_ID = '25a81457-8265-4597-9d9c-21cb5bf276fb'

const DEFAULT_GELATO_TEMPLATE_MAPPINGS: GelatoTemplateMappingEntry[] = [
    {
        templateName: 'SPAI T-Shirt Template',
        templateId: '069fcba0-4c7f-4785-bf23-ecaa1c57c683',
        productType: 't-shirt',
        printAreaPlaceholder: 'front',
    },
    {
        templateName: 'SPAI_MUG_FRONT',
        templateId: '79e78f8d-b038-4ebf-8a1a-3c0074a002f2',
        productType: 'mug',
        printAreaPlaceholder: 'front',
    },
    {
        templateName: 'SPAI_HOODIE_FRONT',
        templateId: '345bc6f2-44d9-431e-ab99-6f3ebd5cd379',
        productType: 'hoodie',
        printAreaPlaceholder: 'front',
    },
    {
        templateName: 'SPAI_POSTER_FRONT',
        templateId: 'ac3c2a1e-7076-48a2-b256-9e950a0c246b',
        productType: 'poster',
        printAreaPlaceholder: 'front',
    },
    {
        templateName: 'SPAI_CANVAS_FRONT',
        templateId: '01bc3462-9b65-4c11-ac37-b3d62e8b61da',
        productType: 'canvas',
        printAreaPlaceholder: 'front',
    },
]

function toTrimmedString(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null
    }
    const normalized = value.trim()
    return normalized.length > 0 ? normalized : null
}

function normalizeProductType(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[_\s]+/g, '-')
}

function coerceTemplateEntry(value: unknown): GelatoTemplateMappingEntry | null {
    if (typeof value !== 'object' || value === null) {
        return null
    }

    const record = value as Record<string, unknown>
    const templateName = toTrimmedString(record.templateName)
    const templateId = toTrimmedString(record.templateId)
    const rawProductType = toTrimmedString(record.productType)
    const productType = rawProductType ? normalizeProductType(rawProductType) : null
    const printAreaPlaceholder = toTrimmedString(record.printAreaPlaceholder) || 'front'

    if (!templateName || !templateId || !productType) {
        return null
    }

    return {
        templateName,
        templateId,
        productType,
        printAreaPlaceholder,
    }
}

function parseTemplateEntries(value: unknown): GelatoTemplateMappingEntry[] {
    if (!Array.isArray(value)) {
        return []
    }

    const seenTemplateIds = new Set<string>()
    const seenProductTypes = new Set<string>()
    const parsed: GelatoTemplateMappingEntry[] = []

    for (const entry of value) {
        const normalized = coerceTemplateEntry(entry)
        if (!normalized) {
            continue
        }

        const dedupeKey = normalized.templateId.toLowerCase()
        if (seenTemplateIds.has(dedupeKey)) {
            continue
        }

        if (seenProductTypes.has(normalized.productType)) {
            continue
        }

        seenTemplateIds.add(dedupeKey)
        seenProductTypes.add(normalized.productType)
        parsed.push(normalized)
    }

    return parsed
}

function parseTemplateMapJson(rawValue: string): GelatoTemplateMappingEntry[] {
    let parsedJson: unknown
    try {
        parsedJson = JSON.parse(rawValue)
    } catch (error) {
        const message = error instanceof Error ? error.message : 'invalid JSON'
        throw new Error(`Invalid GELATO_TEMPLATE_MAP_JSON: ${message}`)
    }

    if (Array.isArray(parsedJson)) {
        return parseTemplateEntries(parsedJson)
    }

    if (typeof parsedJson === 'object' && parsedJson !== null) {
        const record = parsedJson as Record<string, unknown>
        return parseTemplateEntries(record.templates)
    }

    return []
}

export function resolveGelatoStoreId(): string {
    return toTrimmedString(process.env.GELATO_STORE_ID) || DEFAULT_GELATO_STORE_ID
}

export function resolveGelatoTemplateMappings(): GelatoTemplateMappingEntry[] {
    const rawMap = toTrimmedString(process.env.GELATO_TEMPLATE_MAP_JSON)
    if (!rawMap) {
        return DEFAULT_GELATO_TEMPLATE_MAPPINGS
    }

    const parsedEntries = parseTemplateMapJson(rawMap)
    if (parsedEntries.length === 0) {
        throw new Error('GELATO_TEMPLATE_MAP_JSON must include at least one valid template entry')
    }

    return parsedEntries
}
