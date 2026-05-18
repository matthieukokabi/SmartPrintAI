import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Regression for the import-time crash that blocked
// src/app/api/webhooks/printful/route.test.ts: prior to the lazy-init
// refactor, `import { ... } from '@/lib/resend'` would synchronously
// instantiate `new Resend(undefined)` when RESEND_API_KEY was unset,
// which the Resend SDK rejects with "Missing API key", crashing the
// importer's entire test suite at module-resolution time.

const ORIGINAL_KEY = process.env.RESEND_API_KEY

beforeEach(() => {
    vi.resetModules()
})

afterEach(() => {
    if (ORIGINAL_KEY === undefined) {
        delete process.env.RESEND_API_KEY
    } else {
        process.env.RESEND_API_KEY = ORIGINAL_KEY
    }
})

describe('@/lib/resend lazy init', () => {
    it('imports cleanly when RESEND_API_KEY is unset', async () => {
        delete process.env.RESEND_API_KEY
        await expect(import('./resend')).resolves.toBeDefined()
    })

    it('getResend() throws a clear error when called without RESEND_API_KEY', async () => {
        delete process.env.RESEND_API_KEY
        const mod = await import('./resend')
        expect(() => mod.getResend()).toThrow(/RESEND_API_KEY is not set/)
    })

    it('getResend() returns a singleton when RESEND_API_KEY is set', async () => {
        process.env.RESEND_API_KEY = 're_test_dummykey_for_unit_test'
        const mod = await import('./resend')
        const a = mod.getResend()
        const b = mod.getResend()
        expect(a).toBe(b)
    })
})
