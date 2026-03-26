export const BASE_CHECKOUT_ALLOWED_COUNTRIES = ['US', 'CA', 'GB', 'DE', 'FR', 'AU', 'NL', 'BE', 'CH'] as const

type ProductDestinationRule = {
    allowedCountries: string[]
    reason: string
}

type ProductLike = {
    id?: string
    name?: string | null
    printfulId?: string | null
}

type UnsupportedProduct = {
    productId: string
    printfulId: string
    name: string
    allowedCountries: string[]
    reason: string
}

const PRODUCT_DESTINATION_RULES_BY_REF: Record<string, ProductDestinationRule> = {
    '793': {
        allowedCountries: ['US'],
        reason: 'printful_us_only_shipping',
    },
    '679': {
        allowedCountries: ['US'],
        reason: 'printful_us_only_shipping',
    },
}

function normalizeCountryCode(value: string): string {
    return value.trim().toUpperCase()
}

function uniqueCountries(countries: string[]): string[] {
    const deduped = new Set<string>()
    const ordered: string[] = []

    for (const country of countries.map(normalizeCountryCode)) {
        if (!country || deduped.has(country)) {
            continue
        }

        deduped.add(country)
        ordered.push(country)
    }

    return ordered
}

function toBaseCountrySet(baseAllowedCountries: readonly string[]): Set<string> {
    return new Set(uniqueCountries([...baseAllowedCountries]))
}

export function getProductDestinationRule(productRef: string): ProductDestinationRule | null {
    return PRODUCT_DESTINATION_RULES_BY_REF[productRef] || null
}

export function getAllowedCountriesForProduct(
    product: ProductLike,
    baseAllowedCountries: readonly string[] = BASE_CHECKOUT_ALLOWED_COUNTRIES
): string[] {
    const normalizedBase = uniqueCountries([...baseAllowedCountries])
    const productRef = (product.printfulId || '').trim()
    const explicitRule = getProductDestinationRule(productRef)
    if (!explicitRule) {
        return normalizedBase
    }

    const baseSet = toBaseCountrySet(baseAllowedCountries)
    return uniqueCountries(explicitRule.allowedCountries).filter((country) => baseSet.has(country))
}

export function getAllowedCountriesForCart(
    products: ProductLike[],
    baseAllowedCountries: readonly string[] = BASE_CHECKOUT_ALLOWED_COUNTRIES
): string[] {
    let current = uniqueCountries([...baseAllowedCountries])

    for (const product of products) {
        const productAllowed = new Set(getAllowedCountriesForProduct(product, baseAllowedCountries))
        current = current.filter((country) => productAllowed.has(country))
    }

    return current
}

export function findUnsupportedProductsForDestination(
    products: ProductLike[],
    destinationCountry: string,
    baseAllowedCountries: readonly string[] = BASE_CHECKOUT_ALLOWED_COUNTRIES
): UnsupportedProduct[] {
    const normalizedDestination = normalizeCountryCode(destinationCountry)
    if (!normalizedDestination) {
        return []
    }

    return products
        .map((product) => {
            const allowedCountries = getAllowedCountriesForProduct(product, baseAllowedCountries)
            if (allowedCountries.includes(normalizedDestination)) {
                return null
            }

            const productRef = (product.printfulId || '').trim()
            const explicitRule = getProductDestinationRule(productRef)
            return {
                productId: product.id || productRef,
                printfulId: productRef,
                name: product.name || productRef,
                allowedCountries,
                reason: explicitRule?.reason || 'destination_not_supported',
            }
        })
        .filter((value): value is UnsupportedProduct => value !== null)
}

