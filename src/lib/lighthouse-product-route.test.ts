import { describe, expect, it } from 'vitest'
import {
    discoverProductDetailPathFromHtml,
    resolveProductDetailPath,
} from './lighthouse-product-route'

describe('lighthouse product detail route helpers', () => {
    it('extracts product detail path from relative and absolute links', () => {
        expect(discoverProductDetailPathFromHtml('<a href="/products/prod_123">x</a>')).toBe('/products/prod_123')
        expect(discoverProductDetailPathFromHtml('<a href="https://smartprintai.com/products/prod_456">x</a>')).toBe(
            '/products/prod_456',
        )
        expect(discoverProductDetailPathFromHtml('<a href="/fr/products/prod_789">x</a>')).toBe('/fr/products/prod_789')
    })

    it('returns null when no detail product link exists', () => {
        expect(discoverProductDetailPathFromHtml('<a href="/products">catalog</a>')).toBeNull()
        expect(discoverProductDetailPathFromHtml('<a href="/blog">blog</a>')).toBeNull()
    })

    it('prefers fixture route when available', () => {
        const resolved = resolveProductDetailPath({
            fixturePath: '/products/fixed',
            fixtureAvailable: true,
            discoverySourcePath: '/products',
            discoveredPath: '/products/discovered',
        })

        expect(resolved).toEqual({
            strategy: 'fixture',
            path: '/products/fixed',
        })
    })

    it('falls back to discovered route when fixture is unavailable', () => {
        const resolved = resolveProductDetailPath({
            fixturePath: '/products/fixed',
            fixtureAvailable: false,
            fixtureError: 'HTTP 404',
            discoverySourcePath: '/products',
            discoveredPath: '/products/discovered',
        })

        expect(resolved.strategy).toBe('discovery')
        expect(resolved.path).toBe('/products/discovered')
        expect(resolved.warning).toContain('Fixture route')
    })

    it('falls back to configured fallback path when discovery cannot resolve', () => {
        const resolved = resolveProductDetailPath({
            fixturePath: '/products/fixed',
            fixtureAvailable: false,
            fixtureError: 'HTTP 404',
            discoverySourcePath: '/products',
            discoveredPath: null,
            fallbackPath: '/products/fallback',
        })

        expect(resolved.strategy).toBe('fallback')
        expect(resolved.path).toBe('/products/fallback')
        expect(resolved.warning).toContain('Using configured fallback path')
    })

    it('throws actionable error when fixture and fallbacks are unavailable', () => {
        expect(() =>
            resolveProductDetailPath({
                fixturePath: '/products/fixed',
                fixtureAvailable: false,
                fixtureError: 'HTTP 404',
                discoverySourcePath: '/products',
                discoveredPath: null,
                discoveryError: 'no matching link found',
            }),
        ).toThrow(/Unable to resolve deterministic Lighthouse product detail route/)
    })
})
