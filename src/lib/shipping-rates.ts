/**
 * Single source of truth for shipping rates used at checkout AND
 * broadcast in the Google Merchant Center feed (<g:shipping>).
 * Keep these in sync with what Stripe charges, or Merchant Center
 * will mark the feed as misleading.
 */

export type ShippingRate = {
    country: string       // ISO-3166 alpha-2
    service: string       // Display name, e.g. "Standard Shipping"
    priceUsd: number      // Decimal USD
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
// US Express service in Merchant Center's UI. That would advertise
// free express at $X+, but checkout would still charge $5.99 —
// feed > checkout = violation. Standard's free-over-$100 toggle is
// correct because checkout matches it exactly (free = free).
export const SHIPPING_RATES_USD: ShippingRate[] = [
    { country: 'US', service: 'Standard Shipping', priceUsd: 5.99 },
    { country: 'US', service: 'Express Shipping', priceUsd: 12.99 },
    // Add additional countries here ONLY when checkout/route.ts also
    // accepts orders to those countries with a known flat rate.
    // Currently the storefront's BASE_CHECKOUT_ALLOWED_COUNTRIES is
    // mostly US-driven; international shipping is "calculated at
    // checkout" without a published flat rate, so we omit those
    // countries from the feed rather than lie.
]

// Free-shipping threshold reflected in the storefront UI and in
// Merchant Center's shipping services. Must match checkout's
// free-shipping logic (subtotalCents >= 10000).
export const FREE_SHIPPING_THRESHOLD_USD = 100

// Helpers to look up rates by service name (used by checkout to
// keep the Stripe payload shape identical to before).
export function getStandardRateUsd(): number {
    const r = SHIPPING_RATES_USD.find((x) => x.service === 'Standard Shipping')
    if (!r) throw new Error('SHIPPING_RATES_USD missing Standard Shipping')
    return r.priceUsd
}

export function getExpressRateUsd(): number {
    const r = SHIPPING_RATES_USD.find((x) => x.service === 'Express Shipping')
    if (!r) throw new Error('SHIPPING_RATES_USD missing Express Shipping')
    return r.priceUsd
}
