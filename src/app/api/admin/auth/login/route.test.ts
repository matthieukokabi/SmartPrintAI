import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    rateLimitRequest: vi.fn(),
    authenticateOwnerLogin: vi.fn(),
    createOwnerSessionToken: vi.fn(),
    setOwnerSessionCookie: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
    rateLimitRequest: mocks.rateLimitRequest,
}))

vi.mock('@/lib/owner-auth', () => ({
    authenticateOwnerLogin: mocks.authenticateOwnerLogin,
}))

vi.mock('@/lib/owner-auth-session', () => ({
    createOwnerSessionToken: mocks.createOwnerSessionToken,
    setOwnerSessionCookie: mocks.setOwnerSessionCookie,
}))

import { POST } from './route'

function createRequest(body: string, headers: HeadersInit = {}) {
    return new NextRequest('http://localhost:3100/api/admin/auth/login', {
        method: 'POST',
        body,
        headers,
    })
}

describe('/api/admin/auth/login POST', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.rateLimitRequest.mockResolvedValue({
            allowed: true,
            limit: 20,
            remaining: 19,
            resetInSec: 60,
        })
        mocks.createOwnerSessionToken.mockReturnValue('owner-session-token')
    })

    it('returns 429 when owner login is rate limited', async () => {
        mocks.rateLimitRequest.mockResolvedValue({
            allowed: false,
            limit: 20,
            remaining: 0,
            resetInSec: 30,
        })

        const res = await POST(createRequest(JSON.stringify({
            email: 'owner@smartprintai.com',
            password: 'OwnerPassword123!',
        })))

        expect(res.status).toBe(429)
        expect(res.headers.get('retry-after')).toBe('30')
    })

    it('returns 401 for invalid owner credentials', async () => {
        mocks.authenticateOwnerLogin.mockResolvedValue({
            ok: false,
            code: 'invalid_credentials',
        })

        const res = await POST(createRequest(JSON.stringify({
            email: 'owner@smartprintai.com',
            password: 'wrong-password',
        })))

        expect(res.status).toBe(401)
        await expect(res.json()).resolves.toEqual({ error: 'Invalid owner credentials' })
    })

    it('returns 503 when owner bootstrap password is missing', async () => {
        mocks.authenticateOwnerLogin.mockResolvedValue({
            ok: false,
            code: 'bootstrap_not_configured',
        })

        const res = await POST(createRequest(JSON.stringify({
            email: 'owner@smartprintai.com',
            password: 'OwnerPassword123!',
        })))

        expect(res.status).toBe(503)
        await expect(res.json()).resolves.toEqual({
            error: 'Owner password is not configured. Set owner bootstrap credentials first.',
        })
    })

    it('sets owner session cookie and returns redirect path on success', async () => {
        mocks.authenticateOwnerLogin.mockResolvedValue({
            ok: true,
            email: 'owner@smartprintai.com',
            mustRotatePassword: false,
        })

        const res = await POST(createRequest(JSON.stringify({
            email: 'owner@smartprintai.com',
            password: 'OwnerPassword123!',
            next: '/admin/orders/cmn3p5lxs000c8fl2tvkivxxw',
        }), { 'x-request-id': 'req-owner-login' }))

        expect(res.status).toBe(200)
        expect(mocks.createOwnerSessionToken).toHaveBeenCalledWith('owner@smartprintai.com')
        expect(mocks.setOwnerSessionCookie).toHaveBeenCalledTimes(1)
        expect(res.headers.get('x-request-id')).toBe('req-owner-login')
        await expect(res.json()).resolves.toEqual({
            ok: true,
            nextPath: '/admin/orders/cmn3p5lxs000c8fl2tvkivxxw',
            mustRotatePassword: false,
        })
    })
})
