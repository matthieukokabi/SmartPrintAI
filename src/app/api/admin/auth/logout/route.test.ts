import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    clearOwnerSessionCookie: vi.fn(),
}))

vi.mock('@/lib/owner-auth-session', () => ({
    clearOwnerSessionCookie: mocks.clearOwnerSessionCookie,
}))

import { GET, POST } from './route'

describe('/api/admin/auth/logout', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        delete process.env.NEXT_PUBLIC_APP_URL
    })

    it('redirects to /admin/login with default admin next path and clears owner cookie on GET', async () => {
        const req = new NextRequest('http://localhost:3100/api/admin/auth/logout')
        const res = await GET(req)

        expect(res.status).toBe(307)
        expect(res.headers.get('location')).toBe('http://localhost:3100/admin/login?next=%2Fadmin')
        expect(mocks.clearOwnerSessionCookie).toHaveBeenCalledTimes(1)
    })

    it('preserves safe admin next path query on GET', async () => {
        const req = new NextRequest('http://localhost:3100/api/admin/auth/logout?next=%2Fadmin%2Forders%2Fcmn3p5lxs000c8fl2tvkivxxw')
        const res = await GET(req)

        expect(res.status).toBe(307)
        expect(res.headers.get('location')).toBe(
            'http://localhost:3100/admin/login?next=%2Fadmin%2Forders%2Fcmn3p5lxs000c8fl2tvkivxxw',
        )
        expect(mocks.clearOwnerSessionCookie).toHaveBeenCalledTimes(1)
    })

    it('uses configured public app origin instead of localhost when available', async () => {
        process.env.NEXT_PUBLIC_APP_URL = 'https://smartprintai.com'
        const req = new NextRequest('http://localhost:3100/api/admin/auth/logout')
        const res = await GET(req)

        expect(res.status).toBe(307)
        expect(res.headers.get('location')).toBe('https://smartprintai.com/admin/login?next=%2Fadmin')
        expect(mocks.clearOwnerSessionCookie).toHaveBeenCalledTimes(1)
    })

    it('uses forwarded host/proto when app origin is not configured', async () => {
        const req = new NextRequest('http://127.0.0.1:3000/api/admin/auth/logout', {
            headers: {
                'x-forwarded-host': 'smartprintai.com',
                'x-forwarded-proto': 'https',
            },
        })
        const res = await GET(req)

        expect(res.status).toBe(307)
        expect(res.headers.get('location')).toBe('https://smartprintai.com/admin/login?next=%2Fadmin')
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
