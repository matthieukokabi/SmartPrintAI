const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const OWNER_PORTAL_EMAILS_ENV_KEY = 'OWNER_PORTAL_EMAILS'

export type OwnerPortalDecision = {
    allowed: boolean
    normalizedEmail: string | null
    allowedEmails: string[]
}

type EnvLike = Record<string, string | undefined>

function normalizeEmail(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
        return null
    }
    const trimmed = value.trim().toLowerCase()
    if (!trimmed || !EMAIL_PATTERN.test(trimmed)) {
        return null
    }
    return trimmed
}

function splitEmailList(value: string | undefined): string[] {
    if (!value || value.trim().length === 0) {
        return []
    }

    return value
        .split(/[,\n;]+/g)
        .map((entry) => normalizeEmail(entry))
        .filter((entry): entry is string => Boolean(entry))
}

export function getOwnerPortalAllowlist(env: EnvLike = process.env): string[] {
    const configured = splitEmailList(env[OWNER_PORTAL_EMAILS_ENV_KEY])
    if (configured.length > 0) {
        return Array.from(new Set(configured))
    }

    const fallback = normalizeEmail(env.SUPPORT_EMAIL)
    return fallback ? [fallback] : []
}

export function evaluateOwnerPortalAccess(
    email: string | null | undefined,
    env: EnvLike = process.env
): OwnerPortalDecision {
    const normalizedEmail = normalizeEmail(email)
    const allowedEmails = getOwnerPortalAllowlist(env)
    if (!normalizedEmail || allowedEmails.length === 0) {
        return {
            allowed: false,
            normalizedEmail,
            allowedEmails,
        }
    }

    return {
        allowed: allowedEmails.includes(normalizedEmail),
        normalizedEmail,
        allowedEmails,
    }
}

export function canAccessOwnerPortal(
    email: string | null | undefined,
    env: EnvLike = process.env
): boolean {
    return evaluateOwnerPortalAccess(email, env).allowed
}
