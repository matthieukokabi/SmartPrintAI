import type { Order } from '@/types'

declare global {
    interface Window {
        gtag?: (...args: unknown[]) => void
    }
}

type AnalyticsValue = unknown
type AnalyticsParams = Record<string, AnalyticsValue>

export const HOMEPAGE_EVENT_NAMES = {
    viewed: 'homepage_viewed',
    ctaClicked: 'homepage_cta_clicked',
    sectionViewed: 'homepage_section_viewed',
    scrollDepthReached: 'homepage_scroll_depth_reached',
    toCreateClicked: 'homepage_to_create_clicked',
    createFlowStarted: 'create_flow_started',
} as const

export type HomepageEventName = (typeof HOMEPAGE_EVENT_NAMES)[keyof typeof HOMEPAGE_EVENT_NAMES]

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

export function trackEvent(eventName: string, params: AnalyticsParams = {}): boolean {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
        return false
    }

    window.gtag('event', eventName, cleanParams(params))
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
