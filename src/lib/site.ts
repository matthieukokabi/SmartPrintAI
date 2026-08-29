const DEFAULT_SITE_URL = 'https://print.zuerifix.tech'

export function getSiteUrl(): string {
    const raw = (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_SITE_URL).trim()
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    return withProtocol.replace(/\/+$/, '')
}

export function getMetadataBase(): URL {
    try {
        return new URL(getSiteUrl())
    } catch {
        return new URL(DEFAULT_SITE_URL)
    }
}

export function toAbsoluteUrl(pathOrUrl: string): string {
    if (/^https?:\/\//i.test(pathOrUrl)) {
        return pathOrUrl
    }

    const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
    return `${getSiteUrl()}${path}`
}
