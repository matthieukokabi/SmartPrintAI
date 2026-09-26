/**
 * Single source of truth for shipping rates used at checkout AND
 * broadcast in the Google Merchant Center feed (<g:shipping>).
 * Keep these in sync with what Stripe charges, or Merchant Center
 * will mark the feed as misleading.
 *
 * Checkout (src/app/api/checkout/route.ts) charges ONE flat fee per
 * order in USD, identical for every destination it accepts:
 *   Standard  $5.99  (Stripe delivery estimate 5–10 business days)
 *   Express  $12.99  (Stripe delivery estimate 2–4 business days)
 * Destinations = BASE_CHECKOUT_ALLOWED_COUNTRIES, narrowed per product
 * by product-destination-safety.ts (e.g. Printful refs 793/679 = US only).
 */

import {
    BASE_CHECKOUT_ALLOWED_COUNTRIES,
    getAllowedCountriesForProduct,
} from '@/lib/product-destination-safety'

export type ShippingService = {
    service: string           // Display name, e.g. "Standard Shipping"
    priceUsd: number          // Decimal USD, flat per order
    minTransitDays: number    // business days, matches Stripe delivery_estimate
    maxTransitDays: number
}

export type ShippingRate = ShippingService & {
    country: string           // ISO-3166 alpha-2
}

// FREE-OVER-THRESHOLD INVARIANT (do not change without re-reading
// Google's shipping-cost policy):
//
// FREE_SHIPPING_THRESHOLD_USD applies ONLY to Standard shipping.
// Express stays at its full $12.99 price in the merchant-feed XML
// and in MC's shipping-services UI.
//
// The checkout in src/app/api/checkout/route.ts intentionally drops
// Express from $12.99 → $5.99 at $100+ subtotal as a customer-
// favorable surprise. This is policy-compliant under Google's
// "feed price >= checkout price" rule (charging less than advertised
// is fine; charging more is a violation).
//
// DO NOT enable a "Free shipping over $X" toggle on the SmartPrintAI
// Express services in Merchant Center's UI. That would advertise
// free express at $X+, but checkout would still charge $5.99 —
// feed > checkout = violation. Standard's free-over-$100 toggle is
// correct because checkout matches it exactly (free = free).
export const SHIPPING_SERVICES_USD: ShippingService[] = [
    { service: 'Standard Shipping', priceUsd: 5.99, minTransitDays: 5, maxTransitDays: 10 },
    { service: 'Express Shipping', priceUsd: 12.99, minTransitDays: 2, maxTransitDays: 4 },
]

// Every country checkout accepts gets the same two flat rates. The
// list is derived from the checkout gate so the feed can never
// advertise a destination checkout refuses.
export const SHIPPING_COUNTRIES: readonly string[] = BASE_CHECKOUT_ALLOWED_COUNTRIES

// Flat (country, service, price) rows — one per accepted country per
// service. Kept for callers that want the fully expanded table.
export const SHIPPING_RATES_USD: ShippingRate[] = SHIPPING_COUNTRIES.flatMap((country) =>
    SHIPPING_SERVICES_USD.map((svc) => ({ country, ...svc }))
)

// Production ("handling") time promised on /shipping: 2–5 business
// days before the parcel ships. Surfaced as item-level
// <g:min_handling_time>/<g:max_handling_time> in the merchant feed.
export const HANDLING_TIME_BUSINESS_DAYS = { min: 2, max: 5 } as const

// Free-shipping threshold reflected in the storefront UI and in
// Merchant Center's shipping services. Must match checkout's
// free-shipping logic (subtotalCents >= 10000).
export const FREE_SHIPPING_THRESHOLD_USD = 100

// Helpers to look up rates by service name (used by checkout to
// keep the Stripe payload shape identical to before).
export function getStandardRateUsd(): number {
    const r = SHIPPING_SERVICES_USD.find((x) => x.service === 'Standard Shipping')
    if (!r) throw new Error('SHIPPING_SERVICES_USD missing Standard Shipping')
    return r.priceUsd
}

export function getExpressRateUsd(): number {
    const r = SHIPPING_SERVICES_USD.find((x) => x.service === 'Express Shipping')
    if (!r) throw new Error('SHIPPING_SERVICES_USD missing Express Shipping')
    return r.priceUsd
}

/**
 * Shipping rows for one product: the checkout countries this product
 * can actually be shipped to (product-level US-only rules applied),
 * times the two flat services.
 */
export function getShippingRatesForProduct(product: {
    id?: string
    name?: string | null
    printfulId?: string | null
}): ShippingRate[] {
    const countries = getAllowedCountriesForProduct(product, SHIPPING_COUNTRIES)
    return countries.flatMap((country) => SHIPPING_SERVICES_USD.map((svc) => ({ country, ...svc })))
}
