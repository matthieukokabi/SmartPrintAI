import { describe, expect, it } from 'vitest'
import {
    HOMEPAGE_HERO_VARIANT_COOKIE,
    assignHomepageHeroVariant,
    normalizeHomepageHeroVariant,
    readHomepageHeroVariantFromCookieHeader,
    sanitizeVisitorId,
} from './homepage-experiment'

describe('homepage experiment helpers', () => {
    it('normalizes only supported variants', () => {
        expect(normalizeHomepageHeroVariant('variant_a')).toBe('variant_a')
        expect(normalizeHomepageHeroVariant('variant_b')).toBe('variant_b')
        expect(normalizeHomepageHeroVariant('other')).toBeNull()
        expect(normalizeHomepageHeroVariant(null)).toBeNull()
    })

    it('assigns variants deterministically from visitor id', () => {
        const first = assignHomepageHeroVariant('visitor_123')
        const second = assignHomepageHeroVariant('visitor_123')
        expect(first).toBe(second)
        expect(['variant_a', 'variant_b']).toContain(first)
    })

    it('extracts variant from cookie header', () => {
        const cookieHeader = `foo=bar; ${HOMEPAGE_HERO_VARIANT_COOKIE}=variant_b; baz=qux`
        expect(readHomepageHeroVariantFromCookieHeader(cookieHeader)).toBe('variant_b')
        expect(readHomepageHeroVariantFromCookieHeader('foo=bar')).toBeNull()
    })

    it('sanitizes visitor id values', () => {
        expect(sanitizeVisitorId('  abc123  ')).toBe('abc123')
        expect(sanitizeVisitorId('')).toBeNull()
        expect(sanitizeVisitorId(null)).toBeNull()
    })
})
