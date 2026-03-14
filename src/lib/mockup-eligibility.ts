type MockupEligibilityProduct = {
    name?: string | null
    printfulId?: string | null
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

    if (!name || !printfulId) {
        return false
    }

    // Only Printful-backed numeric product ids are eligible for current AI mockup flow.
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
