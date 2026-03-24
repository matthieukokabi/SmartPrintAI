import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getOwnerSessionFromRequest: vi.fn(),
    changeOwnerPassword: vi.fn(),
}))

vi.mock('@/lib/owner-auth-session', () => ({
    getOwnerSessionFromRequest: mocks.getOwnerSessionFromRequest,
}))

vi.mock('@/lib/owner-auth', () => ({
    changeOwnerPassword: mocks.changeOwnerPassword,
}))

import { POST } from './route'

function createRequest(body: string, headers: HeadersInit = {}) {
    return new NextRequest('http://localhost:3100/api/admin/auth/change-password', {
        method: 'POST',
        body,
        headers,
    })
}

describe('/api/admin/auth/change-password POST', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('returns 401 when owner session is missing', async () => {
        mocks.getOwnerSessionFromRequest.mockReturnValue(null)

        const res = await POST(createRequest(JSON.stringify({
            currentPassword: 'old',
            newPassword: 'new',
        })))

        expect(res.status).toBe(401)
        await expect(res.json()).resolves.toEqual({ error: 'Unauthorized' })
    })

    it('returns 400 when new password is too short', async () => {
        mocks.getOwnerSessionFromRequest.mockReturnValue({ email: 'owner@smartprintai.com' })
        mocks.changeOwnerPassword.mockResolvedValue({
            ok: false,
            code: 'password_too_short',
        })

        const res = await POST(createRequest(JSON.stringify({
            currentPassword: 'old',
            newPassword: 'short',
        })))

        expect(res.status).toBe(400)
        await expect(res.json()).resolves.toEqual({ error: 'New password is too short' })
    })

    it('updates owner password on valid payload', async () => {
        mocks.getOwnerSessionFromRequest.mockReturnValue({ email: 'owner@smartprintai.com' })
        mocks.changeOwnerPassword.mockResolvedValue({ ok: true })

        const res = await POST(createRequest(JSON.stringify({
            currentPassword: 'OwnerPassword123!',
            newPassword: 'OwnerPassword456!',
        }), { 'x-request-id': 'req-owner-change' }))

        expect(res.status).toBe(200)
        expect(res.headers.get('x-request-id')).toBe('req-owner-change')
        expect(mocks.changeOwnerPassword).toHaveBeenCalledWith(
            'owner@smartprintai.com',
            'OwnerPassword123!',
            'OwnerPassword456!',
        )
        await expect(res.json()).resolves.toEqual({ ok: true })
    })
})
