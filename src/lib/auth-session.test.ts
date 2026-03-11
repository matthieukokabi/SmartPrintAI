import { beforeEach, describe, expect, it } from 'vitest'
import {
    createSessionToken,
    createSignInLinkToken,
    readSessionToken,
    readSignInLinkToken,
} from './auth-session'

describe('auth-session token helpers', () => {
    beforeEach(() => {
        process.env.AUTH_SESSION_SECRET = 'test-secret-key-1234567890'
    })

    it('creates and validates sign-in link token', () => {
        const token = createSignInLinkToken('USER@Example.com')
        expect(readSignInLinkToken(token)).toEqual({ email: 'user@example.com' })
    })

    it('rejects tampered sign-in token', () => {
        const token = createSignInLinkToken('user@example.com')
        const [payload, signature] = token.split('.')
        const tamperedSignature = (signature.startsWith('a') ? 'b' : 'a') + signature.slice(1)
        const tampered = `${payload}.${tamperedSignature}`
        expect(readSignInLinkToken(tampered)).toBeNull()
    })

    it('rejects expired sign-in token', () => {
        const token = createSignInLinkToken('user@example.com', -1)
        expect(readSignInLinkToken(token)).toBeNull()
    })

    it('creates and validates session token', () => {
        const token = createSessionToken('user_123', 'user@example.com')
        expect(readSessionToken(token)).toEqual({
            userId: 'user_123',
            email: 'user@example.com',
        })
    })
})
