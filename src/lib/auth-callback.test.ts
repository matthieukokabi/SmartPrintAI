import { describe, expect, it } from 'vitest'
import {
    buildSignInPath,
    DEFAULT_AUTH_CALLBACK_PATH,
    isOwnerPortalCallbackPath,
    normalizeAuthCallbackPath,
    OWNER_AUTH_CALLBACK_PATH,
} from '@/lib/auth-callback'

describe('auth callback helpers', () => {
    it('normalizes safe callback paths and strips external origins', () => {
        expect(normalizeAuthCallbackPath('/admin/orders/abc')).toBe('/admin/orders/abc')
        expect(normalizeAuthCallbackPath('https://smartprintai.com/admin/orders/abc?tab=items')).toBe('/admin/orders/abc?tab=items')
        expect(normalizeAuthCallbackPath('https://evil.example/admin/orders/abc')).toBe(DEFAULT_AUTH_CALLBACK_PATH)
        expect(normalizeAuthCallbackPath('//evil.example/redirect')).toBe(DEFAULT_AUTH_CALLBACK_PATH)
    })

    it('uses provided fallback when callback is missing or invalid', () => {
        expect(normalizeAuthCallbackPath(undefined, OWNER_AUTH_CALLBACK_PATH)).toBe(OWNER_AUTH_CALLBACK_PATH)
        expect(normalizeAuthCallbackPath('not-a-path', OWNER_AUTH_CALLBACK_PATH)).toBe(OWNER_AUTH_CALLBACK_PATH)
    })

    it('detects owner callback context', () => {
        expect(isOwnerPortalCallbackPath('/admin')).toBe(true)
        expect(isOwnerPortalCallbackPath('/admin/orders/abc')).toBe(true)
        expect(isOwnerPortalCallbackPath('/account/orders')).toBe(false)
    })

    it('builds sign-in path with encoded callback', () => {
        expect(buildSignInPath('/admin/orders/cmn3p5lxs000c8fl2tvkivxxw')).toBe(
            '/signin?callbackUrl=%2Fadmin%2Forders%2Fcmn3p5lxs000c8fl2tvkivxxw',
        )
    })
})
