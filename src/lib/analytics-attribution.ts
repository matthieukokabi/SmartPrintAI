import { HOMEPAGE_HERO_VARIANT_MAX_AGE_SEC, sanitizeVisitorId } from '@/lib/homepage-experiment'

export const ANALYTICS_ATTRIBUTION_COOKIE = 'spai_first_touch_attribution'
export const ATTRIBUTION_COOKIE_MAX_AGE_SEC = HOMEPAGE_HERO_VARIANT_MAX_AGE_SEC
export const ATTRIBUTION_BUCKET_DIRECT = 'direct'
export const ATTRIBUTION_BUCKET_INTERNAL = 'internal'
export const ATTRIBUTION_BUCKET_UNKNOWN = 'unknown'
const MAX_ATTRIBUTION_VALUE_LENGTH = 160
const MAX_REFERRER_LENGTH = 400
const MAX_PATH_LENGTH = 240

export type AnalyticsDeviceType = 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown'

export const ATTRIBUTION_FIELD_KEYS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'referrer',
    'referrer_domain',
    'landing_path',
    'device_type',
] as const

export type AttributionFieldKey = (typeof ATTRIBUTION_FIELD_KEYS)[number]

export type AttributionContext = {
    utm_source: string
    utm_medium: string
    utm_campaign: string
    utm_content: string
    utm_term: string
    referrer: string
    referrer_domain: string
    landing_path: string
    device_type: AnalyticsDeviceType
}

export type StoredAttributionContext = AttributionContext & {
    visitor_id: string
    captured_at: string
}

type BuildAttributionInput = {
    visitorId: string
    search?: string | null
    pathname?: string | null
    referrer?: string | null
    origin?: string | null
    userAgent?: string | null
}

function toNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null
    }
    const trimmed = value.trim()
    return trimmed ? trimmed : null
}

function normalizeValue(value: unknown, lowercase = false): string | null {
    const normalized = toNonEmptyString(value)
    if (!normalized) {
        return null
    }
    const cleaned = lowercase ? normalized.toLowerCase() : normalized
    return cleaned.slice(0, MAX_ATTRIBUTION_VALUE_LENGTH)
}

export function normalizeReferrerDomain(value: unknown): string {
    const normalized = normalizeValue(value, true)
    if (!normalized) {
        return ATTRIBUTION_BUCKET_UNKNOWN
    }
    if (
        normalized === ATTRIBUTION_BUCKET_DIRECT
        || normalized === ATTRIBUTION_BUCKET_INTERNAL
        || normalized === ATTRIBUTION_BUCKET_UNKNOWN
    ) {
        return normalized
    }
    return normalized.replace(/^www\./, '')
}

export function normalizeLandingPath(value: unknown): string {
    const normalized = toNonEmptyString(value)
    if (!normalized) {
        return '/'
    }
    if (normalized === ATTRIBUTION_BUCKET_UNKNOWN) {
        return '/'
    }
    if (normalized.startsWith('/')) {
        return normalized.slice(0, MAX_PATH_LENGTH)
    }
    return `/${normalized}`.slice(0, MAX_PATH_LENGTH)
}

function safeParseUrl(value: string): URL | null {
    try {
        return new URL(value)
    } catch {
        return null
    }
}

function normalizeReferrer(inputReferrer: string | null, origin: string | null): {
    referrer: string
    referrerDomain: string
} {
    if (!inputReferrer) {
        return {
            referrer: ATTRIBUTION_BUCKET_DIRECT,
            referrerDomain: ATTRIBUTION_BUCKET_DIRECT,
        }
    }

    if (inputReferrer.startsWith('/')) {
        return {
            referrer: ATTRIBUTION_BUCKET_INTERNAL,
            referrerDomain: ATTRIBUTION_BUCKET_INTERNAL,
        }
    }

    const referrerUrl = safeParseUrl(inputReferrer)
    if (!referrerUrl) {
        return {
            referrer: ATTRIBUTION_BUCKET_UNKNOWN,
            referrerDomain: ATTRIBUTION_BUCKET_UNKNOWN,
        }
    }

    const currentOrigin = origin ? safeParseUrl(origin) : null
    if (currentOrigin && referrerUrl.origin === currentOrigin.origin) {
        return {
            referrer: ATTRIBUTION_BUCKET_INTERNAL,
            referrerDomain: ATTRIBUTION_BUCKET_INTERNAL,
        }
    }

    const serialized = `${referrerUrl.protocol}//${referrerUrl.host}${referrerUrl.pathname}${referrerUrl.search}`
    return {
        referrer: serialized.slice(0, MAX_REFERRER_LENGTH),
        referrerDomain: normalizeReferrerDomain(referrerUrl.hostname),
    }
}

export function classifyAnalyticsDeviceType(userAgent: string | null | undefined): AnalyticsDeviceType {
    if (!userAgent || userAgent.trim().length === 0) {
        return 'unknown'
    }
    const value = userAgent.toLowerCase()

    if (value.includes('bot') || value.includes('crawler') || value.includes('spider') || value.includes('slurp')) {
        return 'bot'
    }
    if (value.includes('ipad') || value.includes('tablet')) {
        return 'tablet'
    }
    if (value.includes('mobile') || value.includes('iphone') || value.includes('android')) {
        return 'mobile'
    }
    return 'desktop'
}

function toAttributionUtmBucket(value: unknown): string {
    return normalizeValue(value, true) || ATTRIBUTION_BUCKET_UNKNOWN
}

function toSourceBucket(
    utmSource: string,
    referrerDomain: string
): string {
    if (utmSource !== ATTRIBUTION_BUCKET_UNKNOWN) {
        return utmSource
    }
    if (
        referrerDomain === ATTRIBUTION_BUCKET_DIRECT
        || referrerDomain === ATTRIBUTION_BUCKET_INTERNAL
        || referrerDomain === ATTRIBUTION_BUCKET_UNKNOWN
    ) {
        return referrerDomain
    }
    return referrerDomain
}

function parseUtmValues(search: string | null | undefined): {
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    utm_term?: string
} {
    if (!search) {
        return {}
    }

    const query = search.startsWith('?') ? search.slice(1) : search
    if (!query) {
        return {}
    }

    const params = new URLSearchParams(query)
    return {
        utm_source: params.get('utm_source') || undefined,
        utm_medium: params.get('utm_medium') || undefined,
        utm_campaign: params.get('utm_campaign') || undefined,
        utm_content: params.get('utm_content') || undefined,
        utm_term: params.get('utm_term') || undefined,
    }
}

export function normalizeAttributionFromParams(params: Record<string, unknown>): AttributionContext {
    const deviceType = toNonEmptyString(params.device_type)
    const normalizedDeviceType: AnalyticsDeviceType = deviceType === 'desktop'
        || deviceType === 'mobile'
        || deviceType === 'tablet'
        || deviceType === 'bot'
        || deviceType === 'unknown'
        ? deviceType
        : 'unknown'

    return {
        utm_source: toAttributionUtmBucket(params.utm_source),
        utm_medium: toAttributionUtmBucket(params.utm_medium),
        utm_campaign: toAttributionUtmBucket(params.utm_campaign),
        utm_content: toAttributionUtmBucket(params.utm_content),
        utm_term: toAttributionUtmBucket(params.utm_term),
        referrer: normalizeValue(params.referrer) || ATTRIBUTION_BUCKET_UNKNOWN,
        referrer_domain: normalizeReferrerDomain(params.referrer_domain),
        landing_path: normalizeLandingPath(params.landing_path),
        device_type: normalizedDeviceType,
    }
}

export function buildAttributionContext(input: BuildAttributionInput): StoredAttributionContext {
    const utmValues = parseUtmValues(input.search)
    const referrer = normalizeReferrer(toNonEmptyString(input.referrer), toNonEmptyString(input.origin))
    const utmSource = toAttributionUtmBucket(utmValues.utm_source)
    const referrerDomain = normalizeReferrerDomain(referrer.referrerDomain)

    return {
        visitor_id: input.visitorId,
        captured_at: new Date().toISOString(),
        utm_source: toSourceBucket(utmSource, referrerDomain),
        utm_medium: toAttributionUtmBucket(utmValues.utm_medium),
        utm_campaign: toAttributionUtmBucket(utmValues.utm_campaign),
        utm_content: toAttributionUtmBucket(utmValues.utm_content),
        utm_term: toAttributionUtmBucket(utmValues.utm_term),
        referrer: referrer.referrer,
        referrer_domain: referrerDomain,
        landing_path: normalizeLandingPath(input.pathname),
        device_type: classifyAnalyticsDeviceType(input.userAgent),
    }
}

export function mergeAttributionWithFallback(
    incoming: Partial<AttributionContext> | null | undefined,
    fallback: AttributionContext
): AttributionContext {
    const partial = incoming || {}

    const normalized: AttributionContext = {
        utm_source: toAttributionUtmBucket(partial.utm_source),
        utm_medium: toAttributionUtmBucket(partial.utm_medium),
        utm_campaign: toAttributionUtmBucket(partial.utm_campaign),
        utm_content: toAttributionUtmBucket(partial.utm_content),
        utm_term: toAttributionUtmBucket(partial.utm_term),
        referrer: normalizeValue(partial.referrer) || ATTRIBUTION_BUCKET_UNKNOWN,
        referrer_domain: normalizeReferrerDomain(partial.referrer_domain),
        landing_path: normalizeLandingPath(partial.landing_path),
        device_type: partial.device_type || 'unknown',
    }

    if (!normalized.utm_source || normalized.utm_source === ATTRIBUTION_BUCKET_UNKNOWN) {
        normalized.utm_source = fallback.utm_source
    }
    if (!normalized.utm_medium || normalized.utm_medium === ATTRIBUTION_BUCKET_UNKNOWN) {
        normalized.utm_medium = fallback.utm_medium
    }
    if (!normalized.utm_campaign || normalized.utm_campaign === ATTRIBUTION_BUCKET_UNKNOWN) {
        normalized.utm_campaign = fallback.utm_campaign
    }
    if (!normalized.utm_content || normalized.utm_content === ATTRIBUTION_BUCKET_UNKNOWN) {
        normalized.utm_content = fallback.utm_content
    }
    if (!normalized.utm_term || normalized.utm_term === ATTRIBUTION_BUCKET_UNKNOWN) {
        normalized.utm_term = fallback.utm_term
    }
    if (!normalized.referrer || normalized.referrer === ATTRIBUTION_BUCKET_UNKNOWN) {
        normalized.referrer = fallback.referrer
    }
    if (!normalized.referrer_domain || normalized.referrer_domain === ATTRIBUTION_BUCKET_UNKNOWN) {
        normalized.referrer_domain = fallback.referrer_domain
    }
    if (!normalized.landing_path || normalized.landing_path === '/') {
        normalized.landing_path = fallback.landing_path
    }
    if (!normalized.device_type || normalized.device_type === 'unknown') {
        normalized.device_type = fallback.device_type
    }

    normalized.utm_source = toSourceBucket(normalized.utm_source, normalized.referrer_domain)
    return normalized
}

export function serializeAttributionCookie(context: StoredAttributionContext): string {
    return encodeURIComponent(JSON.stringify(context))
}

export function readAttributionCookie(rawCookieValue: string | null | undefined, visitorId?: string): StoredAttributionContext | null {
    if (!rawCookieValue) {
        return null
    }

    let decoded: string
    try {
        decoded = decodeURIComponent(rawCookieValue)
    } catch {
        decoded = rawCookieValue
    }

    let parsed: unknown
    try {
        parsed = JSON.parse(decoded)
    } catch {
        return null
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return null
    }

    const value = parsed as Record<string, unknown>
    const cookieVisitorId = sanitizeVisitorId(toNonEmptyString(value.visitor_id))
    if (!cookieVisitorId) {
        return null
    }
    if (visitorId && cookieVisitorId !== visitorId) {
        return null
    }

    const fallback = buildAttributionContext({
        visitorId: cookieVisitorId,
        pathname: toNonEmptyString(value.landing_path) || '/',
        userAgent: toNonEmptyString(value.device_type) || undefined,
    })
    const normalized = mergeAttributionWithFallback(
        normalizeAttributionFromParams(value),
        fallback
    )

    return {
        visitor_id: cookieVisitorId,
        captured_at: toNonEmptyString(value.captured_at) || new Date().toISOString(),
        ...normalized,
    }
}
