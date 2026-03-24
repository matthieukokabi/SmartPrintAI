import { describe, expect, it } from 'vitest'
import {
    buildSignInPath,
    DEFAULT_AUTH_CALLBACK_PATH,
    normalizeAuthCallbackPath,
} from '@/lib/auth-callback'

describe('auth callback helpers', () => {
    it('normalizes safe callback paths and strips external origins', () => {
        expect(normalizeAuthCallbackPath('/account/orders?tab=latest')).toBe('/account/orders?tab=latest')
        expect(normalizeAuthCallbackPath('https://smartprintai.com/account/orders?tab=items')).toBe('/account/orders?tab=items')
        expect(normalizeAuthCallbackPath('https://evil.example/admin/orders/abc')).toBe(DEFAULT_AUTH_CALLBACK_PATH)
        expect(normalizeAuthCallbackPath('//evil.example/redirect')).toBe(DEFAULT_AUTH_CALLBACK_PATH)
    })

    it('uses provided fallback when callback is missing or invalid', () => {
        expect(normalizeAuthCallbackPath(undefined, '/orders/abc')).toBe('/orders/abc')
        expect(normalizeAuthCallbackPath('not-a-path', '/orders/abc')).toBe('/orders/abc')
    })

    it('prevents customer magic-link callback paths from targeting admin routes', () => {
        expect(normalizeAuthCallbackPath('/admin')).toBe(DEFAULT_AUTH_CALLBACK_PATH)
        expect(normalizeAuthCallbackPath('/admin/orders/abc')).toBe(DEFAULT_AUTH_CALLBACK_PATH)
    })

    it('builds sign-in path with encoded callback', () => {
        expect(buildSignInPath('/account/orders')).toBe(
            '/signin?callbackUrl=%2Faccount%2Forders',
        )
    })
})
