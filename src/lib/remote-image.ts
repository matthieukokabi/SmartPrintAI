type FetchImpl = (input: string, init?: RequestInit) => Promise<{
    ok: boolean
    status: number
    headers: { get(name: string): string | null }
}>

type SleepImpl = (ms: number) => Promise<void>

export type RemoteImageAvailabilityResult = {
    ready: boolean
    attempts: number
    lastStatus: number | null
    lastContentType: string | null
}

const DEFAULT_MAX_ATTEMPTS = 4
const DEFAULT_DELAY_MS = 1200

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

function isImageContentType(value: string | null): boolean {
    if (!value) {
        return true
    }
    return value.toLowerCase().startsWith('image/')
}

export function isGootenPreviewUrl(value: string): boolean {
    if (!value || typeof value !== 'string') {
        return false
    }

    try {
        const parsed = new URL(value)
        if (!/^https?:$/.test(parsed.protocol)) {
            return false
        }

        if (!parsed.hostname.toLowerCase().endsWith('amazonaws.com')) {
            return false
        }

        return /\/gooten-imgmanip\/live\/preview\//i.test(parsed.pathname)
    } catch {
        return false
    }
}

export async function waitForRemoteImageAvailability(
    url: string,
    options: {
        maxAttempts?: number
        delayMs?: number
        fetchImpl?: FetchImpl
        sleepImpl?: SleepImpl
    } = {}
): Promise<RemoteImageAvailabilityResult> {
    const maxAttempts = Math.max(1, Math.floor(options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS))
    const delayMs = Math.max(0, Math.floor(options.delayMs ?? DEFAULT_DELAY_MS))
    const fetchImpl = options.fetchImpl || (fetch as unknown as FetchImpl)
    const sleepImpl = options.sleepImpl || sleep

    let lastStatus: number | null = null
    let lastContentType: string | null = null

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            const response = await fetchImpl(url, {
                method: 'HEAD',
                cache: 'no-store',
                redirect: 'follow',
            })

            lastStatus = response.status
            lastContentType = response.headers.get('content-type')

            if (response.ok && isImageContentType(lastContentType)) {
                return {
                    ready: true,
                    attempts: attempt,
                    lastStatus,
                    lastContentType,
                }
            }
        } catch {
            lastStatus = null
            lastContentType = null
        }

        if (attempt < maxAttempts && delayMs > 0) {
            await sleepImpl(delayMs)
        }
    }

    return {
        ready: false,
        attempts: maxAttempts,
        lastStatus,
        lastContentType,
    }
}
