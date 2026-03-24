export const DEFAULT_AUTH_CALLBACK_PATH = '/account/orders'
export const OWNER_AUTH_CALLBACK_PATH = '/admin'

const SAFE_CALLBACK_ORIGIN = 'https://smartprintai.com'

function toCallbackPath(url: URL): string {
    const path = `${url.pathname}${url.search}${url.hash}`
    return path || DEFAULT_AUTH_CALLBACK_PATH
}

function normalizeFallbackPath(fallbackPath: string): string {
    if (!fallbackPath || typeof fallbackPath !== 'string') {
        return DEFAULT_AUTH_CALLBACK_PATH
    }

    const trimmed = fallbackPath.trim()
    if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//')) {
        return DEFAULT_AUTH_CALLBACK_PATH
    }

    try {
        return toCallbackPath(new URL(trimmed, SAFE_CALLBACK_ORIGIN))
    } catch {
        return DEFAULT_AUTH_CALLBACK_PATH
    }
}

export function normalizeAuthCallbackPath(
    value: string | null | undefined,
    fallbackPath: string = DEFAULT_AUTH_CALLBACK_PATH,
): string {
    const normalizedFallback = normalizeFallbackPath(fallbackPath)
    if (typeof value !== 'string') {
        return normalizedFallback
    }

    const trimmed = value.trim()
    if (!trimmed) {
        return normalizedFallback
    }

    if (trimmed.startsWith('/')) {
        if (trimmed.startsWith('//')) {
            return normalizedFallback
        }
        try {
            return toCallbackPath(new URL(trimmed, SAFE_CALLBACK_ORIGIN))
        } catch {
            return normalizedFallback
        }
    }

    try {
        const parsed = new URL(trimmed)
        if (parsed.origin !== SAFE_CALLBACK_ORIGIN) {
            return normalizedFallback
        }
        return toCallbackPath(parsed)
    } catch {
        return normalizedFallback
    }
}

export function isOwnerPortalCallbackPath(value: string | null | undefined): boolean {
    const normalized = normalizeAuthCallbackPath(value, OWNER_AUTH_CALLBACK_PATH)
    return normalized === OWNER_AUTH_CALLBACK_PATH || normalized.startsWith(`${OWNER_AUTH_CALLBACK_PATH}/`)
}

export function buildSignInPath(callbackPath: string): string {
    const normalized = normalizeAuthCallbackPath(callbackPath)
    const params = new URLSearchParams({ callbackUrl: normalized })
    return `/signin?${params.toString()}`
}
