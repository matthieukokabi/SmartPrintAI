import { describe, expect, it, vi } from 'vitest'

type HeaderEntry = {
    source: string
    headers: Array<{ key: string; value: string }>
}

type NextConfigLike = {
    headers?: () => Promise<HeaderEntry[]>
    images?: {
        remotePatterns?: Array<{
            protocol?: string
            hostname?: string
            pathname?: string
            port?: string
        }>
    }
}

function parseCspDirectives(value: string): Map<string, string> {
    const directives = new Map<string, string>()
    for (const token of value.split(';')) {
        const trimmed = token.trim()
        if (trimmed.length === 0) {
            continue
        }
        const [name, ...rest] = trimmed.split(/\s+/)
        directives.set(name, rest.join(' '))
    }
    return directives
}

async function loadNextConfig(cspMode?: string): Promise<NextConfigLike> {
    const previousMode = process.env.CSP_MODE
    if (cspMode) {
        process.env.CSP_MODE = cspMode
    } else {
        delete process.env.CSP_MODE
    }

    try {
        vi.resetModules()
        const nextConfigModule = await import('../../next.config.mjs')
        return nextConfigModule.default as NextConfigLike
    } finally {
        if (previousMode === undefined) {
            delete process.env.CSP_MODE
        } else {
            process.env.CSP_MODE = previousMode
        }
    }
}

describe('Wave 3 security headers regression', () => {
    it('keeps baseline headers and hardened CSP phase-3 defaults', async () => {
        const nextConfig = await loadNextConfig()
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

        const directives = parseCspDirectives(csp || '')
        expect(directives.get('default-src')).toBe("'self'")
        expect(directives.get('script-src')).toBe("'self' https:")
        expect(directives.get('script-src-elem')).toBe("'self' 'unsafe-inline' https:")
        expect(directives.get('script-src-attr')).toBe("'none'")
        expect(directives.get('style-src')).toBe("'self' 'unsafe-inline' https:")

        expect(csp).not.toContain("'unsafe-eval'")
    })

    it('keeps a rollback-safe legacy CSP mode', async () => {
        const nextConfig = await loadNextConfig('legacy')
        expect(typeof nextConfig.headers).toBe('function')

        const entries = await nextConfig.headers!()
        const globalEntry = entries.find((entry) => entry.source === '/:path*')
        expect(globalEntry).toBeTruthy()

        const headerMap = new Map(
            (globalEntry?.headers || []).map((header) => [header.key.toLowerCase(), header.value])
        )

        const csp = headerMap.get('content-security-policy')
        expect(csp).toBeTruthy()

        const directives = parseCspDirectives(csp || '')
        expect(directives.get('script-src')).toBe("'self' 'unsafe-inline' 'unsafe-eval' https:")
        expect(directives.has('script-src-elem')).toBe(false)
        expect(directives.has('script-src-attr')).toBe(false)
    })

    it('allows Gooten preview host used by product mockups', async () => {
        const nextConfig = await loadNextConfig()
        const remotePatterns = nextConfig.images?.remotePatterns || []

        expect(remotePatterns).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    protocol: 'https',
                    hostname: 's3.amazonaws.com',
                    pathname: '/gooten-imgmanip/**',
                }),
            ])
        )
    })
})
