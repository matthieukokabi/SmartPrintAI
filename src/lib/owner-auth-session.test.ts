import { beforeEach, describe, expect, it } from 'vitest'
import {
    clearOwnerSessionCookie,
    createOwnerSessionToken,
    readOwnerSessionToken,
    setOwnerSessionCookie,
} from '@/lib/owner-auth-session'

function createCookieRecorder() {
    const calls: Array<{ name: string; value: string; options: Record<string, unknown> }> = []
    const appendedHeaders: string[] = []
    const response = {
        cookies: {
            set(name: string, value: string, options: Record<string, unknown>) {
                calls.push({ name, value, options })
            },
        },
        headers: {
            append(name: string, value: string) {
                if (name.toLowerCase() === 'set-cookie') {
                    appendedHeaders.push(value)
                }
            },
        },
    }
    return { response, calls, appendedHeaders }
}

describe('owner auth session token helpers', () => {
    beforeEach(() => {
        process.env.AUTH_SESSION_SECRET = 'test-secret-key-1234567890'
        delete process.env.NEXT_PUBLIC_APP_URL
    })

    it('creates and validates owner session token', () => {
        const token = createOwnerSessionToken('Owner@SmartPrintAI.com')
        expect(readOwnerSessionToken(token)).toEqual({ email: 'owner@smartprintai.com' })
    })

    it('rejects expired owner session token', () => {
        const token = createOwnerSessionToken('owner@smartprintai.com', -1)
        expect(readOwnerSessionToken(token)).toBeNull()
    })

    it('sets host-only cookie in local environments', () => {
        const token = createOwnerSessionToken('owner@smartprintai.com')
        const { response, calls, appendedHeaders } = createCookieRecorder()

        setOwnerSessionCookie(response, token)

        expect(calls).toHaveLength(1)
        expect(appendedHeaders).toHaveLength(0)
        expect(calls[0].options).not.toHaveProperty('domain')
        expect(calls[0].options.path).toBe('/')
        expect(calls[0].options.maxAge).toBe(30 * 24 * 60 * 60)
    })

    it('clears host-only + domain cookie variants to prevent stale owner sessions', () => {
        process.env.NEXT_PUBLIC_APP_URL = 'https://www.smartprintai.com'
        const token = createOwnerSessionToken('owner@smartprintai.com')
        const { response, calls, appendedHeaders } = createCookieRecorder()

        setOwnerSessionCookie(response, token)
        clearOwnerSessionCookie(response)

        expect(calls).toHaveLength(1)
        expect(calls[0].options.domain).toBe('smartprintai.com')
        expect(appendedHeaders).toEqual(
            expect.arrayContaining([
                expect.stringContaining('spai_owner_session=; Path=/;'),
                expect.stringContaining('spai_owner_session=; Path=/admin;'),
                expect.stringContaining('Domain=smartprintai.com'),
                expect.stringContaining('Domain=.smartprintai.com'),
                expect.stringContaining('Max-Age=0'),
                expect.stringContaining('Expires=Thu, 01 Jan 1970 00:00:00 GMT'),
            ]),
        )
        expect(appendedHeaders).toHaveLength(6)
    })
})
