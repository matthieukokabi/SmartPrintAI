import { beforeEach, describe, expect, it } from 'vitest'
import { createOwnerSessionToken, readOwnerSessionToken } from '@/lib/owner-auth-session'

describe('owner auth session token helpers', () => {
    beforeEach(() => {
        process.env.AUTH_SESSION_SECRET = 'test-secret-key-1234567890'
    })

    it('creates and validates owner session token', () => {
        const token = createOwnerSessionToken('Owner@SmartPrintAI.com')
        expect(readOwnerSessionToken(token)).toEqual({ email: 'owner@smartprintai.com' })
    })

    it('rejects expired owner session token', () => {
        const token = createOwnerSessionToken('owner@smartprintai.com', -1)
        expect(readOwnerSessionToken(token)).toBeNull()
    })
})
