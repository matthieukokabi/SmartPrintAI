export const OWNER_ADMIN_DEFAULT_PATH = '/admin'
const SAFE_CALLBACK_ORIGIN = 'https://smartprintai.com'

function extractSafePath(rawPath: string): string | null {
    if (!rawPath.startsWith('/')) return null
    if (rawPath.startsWith('//')) return null

    try {
        const parsed = new URL(rawPath, SAFE_CALLBACK_ORIGIN)
        const nextPath = `${parsed.pathname}${parsed.search}${parsed.hash}`
        if (!nextPath.startsWith('/admin')) {
            return null
        }
        return nextPath
    } catch {
        return null
    }
}

export function normalizeOwnerAdminPath(
    value: string | null | undefined,
    fallbackPath: string = OWNER_ADMIN_DEFAULT_PATH,
): string {
    if (typeof value !== 'string') {
        return fallbackPath
    }

    const trimmed = value.trim()
    if (!trimmed) {
        return fallbackPath
    }

    if (trimmed.startsWith('/')) {
        return extractSafePath(trimmed) || fallbackPath
    }

    try {
        const parsed = new URL(trimmed)
        if (parsed.origin !== SAFE_CALLBACK_ORIGIN) {
            return fallbackPath
        }
        return extractSafePath(`${parsed.pathname}${parsed.search}${parsed.hash}`) || fallbackPath
    } catch {
        return fallbackPath
    }
}

export function buildOwnerLoginPath(nextPath: string = OWNER_ADMIN_DEFAULT_PATH): string {
    const normalized = normalizeOwnerAdminPath(nextPath, OWNER_ADMIN_DEFAULT_PATH)
    const params = new URLSearchParams({ next: normalized })
    return `/admin/login?${params.toString()}`
}

export function buildOwnerLogoutPath(nextPath: string = OWNER_ADMIN_DEFAULT_PATH): string {
    const normalized = normalizeOwnerAdminPath(nextPath, OWNER_ADMIN_DEFAULT_PATH)
    const params = new URLSearchParams({ next: normalized })
    return `/api/admin/auth/logout?${params.toString()}`
}
