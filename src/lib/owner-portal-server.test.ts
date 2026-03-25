import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getOwnerSessionFromCookieStore: vi.fn(),
    canAccessOwnerPortal: vi.fn(),
    redirect: vi.fn((target: string) => {
        throw new Error(`NEXT_REDIRECT:${target}`)
    }),
}))

vi.mock('@/lib/owner-auth-session', () => ({
    getOwnerSessionFromCookieStore: mocks.getOwnerSessionFromCookieStore,
}))

vi.mock('@/lib/owner-portal', () => ({
    canAccessOwnerPortal: mocks.canAccessOwnerPortal,
}))

vi.mock('next/navigation', () => ({
    redirect: mocks.redirect,
}))

import { requireOwnerPortalSession } from '@/lib/owner-portal-server'

describe('owner portal server session guard', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('redirects to owner login when no session exists', () => {
        mocks.getOwnerSessionFromCookieStore.mockReturnValue(null)

        expect(() => requireOwnerPortalSession('/admin/orders/cmn3p5lxs000c8fl2tvkivxxw')).toThrow(
            'NEXT_REDIRECT:/admin/login?next=%2Fadmin%2Forders%2Fcmn3p5lxs000c8fl2tvkivxxw',
        )
        expect(mocks.canAccessOwnerPortal).not.toHaveBeenCalled()
    })

    it('clears stale owner session before returning to login when allowlist access fails', () => {
        mocks.getOwnerSessionFromCookieStore.mockReturnValue({ email: 'stale@smartprintai.com' })
        mocks.canAccessOwnerPortal.mockReturnValue(false)

        expect(() => requireOwnerPortalSession('/admin/orders/cmn3p5lxs000c8fl2tvkivxxw')).toThrow(
            'NEXT_REDIRECT:/api/admin/auth/logout?next=%2Fadmin%2Forders%2Fcmn3p5lxs000c8fl2tvkivxxw',
        )
    })

    it('returns active owner session when allowlist access passes', () => {
        const session = { email: 'matthieu.kokabi@gmail.com' }
        mocks.getOwnerSessionFromCookieStore.mockReturnValue(session)
        mocks.canAccessOwnerPortal.mockReturnValue(true)

        expect(requireOwnerPortalSession('/admin')).toEqual(session)
        expect(mocks.redirect).not.toHaveBeenCalled()
    })
})
