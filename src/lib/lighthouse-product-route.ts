export type ProductDetailResolutionStrategy = 'fixture' | 'discovery' | 'fallback'

export type ResolveProductDetailPathInput = {
    fixturePath: string
    fixtureAvailable: boolean
    fixtureError?: string | null
    discoverySourcePath: string
    discoveredPath?: string | null
    discoveryError?: string | null
    fallbackPath?: string | null
}

export type ResolveProductDetailPathResult = {
    strategy: ProductDetailResolutionStrategy
    path: string
    warning?: string
}

export function discoverProductDetailPathFromHtml(html: string): string | null {
    const patterns = [
        /href=(["'])(\/products\/[^"'?#]+)\1/i,
        /href=(["'])(\/(?:en|fr|de|es)\/products\/[^"'?#]+)\1/i,
        /href=(["'])(https?:\/\/[^"']+\/products\/[^"'?#]+)\1/i,
    ]

    for (const pattern of patterns) {
        const match = pattern.exec(html)
        if (!match || !match[2]) {
            continue
        }

        const candidate = new URL(match[2], 'https://smartprintai.com').pathname
        if (candidate === '/products') {
            continue
        }

        if (candidate.startsWith('/products/') || /^\/(en|fr|de|es)\/products\/.+/.test(candidate)) {
            return candidate
        }
    }

    return null
}

export function resolveProductDetailPath(input: ResolveProductDetailPathInput): ResolveProductDetailPathResult {
    if (input.fixtureAvailable) {
        return {
            strategy: 'fixture',
            path: input.fixturePath,
        }
    }

    if (input.discoveredPath) {
        return {
            strategy: 'discovery',
            path: input.discoveredPath,
            warning: `Fixture route '${input.fixturePath}' unavailable (${input.fixtureError || 'unknown error'}). Falling back to discovered path '${input.discoveredPath}' from '${input.discoverySourcePath}'.`,
        }
    }

    if (input.fallbackPath) {
        return {
            strategy: 'fallback',
            path: input.fallbackPath,
            warning: `Fixture route '${input.fixturePath}' unavailable (${input.fixtureError || 'unknown error'}) and no product detail link was discovered from '${input.discoverySourcePath}' (${input.discoveryError || 'no matching link found'}). Using configured fallback path '${input.fallbackPath}'.`,
        }
    }

    throw new Error(
        `Unable to resolve deterministic Lighthouse product detail route. Tried fixture '${input.fixturePath}' (${input.fixtureError || 'unknown error'}) and fallback discovery from '${input.discoverySourcePath}' (${input.discoveryError || 'no matching link found'}). Set productDetailFixture.path to a stable route or configure productDetailFixture.fallbackPath in config/lighthouse-budget.json.`,
    )
}
