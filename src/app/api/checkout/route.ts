import { NextRequest } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { sendMakeAbandonedCartCandidate } from '@/lib/make'
import { getRequestId, jsonWithRequestId, logApiError, logApiInfo, logApiWarn } from '@/lib/api-logging'

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

    return {
        ok: true,
        data: {
            items,
            email,
            sessionId,
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

        const { items, email, sessionId } = validation.data

        const products = await prisma.product.findMany({
            where: { id: { in: items.map((i) => i.productId) } },
        })

        if (products.length !== new Set(items.map((i) => i.productId)).size) {
            logApiWarn(route, requestId, 'product_not_found', { itemCount: items.length })
            return respond({ error: 'One or more products were not found' }, { status: 400 })
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
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            customer_email: email,
            shipping_address_collection: {
                allowed_countries: ['US', 'CA', 'GB', 'DE', 'FR', 'AU', 'NL', 'BE', 'CH'],
            },
            phone_number_collection: {
                enabled: true,
            },
            shipping_options: [
                {
                    shipping_rate_data: {
                        type: 'fixed_amount',
                        fixed_amount: { amount: 599, currency: 'usd' },
                        display_name: 'Standard Shipping',
                        delivery_estimate: {
                            minimum: { unit: 'business_day', value: 5 },
                            maximum: { unit: 'business_day', value: 10 },
                        },
                    },
                },
            ],
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
