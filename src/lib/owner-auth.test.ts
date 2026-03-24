import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    prisma: {
        ownerCredential: {
            findUnique: vi.fn(),
            create: vi.fn(),
            upsert: vi.fn(),
        },
    },
}))

vi.mock('@/lib/prisma', () => ({
    prisma: mocks.prisma,
}))

import { hashOwnerPassword } from '@/lib/owner-auth-password'
import {
    OWNER_AUTH_DEFAULT_MIN_PASSWORD_LENGTH,
    authenticateOwnerLogin,
    changeOwnerPassword,
} from '@/lib/owner-auth'

describe('owner auth service', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        process.env.OWNER_PORTAL_EMAILS = 'owner@smartprintai.com'
        delete process.env.OWNER_PORTAL_INITIAL_PASSWORD
        delete process.env.OWNER_PORTAL_INITIAL_PASSWORD_HASH
        delete process.env.OWNER_PORTAL_MIN_PASSWORD_LENGTH
    })

    it('authenticates stored owner credential', async () => {
        const hash = hashOwnerPassword('StoredPassword123!')
        mocks.prisma.ownerCredential.findUnique.mockResolvedValue({
            passwordHash: hash,
            mustRotatePassword: false,
        })

        const result = await authenticateOwnerLogin('owner@smartprintai.com', 'StoredPassword123!')
        expect(result).toEqual({
            ok: true,
            email: 'owner@smartprintai.com',
            mustRotatePassword: false,
        })
    })

    it('bootstraps first owner login from env password', async () => {
        process.env.OWNER_PORTAL_INITIAL_PASSWORD = 'BootstrapPass123!'
        mocks.prisma.ownerCredential.findUnique.mockResolvedValue(null)
        mocks.prisma.ownerCredential.create.mockResolvedValue({
            id: 'owner_1',
        })

        const result = await authenticateOwnerLogin('owner@smartprintai.com', 'BootstrapPass123!')
        expect(result).toEqual({
            ok: true,
            email: 'owner@smartprintai.com',
            mustRotatePassword: true,
        })
        expect(mocks.prisma.ownerCredential.create).toHaveBeenCalledTimes(1)
    })

    it('returns bootstrap_not_configured when no stored credential and no bootstrap secret', async () => {
        mocks.prisma.ownerCredential.findUnique.mockResolvedValue(null)

        const result = await authenticateOwnerLogin('owner@smartprintai.com', 'whatever')
        expect(result).toEqual({
            ok: false,
            code: 'bootstrap_not_configured',
        })
    })

    it('changes owner password and clears mustRotatePassword', async () => {
        const oldHash = hashOwnerPassword('OldPassword123!')
        mocks.prisma.ownerCredential.findUnique.mockResolvedValue({ passwordHash: oldHash })
        mocks.prisma.ownerCredential.upsert.mockResolvedValue({ id: 'owner_1' })

        const result = await changeOwnerPassword(
            'owner@smartprintai.com',
            'OldPassword123!',
            'NewPassword123!',
        )
        expect(result).toEqual({ ok: true })
        expect(mocks.prisma.ownerCredential.upsert).toHaveBeenCalledTimes(1)
    })

    it('enforces minimum password length for owner password change', async () => {
        mocks.prisma.ownerCredential.findUnique.mockResolvedValue({ passwordHash: hashOwnerPassword('OldPassword123!') })
        const tooShort = 'x'.repeat(OWNER_AUTH_DEFAULT_MIN_PASSWORD_LENGTH - 1)

        const result = await changeOwnerPassword(
            'owner@smartprintai.com',
            'OldPassword123!',
            tooShort,
        )
        expect(result).toEqual({
            ok: false,
            code: 'password_too_short',
        })
        expect(mocks.prisma.ownerCredential.upsert).not.toHaveBeenCalled()
    })
})
