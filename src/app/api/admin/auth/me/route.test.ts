import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getOwnerSessionFromRequest: vi.fn(),
    canAccessOwnerPortal: vi.fn(),
    getOwnerCredentialState: vi.fn(),
}))

vi.mock('@/lib/owner-auth-session', () => ({
    getOwnerSessionFromRequest: mocks.getOwnerSessionFromRequest,
}))

vi.mock('@/lib/owner-portal', () => ({
    canAccessOwnerPortal: mocks.canAccessOwnerPortal,
}))

vi.mock('@/lib/owner-auth', () => ({
    getOwnerCredentialState: mocks.getOwnerCredentialState,
}))

import { GET } from './route'

describe('/api/admin/auth/me GET', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('returns 401 when owner session is missing', async () => {
        mocks.getOwnerSessionFromRequest.mockReturnValue(null)

        const req = new NextRequest('http://localhost:3100/api/admin/auth/me')
        const res = await GET(req)
        expect(res.status).toBe(401)
    })

    it('returns owner session payload for authenticated owner', async () => {
        mocks.getOwnerSessionFromRequest.mockReturnValue({ email: 'owner@smartprintai.com' })
        mocks.canAccessOwnerPortal.mockReturnValue(true)
        mocks.getOwnerCredentialState.mockResolvedValue({ exists: true, mustRotatePassword: false })

        const req = new NextRequest('http://localhost:3100/api/admin/auth/me')
        const res = await GET(req)
        expect(res.status).toBe(200)
        await expect(res.json()).resolves.toEqual({
            owner: {
                email: 'owner@smartprintai.com',
                mustRotatePassword: false,
            },
        })
    })
})
