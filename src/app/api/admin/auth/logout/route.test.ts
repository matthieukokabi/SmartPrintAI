import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    clearOwnerSessionCookie: vi.fn(),
}))

vi.mock('@/lib/owner-auth-session', () => ({
    clearOwnerSessionCookie: mocks.clearOwnerSessionCookie,
}))

import { GET, POST } from './route'

describe('/api/admin/auth/logout', () => {
    it('redirects to /admin/login and clears owner cookie on GET', async () => {
        const req = new NextRequest('http://localhost:3100/api/admin/auth/logout')
        const res = await GET(req)

        expect(res.status).toBe(307)
        expect(res.headers.get('location')).toBe('http://localhost:3100/admin/login')
        expect(mocks.clearOwnerSessionCookie).toHaveBeenCalledTimes(1)
    })

    it('clears owner cookie on POST', async () => {
        const req = new NextRequest('http://localhost:3100/api/admin/auth/logout', {
            method: 'POST',
        })
        const res = await POST(req)
        expect(res.status).toBe(200)
        expect(mocks.clearOwnerSessionCookie).toHaveBeenCalledTimes(1)
        await expect(res.json()).resolves.toEqual({ ok: true })
    })
})
