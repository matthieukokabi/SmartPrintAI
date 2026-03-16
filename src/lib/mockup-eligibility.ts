type MockupEligibilityProduct = {
    name?: string | null
    printfulId?: string | null
    printArea?: unknown
}

const MOCKUP_UNSUPPORTED_PRINTFUL_IDS = new Set([
    // All-Over Print Biker Shorts
    '507',
])

const MOCKUP_UNSUPPORTED_NAME_PATTERNS = [
    /^adidas\b/i,
]

export function isMockupEligibleProduct(product: MockupEligibilityProduct): boolean {
    const name = (product.name || '').trim()
    const printfulId = (product.printfulId || '').trim()
    const printArea =
        typeof product.printArea === 'object' && product.printArea !== null
            ? (product.printArea as Record<string, unknown>)
            : null

    if (!name || !printfulId) {
        return false
    }

    if (printfulId.startsWith('gooten:')) {
        const providerProductId =
            typeof printArea?.providerProductId === 'string' ? printArea.providerProductId.trim() : ''
        const defaultSku = typeof printArea?.providerDefaultSku === 'string' ? printArea.providerDefaultSku.trim() : ''
        const mapping =
            typeof printArea?.variantMapping === 'object' && printArea.variantMapping !== null
                ? (printArea.variantMapping as Record<string, unknown>)
                : null
        const hasMappedSku = !!mapping && Object.values(mapping).some((value) => typeof value === 'string' && value.trim().length > 0)

        return providerProductId.length > 0 && (defaultSku.length > 0 || hasMappedSku)
    }

    // Gelato products are eligible for AI mockup flow.
    if (printfulId.startsWith('gelato:')) {
        const templateId =
            typeof printArea?.providerTemplateId === 'string' ? printArea.providerTemplateId.trim() : ''
        const validated = printArea?.providerTemplateValidated
        const hasPlaceholders = printArea?.providerTemplateHasPlaceholders

        if (typeof validated === 'boolean') {
            if (typeof hasPlaceholders === 'boolean') {
                return validated && hasPlaceholders && templateId.length > 0
            }
            return validated && templateId.length > 0
        }

        if (printArea) {
            if (typeof hasPlaceholders === 'boolean') {
                return hasPlaceholders && templateId.length > 0
            }
            return templateId.length > 0
        }

        return true
    }

    // Only Printful-backed numeric product ids are eligible for default AI mockup flow.
    if (!/^\d+$/.test(printfulId)) {
        return false
    }

    if (MOCKUP_UNSUPPORTED_PRINTFUL_IDS.has(printfulId)) {
        return false
    }

    for (const pattern of MOCKUP_UNSUPPORTED_NAME_PATTERNS) {
        if (pattern.test(name)) {
            return false
        }
    }

    return true
}
