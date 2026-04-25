import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { printful } from '@/lib/printful'
import { getGootenClient } from '@/lib/gooten'
import { detectProductProvider } from '@/lib/product-provider'
import { sendOrderConfirmation } from '@/lib/resend'
import Stripe from 'stripe'

interface CheckoutItem {
    productId: string
    designId: string
    size: string
    color: string
    quantity: number
}

interface ProductColor {
    name: string
    hex: string
    printfulVariantId: number
}

function resolveGootenSku(product: { printArea: unknown; colors: unknown }, color: string): string | null {
    const printArea = (typeof product.printArea === 'object' && product.printArea !== null)
        ? product.printArea as Record<string, unknown>
        : null
    if (!printArea) return null

    const variantMapping = (typeof printArea.variantMapping === 'object' && printArea.variantMapping !== null)
        ? printArea.variantMapping as Record<string, string>
        : null
    const normalizedColor = color.trim().toLowerCase()
    const mappedSku = variantMapping?.[normalizedColor]
    if (typeof mappedSku === 'string' && mappedSku.trim()) return mappedSku.trim()

    const defaultSku = typeof printArea.providerDefaultSku === 'string' ? printArea.providerDefaultSku.trim() : ''
    return defaultSku || null
}

function getShippingDetails(session: Stripe.Checkout.Session): Stripe.Checkout.Session.ShippingDetails | null {
    if (session.shipping_details) return session.shipping_details
    const collected = (session as unknown as {
        collected_information?: { shipping_details?: Stripe.Checkout.Session.ShippingDetails }
    }).collected_information
    return collected?.shipping_details ?? null
}

async function processCheckoutSession(session: Stripe.Checkout.Session): Promise<void> {
    const existing = await prisma.order.findUnique({ where: { stripeSessionId: session.id } })
    if (existing) {
        console.log(`order_already_exists_idempotent: ${session.id} -> ${existing.id}`)
        return
    }

    const items: CheckoutItem[] = JSON.parse(session.metadata?.items || '[]')
    const shippingDetails = getShippingDetails(session)
    const customerEmail = session.customer_details?.email || session.customer_email

    if (!shippingDetails?.address) {
        console.error(`No shipping address in session: ${session.id}`)
        return
    }
    if (!customerEmail) {
        console.error(`No customer email in session: ${session.id}`)
        return
    }

    const products = await prisma.product.findMany({
        where: { id: { in: items.map((i) => i.productId) } },
    })
    const designs = await prisma.design.findMany({
        where: { id: { in: items.map((i) => i.designId) } },
    })

    const productById = new Map(products.map((p) => [p.id, p]))
    const designById = new Map(designs.map((d) => [d.id, d]))

    const printfulItems: CheckoutItem[] = []
    const gootenItems: CheckoutItem[] = []

    for (const item of items) {
        const product = productById.get(item.productId)
        if (!product) continue
        const provider = detectProductProvider(product.printfulId)
        if (provider === 'gooten') {
            gootenItems.push(item)
        } else {
            printfulItems.push(item)
        }
    }

    let printfulOrderId: string | null = null
    let gootenOrderId: string | null = null

    // ── Printful fulfillment ───────────────────────────────
    if (printfulItems.length > 0) {
        try {
            const printfulOrder = await printful.createOrder({
                email: customerEmail,
                shippingAddress: {
                    name: shippingDetails.name!,
                    address1: shippingDetails.address.line1!,
                    city: shippingDetails.address.city!,
                    state_code: shippingDetails.address.state || '',
                    country_code: shippingDetails.address.country!,
                    zip: shippingDetails.address.postal_code!,
                },
                items: printfulItems.map((item) => {
                    const product = productById.get(item.productId)!
                    const design = designById.get(item.designId)!
                    const colors = product.colors as unknown as ProductColor[]
                    const colorData = colors.find(
                        (c) => c.name.toLowerCase() === item.color.toLowerCase()
                    )
                    if (!colorData?.printfulVariantId) {
                        throw new Error(
                            `No Printful variant found for product "${product.name}" in color "${item.color}"`
                        )
                    }
                    return {
                        variantId: colorData.printfulVariantId,
                        quantity: item.quantity,
                        imageUrl: design.imageUrl,
                    }
                }),
            })
            printfulOrderId = String((printfulOrder as Record<string, unknown>).id)
            console.log(`Printful order created: ${printfulOrderId}`)
        } catch (err) {
            console.error('Printful order creation failed:', err)
        }
    }

    // ── Gooten fulfillment ─────────────────────────────────
    if (gootenItems.length > 0) {
        try {
            const gooten = getGootenClient()
            const gootenOrderItems = gootenItems.map((item) => {
                const product = productById.get(item.productId)!
                const design = designById.get(item.designId)!
                const sku = resolveGootenSku(product, item.color)
                if (!sku) {
                    throw new Error(
                        `No Gooten SKU found for product "${product.name}" in color "${item.color}"`
                    )
                }
                return {
                    SKU: sku,
                    Quantity: item.quantity,
                    Images: [{ Url: design.imageUrl }],
                }
            })

            const gootenOrder = await gooten.createOrder({
                ShipToAddress: {
                    FirstName: (shippingDetails.name || '').split(' ')[0] || 'Customer',
                    LastName: (shippingDetails.name || '').split(' ').slice(1).join(' ') || '',
                    Address1: shippingDetails.address.line1 || '',
                    City: shippingDetails.address.city || '',
                    State: shippingDetails.address.state || '',
                    PostalCode: shippingDetails.address.postal_code || '',
                    CountryCode: shippingDetails.address.country || 'US',
                    Email: customerEmail,
                },
                Items: gootenOrderItems,
                Payment: {
                    CurrencyCode: 'USD',
                },
            })

            const result = gootenOrder as Record<string, unknown>
            gootenOrderId = String(result.Id || result.id || result.OrderId || '')
            if (gootenOrderId) {
                console.log(`Gooten order created: ${gootenOrderId}`)
            }
        } catch (err) {
            console.error('Gooten order creation failed:', err)
        }
    }

    // ── Save order to DB ───────────────────────────────────
    const externalOrderId = [printfulOrderId, gootenOrderId ? `gooten:${gootenOrderId}` : null]
        .filter(Boolean)
        .join(',') || null

    try {
        const order = await prisma.order.create({
            data: {
                email: customerEmail,
                stripeSessionId: session.id,
                printfulOrderId: externalOrderId,
                status: 'processing',
                subtotal: session.amount_subtotal! / 100,
                shippingCost: session.shipping_cost?.amount_total
                    ? session.shipping_cost.amount_total / 100
                    : 5.99,
                total: session.amount_total! / 100,
                shippingAddress: { ...shippingDetails.address },
                items: {
                    create: items.map((item) => ({
                        productId: item.productId,
                        designId: item.designId,
                        size: item.size,
                        color: item.color,
                        quantity: item.quantity,
                        price: productById.get(item.productId)!.sellPrice,
                    })),
                },
            },
        })

        await sendOrderConfirmation({
            email: customerEmail,
            orderId: order.id,
            items,
            total: order.total,
        })
    } catch (err) {
        console.error('Order DB/email error:', err)
    }
}

export async function POST(req: NextRequest) {
    const body = await req.text()
    const sig = req.headers.get('stripe-signature')!

    let event: Stripe.Event
    try {
        event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch (err) {
        console.error('Webhook signature verification failed:', err)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.payment_status === 'paid') {
            await processCheckoutSession(session)
        } else if (session.payment_status === 'unpaid') {
            console.log(`async_payment_pending: ${session.id}`)
        } else {
            console.log(`checkout_session_completed_unhandled_status: ${session.id} payment_status=${session.payment_status}`)
        }
    } else if (event.type === 'checkout.session.async_payment_succeeded') {
        const stub = event.data.object as Stripe.Checkout.Session
        const fullSession = await stripe.checkout.sessions.retrieve(stub.id, {
            expand: ['line_items', 'line_items.data.price.product', 'customer_details'],
        })
        await processCheckoutSession(fullSession)
    } else if (event.type === 'checkout.session.async_payment_failed') {
        const session = event.data.object as Stripe.Checkout.Session
        console.warn(`async_payment_failed: ${session.id} payment_status=${session.payment_status}`)
    }

    return NextResponse.json({ ok: true })
}
