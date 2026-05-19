import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import {
    CONSENT_COOKIE_NAME,
    isValidConsentState,
    readConsentState,
    readConsentStateFromValue,
} from './consent'

function reqWithCookie(value: string | undefined): NextRequest {
    const headers: Record<string, string> = value
        ? { cookie: `${CONSENT_COOKIE_NAME}=${value}` }
        : {}
    return new NextRequest('http://localhost/x', { headers })
}

describe('isValidConsentState', () => {
    it('accepts the three valid values', () => {
        expect(isValidConsentState('accepted')).toBe(true)
        expect(isValidConsentState('rejected')).toBe(true)
        expect(isValidConsentState('unknown')).toBe(true)
    })

    it('rejects anything else, including malformed values that could come from a tampered cookie', () => {
        expect(isValidConsentState(null)).toBe(false)
        expect(isValidConsentState(undefined)).toBe(false)
        expect(isValidConsentState('')).toBe(false)
        expect(isValidConsentState('ACCEPTED')).toBe(false)
        expect(isValidConsentState('yes')).toBe(false)
    })
})

describe('readConsentState (NextRequest)', () => {
    it('returns "unknown" when the cookie is absent (default for first-time visitors)', () => {
        expect(readConsentState(reqWithCookie(undefined))).toBe('unknown')
    })

    it('returns the parsed cookie value when valid', () => {
        expect(readConsentState(reqWithCookie('accepted'))).toBe('accepted')
        expect(readConsentState(reqWithCookie('rejected'))).toBe('rejected')
    })

    it('falls back to "unknown" if the cookie was tampered with', () => {
        expect(readConsentState(reqWithCookie('garbage'))).toBe('unknown')
    })
})

describe('readConsentStateFromValue', () => {
    it('mirrors readConsentState semantics for callers that already have the raw value', () => {
        expect(readConsentStateFromValue('accepted')).toBe('accepted')
        expect(readConsentStateFromValue(null)).toBe('unknown')
        expect(readConsentStateFromValue('rejected')).toBe('rejected')
        expect(readConsentStateFromValue('bogus')).toBe('unknown')
    })
})
