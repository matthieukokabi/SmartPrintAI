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
const FORWARDED_HOMEPAGE_EVENTS = new Set<HomepageEventName>(Object.values(HOMEPAGE_EVENT_NAMES))

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
    if (typeof window === 'undefined' || !FORWARDED_HOMEPAGE_EVENTS.has(eventName as HomepageEventName)) {
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
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
        return false
    }

    const sanitizedParams = cleanParams(params)
    window.gtag('event', eventName, sanitizedParams)
    forwardHomepageEvent(eventName, sanitizedParams)
    return true
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
    entrypoint?: 'homepage' | 'other' | 'unknown'
    referrer_path?: string
    locale?: string
}): boolean {
    return trackEvent(HOMEPAGE_EVENT_NAMES.createFlowStarted, params)
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
