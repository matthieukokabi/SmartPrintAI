import type { Order } from '@/types'
import {
    ANALYTICS_ATTRIBUTION_COOKIE,
    ATTRIBUTION_COOKIE_MAX_AGE_SEC,
    buildAttributionContext,
    mergeAttributionWithFallback,
    normalizeAttributionFromParams,
    readAttributionCookie,
    serializeAttributionCookie,
    type AttributionContext,
    type StoredAttributionContext,
} from '@/lib/analytics-attribution'
import {
    HOMEPAGE_HERO_VARIANT_MAX_AGE_SEC,
    HOMEPAGE_VISITOR_ID_COOKIE,
    sanitizeVisitorId,
} from '@/lib/homepage-experiment'

declare global {
    interface Window {
        gtag?: (...args: unknown[]) => void
    }
}

type AnalyticsValue = unknown
type AnalyticsParams = Record<string, AnalyticsValue>
type BrowserNavigator = Navigator & {
    sendBeacon?: (url: string, data?: BodyInit | null) => boolean
}
type BrowserLocation = Pick<Location, 'protocol' | 'pathname' | 'search' | 'origin'>

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value)
}

function readCookieValue(cookieName: string): string | undefined {
    if (typeof document === 'undefined' || typeof document.cookie !== 'string') {
        return undefined
    }

    const rawCookieValue = document.cookie
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${cookieName}=`))
        ?.split('=')
        .slice(1)
        .join('=')

    if (!rawCookieValue) {
        return undefined
    }

    return rawCookieValue
}

function readVisitorIdFromDocumentCookie(): string | undefined {
    const rawCookieValue = readCookieValue(HOMEPAGE_VISITOR_ID_COOKIE)
    if (!rawCookieValue) {
        return undefined
    }

    try {
        return sanitizeVisitorId(decodeURIComponent(rawCookieValue)) || undefined
    } catch {
        return sanitizeVisitorId(rawCookieValue) || undefined
    }
}

function persistVisitorIdToDocumentCookie(visitorId: string, locationRef: BrowserLocation | undefined) {
    if (typeof document === 'undefined') {
        return
    }

    const secureAttribute = locationRef?.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${HOMEPAGE_VISITOR_ID_COOKIE}=${encodeURIComponent(visitorId)}; Max-Age=${HOMEPAGE_HERO_VARIANT_MAX_AGE_SEC}; Path=/; SameSite=Lax${secureAttribute}`
}

function persistAttributionToDocumentCookie(
    attribution: StoredAttributionContext,
    locationRef: BrowserLocation | undefined
) {
    if (typeof document === 'undefined') {
        return
    }
    const secureAttribute = locationRef?.protocol === 'https:' ? '; Secure' : ''
    const encoded = serializeAttributionCookie(attribution)
    document.cookie = `${ANALYTICS_ATTRIBUTION_COOKIE}=${encoded}; Max-Age=${ATTRIBUTION_COOKIE_MAX_AGE_SEC}; Path=/; SameSite=Lax${secureAttribute}`
}

function generateFallbackVisitorId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }

    return `spai_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function ensureVisitorId(
    params: AnalyticsParams,
    locationRef: BrowserLocation | undefined
): string {
    const fromParams = sanitizeVisitorId(isRecord(params) ? (params.visitor_id as string | null | undefined) : undefined)
    if (fromParams) {
        return fromParams
    }

    const fromCookie = readVisitorIdFromDocumentCookie()
    if (fromCookie) {
        return fromCookie
    }

    const generated = generateFallbackVisitorId()
    persistVisitorIdToDocumentCookie(generated, locationRef)
    return generated
}

function resolveFunnelAttribution(
    params: AnalyticsParams,
    visitorId: string,
    locationRef: BrowserLocation | undefined,
    navigatorRef: BrowserNavigator | undefined
): AttributionContext {
    const existing = normalizeAttributionFromParams(params)
    const rawAttributionCookie = readCookieValue(ANALYTICS_ATTRIBUTION_COOKIE)
    const fromCookie = readAttributionCookie(rawAttributionCookie, visitorId)

    const fallback = buildAttributionContext({
        visitorId,
        pathname: locationRef?.pathname || '/',
        search: locationRef?.search || '',
        referrer: typeof document !== 'undefined' ? document.referrer : null,
        origin: locationRef?.origin || null,
        userAgent: navigatorRef?.userAgent || null,
    })

    const resolved = mergeAttributionWithFallback(existing, fromCookie ? fromCookie : fallback)
    const shouldPersist = !fromCookie || fromCookie.visitor_id !== visitorId
    if (shouldPersist) {
        persistAttributionToDocumentCookie(
            {
                visitor_id: visitorId,
                captured_at: fromCookie?.captured_at || fallback.captured_at,
                ...resolved,
            },
            locationRef
        )
    }
    return resolved
}

export const HOMEPAGE_EVENT_NAMES = {
    viewed: 'homepage_viewed',
    ctaClicked: 'homepage_cta_clicked',
    sectionViewed: 'homepage_section_viewed',
    scrollDepthReached: 'homepage_scroll_depth_reached',
    toCreateClicked: 'homepage_to_create_clicked',
    createFlowStarted: 'create_flow_started',
} as const

export type HomepageEventName = (typeof HOMEPAGE_EVENT_NAMES)[keyof typeof HOMEPAGE_EVENT_NAMES]

export const PRODUCT_PROOF_EVENT_NAMES = {
    sectionViewed: 'product_proof_section_viewed',
    ctaClicked: 'product_proof_cta_clicked',
} as const

export type ProductProofEventName = (typeof PRODUCT_PROOF_EVENT_NAMES)[keyof typeof PRODUCT_PROOF_EVENT_NAMES]
export const CREATE_ENTRY_EVENT_NAMES = {
    pageViewed: 'create_page_viewed',
    entrypointResolved: 'create_entrypoint_resolved',
    promptInputFocused: 'create_prompt_input_focused',
    promptStarted: 'create_prompt_started',
    generationStarted: 'create_generation_started',
    productSelected: 'create_product_selected',
    templateSelected: 'create_template_selected',
    flowAbandonedEarly: 'create_flow_abandoned_early',
} as const

export type CreateEntryEventName = (typeof CREATE_ENTRY_EVENT_NAMES)[keyof typeof CREATE_ENTRY_EVENT_NAMES]
export type FunnelEventName = HomepageEventName | CreateEntryEventName | ProductProofEventName
const FORWARDED_FUNNEL_EVENTS = new Set<FunnelEventName>([
    ...Object.values(HOMEPAGE_EVENT_NAMES),
    ...Object.values(PRODUCT_PROOF_EVENT_NAMES),
    ...Object.values(CREATE_ENTRY_EVENT_NAMES),
])

type CreateEntrypoint = 'homepage' | 'other' | 'unknown'
type PromptLengthBucket = '0_2' | '3_10' | '11_30' | '31_80' | '81_plus'

function toNumber(value: unknown): number {
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n)) {
        return 0
    }
    return Math.round(n * 100) / 100
}

function cleanParams(params: AnalyticsParams): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== undefined)
    )
}

function forwardHomepageEvent(eventName: string, params: Record<string, unknown>) {
    if (typeof window === 'undefined' || !FORWARDED_FUNNEL_EVENTS.has(eventName as FunnelEventName)) {
        return
    }

    const pathname = typeof window.location?.pathname === 'string' ? window.location.pathname : '/'
    const search = typeof window.location?.search === 'string' ? window.location.search : ''

    const payload = JSON.stringify({
        eventName,
        params,
        path: `${pathname}${search}`,
        timestamp: new Date().toISOString(),
    })
    const navigatorApi = window.navigator as BrowserNavigator | undefined

    if (navigatorApi?.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' })
        navigatorApi.sendBeacon('/api/analytics/events', blob)
        return
    }

    void fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
    }).catch(() => undefined)
}

export function trackEvent(eventName: string, params: AnalyticsParams = {}): boolean {
    if (typeof window === 'undefined') {
        return false
    }

    const visitorId = ensureVisitorId(params, window.location as BrowserLocation | undefined)
    const baseParams: AnalyticsParams = {
        ...params,
        visitor_id: visitorId,
    }

    if (FORWARDED_FUNNEL_EVENTS.has(eventName as FunnelEventName)) {
        const attribution = resolveFunnelAttribution(
            baseParams,
            visitorId,
            window.location as BrowserLocation | undefined,
            window.navigator as BrowserNavigator | undefined
        )
        Object.assign(baseParams, attribution)
    }

    const sanitizedParams = cleanParams(baseParams)
    const gtag = window.gtag
    const canUseGtag = typeof gtag === 'function'
    if (canUseGtag) {
        gtag('event', eventName, sanitizedParams)
    }
    forwardHomepageEvent(eventName, sanitizedParams)
    return canUseGtag
}

export function trackHomepageViewed(params: {
    locale?: string
    page_variant?: string
    visitor_id?: string
}): boolean {
    return trackEvent(HOMEPAGE_EVENT_NAMES.viewed, params)
}

export function trackHomepageCtaClicked(params: {
    cta_location: string
    cta_label?: string
    destination?: string
    page_variant?: string
    visitor_id?: string
}): boolean {
    return trackEvent(HOMEPAGE_EVENT_NAMES.ctaClicked, params)
}

export function trackHomepageSectionViewed(params: {
    section_name: string
    page_variant?: string
    visitor_id?: string
}): boolean {
    return trackEvent(HOMEPAGE_EVENT_NAMES.sectionViewed, params)
}

export function trackHomepageScrollDepthReached(params: {
    scroll_depth_percent: number
    page_variant?: string
    visitor_id?: string
}): boolean {
    return trackEvent(HOMEPAGE_EVENT_NAMES.scrollDepthReached, params)
}

export function trackHomepageToCreateClicked(params: {
    cta_location: string
    cta_label?: string
    destination?: string
    page_variant?: string
    visitor_id?: string
}): boolean {
    return trackEvent(HOMEPAGE_EVENT_NAMES.toCreateClicked, params)
}

export function trackProductProofSectionViewed(params: {
    page_variant?: string
    visitor_id?: string
}): boolean {
    return trackEvent(PRODUCT_PROOF_EVENT_NAMES.sectionViewed, params)
}

export function trackProductProofCtaClicked(params: {
    cta_location: string
    cta_label?: string
    destination?: string
    page_variant?: string
    visitor_id?: string
}): boolean {
    return trackEvent(PRODUCT_PROOF_EVENT_NAMES.ctaClicked, params)
}

export function trackCreateFlowStarted(params: {
    entrypoint?: CreateEntrypoint
    referrer_path?: string
    locale?: string
    page_variant?: string
    visitor_id?: string
}): boolean {
    return trackEvent(HOMEPAGE_EVENT_NAMES.createFlowStarted, params)
}

export function trackCreatePageViewed(params: {
    entrypoint?: CreateEntrypoint
    referrer_path?: string
    locale?: string
    page_variant?: string
    visitor_id?: string
}): boolean {
    return trackEvent(CREATE_ENTRY_EVENT_NAMES.pageViewed, params)
}

export function trackCreateEntrypointResolved(params: {
    entrypoint?: CreateEntrypoint
    referrer_path?: string
    locale?: string
    page_variant?: string
    visitor_id?: string
}): boolean {
    return trackEvent(CREATE_ENTRY_EVENT_NAMES.entrypointResolved, params)
}

export function trackCreatePromptInputFocused(params: {
    entrypoint?: CreateEntrypoint
    locale?: string
    page_variant?: string
    visitor_id?: string
}): boolean {
    return trackEvent(CREATE_ENTRY_EVENT_NAMES.promptInputFocused, params)
}

export function trackCreatePromptStarted(params: {
    entrypoint?: CreateEntrypoint
    locale?: string
    page_variant?: string
    prompt_length_bucket?: PromptLengthBucket
    visitor_id?: string
}): boolean {
    return trackEvent(CREATE_ENTRY_EVENT_NAMES.promptStarted, params)
}

export function trackCreateGenerationStarted(params: {
    entrypoint?: CreateEntrypoint
    locale?: string
    page_variant?: string
    prompt_length_bucket?: PromptLengthBucket
    template_type?: string
    has_reference_image?: boolean
    visitor_id?: string
}): boolean {
    return trackEvent(CREATE_ENTRY_EVENT_NAMES.generationStarted, params)
}

export function trackCreateProductSelected(params: {
    entrypoint?: CreateEntrypoint
    locale?: string
    page_variant?: string
    product_type?: string
    product_id?: string
    visitor_id?: string
}): boolean {
    return trackEvent(CREATE_ENTRY_EVENT_NAMES.productSelected, params)
}

export function trackCreateTemplateSelected(params: {
    entrypoint?: CreateEntrypoint
    locale?: string
    page_variant?: string
    template_type?: string
    visitor_id?: string
}): boolean {
    return trackEvent(CREATE_ENTRY_EVENT_NAMES.templateSelected, params)
}

export function trackCreateFlowAbandonedEarly(params: {
    entrypoint?: CreateEntrypoint
    referrer_path?: string
    locale?: string
    page_variant?: string
    last_completed_step?: 'page_viewed' | 'prompt_focused' | 'prompt_started' | 'template_selected' | 'product_selected' | 'generation_started'
    prompt_length_bucket?: PromptLengthBucket
    visitor_id?: string
}): boolean {
    return trackEvent(CREATE_ENTRY_EVENT_NAMES.flowAbandonedEarly, params)
}

export function trackPurchase(order: Order): boolean {
    const items = (order.items || []).map((item) => ({
        item_id: item.productId,
        item_name: item.productId,
        item_variant: `${item.size} / ${item.color}`,
        price: toNumber(item.price),
        quantity: item.quantity,
    }))

    return trackEvent('purchase', {
        currency: 'USD',
        transaction_id: order.id,
        value: toNumber(order.total),
        shipping: toNumber(order.shippingCost),
        items,
    })
}
