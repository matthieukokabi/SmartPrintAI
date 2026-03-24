import { timingSafeEqual } from 'crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { canAccessOwnerPortal } from '@/lib/owner-portal'
import { hashOwnerPassword, verifyOwnerPassword } from '@/lib/owner-auth-password'

export const OWNER_AUTH_INITIAL_PASSWORD_ENV_KEY = 'OWNER_PORTAL_INITIAL_PASSWORD'
export const OWNER_AUTH_INITIAL_PASSWORD_HASH_ENV_KEY = 'OWNER_PORTAL_INITIAL_PASSWORD_HASH'
export const OWNER_AUTH_MIN_PASSWORD_LENGTH_ENV_KEY = 'OWNER_PORTAL_MIN_PASSWORD_LENGTH'
export const OWNER_AUTH_DEFAULT_MIN_PASSWORD_LENGTH = 12

export type OwnerLoginResult =
    | { ok: true; email: string; mustRotatePassword: boolean }
    | { ok: false; code: 'invalid_credentials' | 'bootstrap_not_configured' }

export type OwnerPasswordChangeResult =
    | { ok: true }
    | { ok: false; code: 'invalid_credentials' | 'bootstrap_not_configured' | 'password_too_short' }

function normalizeEmail(value: string): string {
    return value.trim().toLowerCase()
}

function secureStringEqual(a: string, b: string): boolean {
    const left = Buffer.from(a, 'utf8')
    const right = Buffer.from(b, 'utf8')
    if (left.length !== right.length) {
        return false
    }
    return timingSafeEqual(left, right)
}

function getMinPasswordLength(env: NodeJS.ProcessEnv = process.env): number {
    const raw = Number(env[OWNER_AUTH_MIN_PASSWORD_LENGTH_ENV_KEY])
    if (!Number.isFinite(raw) || raw < 8 || raw > 128) {
        return OWNER_AUTH_DEFAULT_MIN_PASSWORD_LENGTH
    }
    return Math.floor(raw)
}

function validateNewPasswordStrength(password: string, env: NodeJS.ProcessEnv = process.env): boolean {
    return password.length >= getMinPasswordLength(env)
}

function verifyBootstrapPassword(password: string, env: NodeJS.ProcessEnv = process.env): {
    configured: boolean
    valid: boolean
} {
    const bootstrapHash = env[OWNER_AUTH_INITIAL_PASSWORD_HASH_ENV_KEY]?.trim()
    if (bootstrapHash) {
        return {
            configured: true,
            valid: verifyOwnerPassword(password, bootstrapHash),
        }
    }

    const bootstrapPassword = env[OWNER_AUTH_INITIAL_PASSWORD_ENV_KEY]?.trim()
    if (!bootstrapPassword) {
        return { configured: false, valid: false }
    }

    return {
        configured: true,
        valid: secureStringEqual(password, bootstrapPassword),
    }
}

export async function getOwnerCredentialState(email: string): Promise<{ exists: boolean; mustRotatePassword: boolean }> {
    const normalizedEmail = normalizeEmail(email)
    const existing = await prisma.ownerCredential.findUnique({
        where: { email: normalizedEmail },
        select: { mustRotatePassword: true },
    })

    if (!existing) {
        return { exists: false, mustRotatePassword: false }
    }

    return {
        exists: true,
        mustRotatePassword: existing.mustRotatePassword,
    }
}

export async function authenticateOwnerLogin(
    email: string,
    password: string,
    env: NodeJS.ProcessEnv = process.env,
): Promise<OwnerLoginResult> {
    const normalizedEmail = normalizeEmail(email)
    if (!canAccessOwnerPortal(normalizedEmail, env)) {
        return { ok: false, code: 'invalid_credentials' }
    }

    const existing = await prisma.ownerCredential.findUnique({
        where: { email: normalizedEmail },
        select: { passwordHash: true, mustRotatePassword: true },
    })

    if (existing) {
        if (!verifyOwnerPassword(password, existing.passwordHash)) {
            return { ok: false, code: 'invalid_credentials' }
        }
        return {
            ok: true,
            email: normalizedEmail,
            mustRotatePassword: existing.mustRotatePassword,
        }
    }

    const bootstrap = verifyBootstrapPassword(password, env)
    if (!bootstrap.configured) {
        return { ok: false, code: 'bootstrap_not_configured' }
    }
    if (!bootstrap.valid) {
        return { ok: false, code: 'invalid_credentials' }
    }

    try {
        await prisma.ownerCredential.create({
            data: {
                email: normalizedEmail,
                passwordHash: hashOwnerPassword(password),
                mustRotatePassword: true,
            },
        })

        return {
            ok: true,
            email: normalizedEmail,
            mustRotatePassword: true,
        }
    } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
            throw error
        }

        const racedRecord = await prisma.ownerCredential.findUnique({
            where: { email: normalizedEmail },
            select: { passwordHash: true, mustRotatePassword: true },
        })
        if (!racedRecord || !verifyOwnerPassword(password, racedRecord.passwordHash)) {
            return { ok: false, code: 'invalid_credentials' }
        }

        return {
            ok: true,
            email: normalizedEmail,
            mustRotatePassword: racedRecord.mustRotatePassword,
        }
    }
}

export async function changeOwnerPassword(
    email: string,
    currentPassword: string,
    newPassword: string,
    env: NodeJS.ProcessEnv = process.env,
): Promise<OwnerPasswordChangeResult> {
    const normalizedEmail = normalizeEmail(email)
    if (!canAccessOwnerPortal(normalizedEmail, env)) {
        return { ok: false, code: 'invalid_credentials' }
    }

    if (!validateNewPasswordStrength(newPassword, env)) {
        return { ok: false, code: 'password_too_short' }
    }

    const existing = await prisma.ownerCredential.findUnique({
        where: { email: normalizedEmail },
        select: { passwordHash: true },
    })

    if (existing) {
        if (!verifyOwnerPassword(currentPassword, existing.passwordHash)) {
            return { ok: false, code: 'invalid_credentials' }
        }
    } else {
        const bootstrap = verifyBootstrapPassword(currentPassword, env)
        if (!bootstrap.configured) {
            return { ok: false, code: 'bootstrap_not_configured' }
        }
        if (!bootstrap.valid) {
            return { ok: false, code: 'invalid_credentials' }
        }
    }

    await prisma.ownerCredential.upsert({
        where: { email: normalizedEmail },
        create: {
            email: normalizedEmail,
            passwordHash: hashOwnerPassword(newPassword),
            mustRotatePassword: false,
        },
        update: {
            passwordHash: hashOwnerPassword(newPassword),
            mustRotatePassword: false,
        },
    })

    return { ok: true }
}
