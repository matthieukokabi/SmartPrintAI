import { beforeEach, describe, expect, it } from 'vitest'
import {
    clearOwnerSessionCookie,
    createOwnerSessionToken,
    readOwnerSessionToken,
    setOwnerSessionCookie,
} from '@/lib/owner-auth-session'

function createCookieRecorder() {
    const calls: Array<{ name: string; value: string; options: Record<string, unknown> }> = []
    const response = {
        cookies: {
            set(name: string, value: string, options: Record<string, unknown>) {
                calls.push({ name, value, options })
            },
        },
    }
    return { response, calls }
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
        const { response, calls } = createCookieRecorder()

        setOwnerSessionCookie(response, token)

        expect(calls).toHaveLength(1)
        expect(calls[0].options).not.toHaveProperty('domain')
        expect(calls[0].options.path).toBe('/')
        expect(calls[0].options.maxAge).toBe(30 * 24 * 60 * 60)
    })

    it('sets and clears cookie using normalized production domain', () => {
        process.env.NEXT_PUBLIC_APP_URL = 'https://www.smartprintai.com'
        const token = createOwnerSessionToken('owner@smartprintai.com')
        const { response, calls } = createCookieRecorder()

        setOwnerSessionCookie(response, token)
        clearOwnerSessionCookie(response)

        expect(calls).toHaveLength(2)
        expect(calls[0].options.domain).toBe('smartprintai.com')
        expect(calls[1].options.domain).toBe('smartprintai.com')
        expect(calls[1].options.maxAge).toBe(0)
    })
})
