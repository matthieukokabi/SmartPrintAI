import type { Order } from '@/types'

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

export const HOMEPAGE_EVENT_NAMES = {
    viewed: 'homepage_viewed',
    ctaClicked: 'homepage_cta_clicked',
    sectionViewed: 'homepage_section_viewed',
    scrollDepthReached: 'homepage_scroll_depth_reached',
    toCreateClicked: 'homepage_to_create_clicked',
    createFlowStarted: 'create_flow_started',
} as const

export type HomepageEventName = (typeof HOMEPAGE_EVENT_NAMES)[keyof typeof HOMEPAGE_EVENT_NAMES]
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
export type FunnelEventName = HomepageEventName | CreateEntryEventName
const FORWARDED_FUNNEL_EVENTS = new Set<FunnelEventName>([
    ...Object.values(HOMEPAGE_EVENT_NAMES),
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

    const sanitizedParams = cleanParams(params)
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
}): boolean {
    return trackEvent(HOMEPAGE_EVENT_NAMES.viewed, params)
}

export function trackHomepageCtaClicked(params: {
    cta_location: string
    cta_label?: string
    destination?: string
    page_variant?: string
}): boolean {
    return trackEvent(HOMEPAGE_EVENT_NAMES.ctaClicked, params)
}

export function trackHomepageSectionViewed(params: {
    section_name: string
    page_variant?: string
}): boolean {
    return trackEvent(HOMEPAGE_EVENT_NAMES.sectionViewed, params)
}

export function trackHomepageScrollDepthReached(params: {
    scroll_depth_percent: number
    page_variant?: string
}): boolean {
    return trackEvent(HOMEPAGE_EVENT_NAMES.scrollDepthReached, params)
}

export function trackHomepageToCreateClicked(params: {
    cta_location: string
    cta_label?: string
    destination?: string
    page_variant?: string
}): boolean {
    return trackEvent(HOMEPAGE_EVENT_NAMES.toCreateClicked, params)
}

export function trackCreateFlowStarted(params: {
    entrypoint?: CreateEntrypoint
    referrer_path?: string
    locale?: string
    page_variant?: string
}): boolean {
    return trackEvent(HOMEPAGE_EVENT_NAMES.createFlowStarted, params)
}

export function trackCreatePageViewed(params: {
    entrypoint?: CreateEntrypoint
    referrer_path?: string
    locale?: string
    page_variant?: string
}): boolean {
    return trackEvent(CREATE_ENTRY_EVENT_NAMES.pageViewed, params)
}

export function trackCreateEntrypointResolved(params: {
    entrypoint?: CreateEntrypoint
    referrer_path?: string
    locale?: string
    page_variant?: string
}): boolean {
    return trackEvent(CREATE_ENTRY_EVENT_NAMES.entrypointResolved, params)
}

export function trackCreatePromptInputFocused(params: {
    entrypoint?: CreateEntrypoint
    locale?: string
    page_variant?: string
}): boolean {
    return trackEvent(CREATE_ENTRY_EVENT_NAMES.promptInputFocused, params)
}

export function trackCreatePromptStarted(params: {
    entrypoint?: CreateEntrypoint
    locale?: string
    page_variant?: string
    prompt_length_bucket?: PromptLengthBucket
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
}): boolean {
    return trackEvent(CREATE_ENTRY_EVENT_NAMES.generationStarted, params)
}

export function trackCreateProductSelected(params: {
    entrypoint?: CreateEntrypoint
    locale?: string
    page_variant?: string
    product_type?: string
    product_id?: string
}): boolean {
    return trackEvent(CREATE_ENTRY_EVENT_NAMES.productSelected, params)
}

export function trackCreateTemplateSelected(params: {
    entrypoint?: CreateEntrypoint
    locale?: string
    page_variant?: string
    template_type?: string
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
