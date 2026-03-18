import { describe, expect, it } from 'vitest'

type HeaderEntry = {
    source: string
    headers: Array<{ key: string; value: string }>
}

describe('Wave 2 security headers regression', () => {
    it('keeps baseline security headers and hardened CSP defaults', async () => {
        const nextConfigModule = await import('../../next.config.mjs')
        const nextConfig = nextConfigModule.default as {
            headers?: () => Promise<HeaderEntry[]>
        }

        expect(typeof nextConfig.headers).toBe('function')

        const entries = await nextConfig.headers!()
        const globalEntry = entries.find((entry) => entry.source === '/:path*')

        expect(globalEntry).toBeTruthy()

        const headerMap = new Map(
            (globalEntry?.headers || []).map((header) => [header.key.toLowerCase(), header.value])
        )

        expect(headerMap.get('strict-transport-security')).toContain('max-age=31536000')
        expect(headerMap.get('x-frame-options')).toBe('DENY')
        expect(headerMap.get('x-content-type-options')).toBe('nosniff')
        expect(headerMap.get('referrer-policy')).toBe('strict-origin-when-cross-origin')

        const csp = headerMap.get('content-security-policy')
        expect(csp).toBeTruthy()
        expect(csp).toContain("default-src 'self'")
        expect(csp).toContain("script-src 'self' 'unsafe-inline' https:")
        expect(csp).toContain("script-src-attr 'none'")
        expect(csp).not.toContain("'unsafe-eval'")
    })
})
