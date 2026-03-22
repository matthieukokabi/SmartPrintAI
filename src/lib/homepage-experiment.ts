export const HOMEPAGE_HERO_VARIANT_COOKIE = 'spai_home_hero_variant'
export const HOMEPAGE_VISITOR_ID_COOKIE = 'spai_visitor_id'
export const HOMEPAGE_HERO_VARIANT_HEADER = 'x-spai-home-hero-variant'
export const HOMEPAGE_HERO_VARIANT_MAX_AGE_SEC = 60 * 60 * 24 * 180

export type HomepageHeroVariant = 'variant_a' | 'variant_b'

const HOMEPAGE_HERO_VARIANTS: HomepageHeroVariant[] = ['variant_a', 'variant_b']

export function normalizeHomepageHeroVariant(value: string | null | undefined): HomepageHeroVariant | null {
    if (!value) return null
    return HOMEPAGE_HERO_VARIANTS.includes(value as HomepageHeroVariant)
        ? (value as HomepageHeroVariant)
        : null
}

export function sanitizeVisitorId(value: string | null | undefined): string | null {
    if (!value) return null
    const trimmed = value.trim()
    if (!trimmed) return null
    return trimmed.slice(0, 128)
}

export function hashString(input: string): number {
    let hash = 0
    for (let index = 0; index < input.length; index += 1) {
        hash = ((hash << 5) - hash + input.charCodeAt(index)) | 0
    }
    return Math.abs(hash)
}

export function assignHomepageHeroVariant(visitorId: string): HomepageHeroVariant {
    return hashString(visitorId) % 2 === 0 ? 'variant_a' : 'variant_b'
}

export function readHomepageHeroVariantFromCookieHeader(cookieHeader: string | null | undefined): HomepageHeroVariant | null {
    if (!cookieHeader) return null
    const pairs = cookieHeader.split(';')
    for (const pair of pairs) {
        const [rawKey, ...rawValue] = pair.trim().split('=')
        if (rawKey === HOMEPAGE_HERO_VARIANT_COOKIE) {
            return normalizeHomepageHeroVariant(decodeURIComponent(rawValue.join('=')))
        }
    }
    return null
}
