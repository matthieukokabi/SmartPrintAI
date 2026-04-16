import { NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { sendMakeAbandonedCartCandidate } from '@/lib/make'
import { getRequestId, jsonWithRequestId, logApiError, logApiInfo, logApiWarn } from '@/lib/api-logging'
import { splitBlockedGootenReadyToBuyProducts } from '@/lib/gooten-ready-to-buy-safety'
import {
    BASE_CHECKOUT_ALLOWED_COUNTRIES,
    findUnsupportedProductsForDestination,
    getAllowedCountriesForCart,
} from '@/lib/product-destination-safety'

type CheckoutItem = {
    productId: string
    designId: string
    size: string
    color: string
    quantity: number
}

type CheckoutPayload = {
    items: CheckoutItem[]
    email?: string
    sessionId?: string
    destinationCountry?: string
}

const MAX_ITEMS = 25
const MAX_QUANTITY = 20

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function isNonEmptyString(value: unknown, maxLen = 200): value is string {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLen
}

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function validateCheckoutPayload(input: unknown):
    | { ok: true; data: CheckoutPayload }
    | { ok: false; error: string } {
    if (!isObject(input)) {
        return { ok: false, error: 'Invalid payload' }
    }

    const itemsRaw = input.items
    if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) {
        return { ok: false, error: 'No items in cart' }
    }

    if (itemsRaw.length > MAX_ITEMS) {
        return { ok: false, error: 'Too many cart items' }
    }

    const items: CheckoutItem[] = []
    for (const itemRaw of itemsRaw) {
        if (!isObject(itemRaw)) {
            return { ok: false, error: 'Invalid item payload' }
        }

        const { productId, designId, size, color, quantity } = itemRaw
        if (!isNonEmptyString(productId, 120)) {
            return { ok: false, error: 'Invalid productId' }
        }
        if (!isNonEmptyString(designId, 160)) {
            return { ok: false, error: 'Invalid designId' }
        }
        if (!isNonEmptyString(size, 40)) {
            return { ok: false, error: 'Invalid size' }
        }
        if (!isNonEmptyString(color, 60)) {
            return { ok: false, error: 'Invalid color' }
        }
        if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
            return { ok: false, error: 'Invalid quantity' }
        }

        items.push({
            productId,
            designId,
            size,
            color,
            quantity,
        })
    }

    let email: string | undefined
    if (input.email !== undefined && input.email !== null) {
        if (!isNonEmptyString(input.email, 254) || !isValidEmail(input.email)) {
            return { ok: false, error: 'Invalid email' }
        }
        email = input.email.trim().toLowerCase()
    }

    let sessionId: string | undefined
    if (input.sessionId !== undefined && input.sessionId !== null) {
        if (!isNonEmptyString(input.sessionId, 191)) {
            return { ok: false, error: 'Invalid sessionId' }
        }
        sessionId = input.sessionId.trim()
    }

    let destinationCountry: string | undefined
    if (input.destinationCountry !== undefined && input.destinationCountry !== null) {
        if (
            typeof input.destinationCountry !== 'string' ||
            !/^[a-z]{2}$/i.test(input.destinationCountry.trim())
        ) {
            return { ok: false, error: 'Invalid destinationCountry' }
        }

        destinationCountry = input.destinationCountry.trim().toUpperCase()
    }

    return {
        ok: true,
        data: {
            items,
            email,
            sessionId,
            destinationCountry,
        },
    }
}

export async function POST(req: NextRequest) {
    const route = '/api/checkout'
    const requestId = getRequestId(req)
    const respond = <T>(body: T, init?: ResponseInit) => jsonWithRequestId(requestId, body, init)

    logApiInfo(route, requestId, 'request_received')

    try {
        let rawPayload: unknown
        try {
            rawPayload = await req.json()
        } catch {
            logApiWarn(route, requestId, 'invalid_json')
            return respond({ error: 'Invalid JSON body' }, { status: 400 })
        }

        const validation = validateCheckoutPayload(rawPayload)
        if (!validation.ok) {
            logApiWarn(route, requestId, 'validation_failed', { reason: validation.error })
            return respond({ error: validation.error }, { status: 400 })
        }

        const { items, email, sessionId, destinationCountry } = validation.data

        const products = await prisma.product.findMany({
            where: { id: { in: items.map((i) => i.productId) } },
        })

        if (products.length !== new Set(items.map((i) => i.productId)).size) {
            logApiWarn(route, requestId, 'product_not_found', { itemCount: items.length })
            return respond({ error: 'One or more products were not found' }, { status: 400 })
        }

        const { blocked: blockedProducts } = splitBlockedGootenReadyToBuyProducts(products)
        if (blockedProducts.length > 0) {
            const blockedProductIds = blockedProducts.map((product) => product.id)
            logApiWarn(route, requestId, 'blocked_unsafe_gooten_ready_to_buy_checkout', {
                blockedProductIds,
                blockedProviderRefs: blockedProducts.map((product) => product.printfulId),
            })
            return respond(
                {
                    error: 'One or more items are temporarily unavailable while we update print production settings.',
                    blockedProductIds,
                },
                { status: 409 }
            )
        }

        const cartAllowedCountries = getAllowedCountriesForCart(products, BASE_CHECKOUT_ALLOWED_COUNTRIES) as
            Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[]
        if (cartAllowedCountries.length === 0) {
            logApiWarn(route, requestId, 'checkout_country_gate_empty', {
                productIds: products.map((product) => product.id),
                providerRefs: products.map((product) => product.printfulId),
            })
            return respond(
                {
                    error: 'One or more items cannot be shipped right now. Please remove them and try again.',
                },
                { status: 409 }
            )
        }

        if (destinationCountry) {
            if (
                !cartAllowedCountries.includes(
                    destinationCountry as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry
                )
            ) {
                const unsupportedProducts = findUnsupportedProductsForDestination(
                    products,
                    destinationCountry,
                    BASE_CHECKOUT_ALLOWED_COUNTRIES
                )
                const blockedProductIds = unsupportedProducts.map((product) => product.productId)
                logApiWarn(route, requestId, 'checkout_destination_country_blocked', {
                    destinationCountry,
                    blockedProductIds,
                    cartAllowedCountries,
                })
                return respond(
                    {
                        error: `Some items in your cart are not available for shipping to ${destinationCountry}.`,
                        blockedProductIds,
                        destinationCountry,
                        allowedCountries: cartAllowedCountries,
                    },
                    { status: 409 }
                )
            }
        }

        const productById = new Map(products.map((product) => [product.id, product]))

        const lineItems = items.map((item) => {
            const product = productById.get(item.productId)
            if (!product) {
                throw new Error(`Product missing at checkout mapping: ${item.productId}`)
            }

            return {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: product.name,
                        images: [],
                        metadata: {
                            productId: item.productId,
                            designId: item.designId,
                            size: item.size,
                            color: item.color,
                        },
                    },
                    unit_amount: Math.round(product.sellPrice * 100),
                },
                quantity: item.quantity,
            }
        })

        const metadata: Record<string, string> = {
            items: JSON.stringify(items),
        }
        if (sessionId) {
            metadata.sessionId = sessionId
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'paypal', 'link'],
            line_items: lineItems,
            mode: 'payment',
            customer_email: email,
            shipping_address_collection: {
                allowed_countries: cartAllowedCountries,
            },
            phone_number_collection: {
                enabled: true,
            },
            shipping_options: (() => {
                const subtotalCents = lineItems.reduce((sum, li) => sum + (li.price_data.unit_amount * li.quantity), 0)
                const freeShipping = subtotalCents >= 10000
                const opts: Stripe.Checkout.SessionCreateParams.ShippingOption[] = [
                    {
                        shipping_rate_data: {
                            type: 'fixed_amount',
                            fixed_amount: { amount: freeShipping ? 0 : 599, currency: 'usd' },
                            display_name: freeShipping ? 'Free Standard Shipping' : 'Standard Shipping',
                            delivery_estimate: {
                                minimum: { unit: 'business_day', value: 5 },
                                maximum: { unit: 'business_day', value: 10 },
                            },
                        },
                    },
                    {
                        shipping_rate_data: {
                            type: 'fixed_amount',
                            fixed_amount: { amount: freeShipping ? 599 : 1299, currency: 'usd' },
                            display_name: 'Express Shipping',
                            delivery_estimate: {
                                minimum: { unit: 'business_day', value: 2 },
                                maximum: { unit: 'business_day', value: 4 },
                            },
                        },
                    },
                ]
                return opts
            })(),
            metadata,
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cart`,
        })

        if (!session.url) {
            throw new Error('Stripe returned a checkout session without URL')
        }

        const cartTotal = Number(items.reduce((sum, item) => {
            const product = productById.get(item.productId)
            if (!product) {
                return sum
            }
            return sum + (product.sellPrice * item.quantity)
        }, 0).toFixed(2))

        await sendMakeAbandonedCartCandidate({
            requestId,
            stripeSessionId: session.id,
            checkoutUrl: session.url,
            email: email || null,
            sessionId: sessionId || null,
            itemCount: items.length,
            cartTotal,
            items: items.map((item) => ({
                productId: item.productId,
                designId: item.designId,
                size: item.size,
                color: item.color,
                quantity: item.quantity,
            })),
        })

        logApiInfo(route, requestId, 'request_succeeded', { itemCount: items.length })
        return respond({ url: session.url })
    } catch (error) {
        logApiError(route, requestId, 'request_failed', error)
        return respond({ error: 'Checkout failed' }, { status: 500 })
    }
}
