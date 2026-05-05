import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { printful } from '@/lib/printful'
import { buildPrintFile, type PrintFileResult } from '@/lib/print-file'
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

function derivePaymentProvider(
    session: Stripe.Checkout.Session,
    eventType: string
): string {
    if (eventType === 'checkout.session.async_payment_succeeded') {
        return 'paypal'
    }
    const types = session.payment_method_types || []
    if (types.length === 1) return types[0]
    const pi = session.payment_intent
    if (pi && typeof pi !== 'string') {
        const charges = (pi as unknown as { charges?: { data?: Array<{ payment_method_details?: { type?: string } }> } }).charges?.data
        const t = charges?.[0]?.payment_method_details?.type
        if (t) return t
    }
    return types[0] || 'unknown'
}

async function processCheckoutSession(
    session: Stripe.Checkout.Session,
    eventType: string
): Promise<void> {
    const existing = await prisma.order.findUnique({ where: { stripeSessionId: session.id } })
    if (existing) {
        console.log(`order_already_exists_idempotent: ${session.id} -> ${existing.id}`)
        return
    }

    let printfulCalledAt: Date | null = null
    const paymentProvider = derivePaymentProvider(session, eventType)

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

    const printfulItems: Array<{ item: CheckoutItem; index: number }> = []
    const gootenItems: Array<{ item: CheckoutItem; index: number }> = []

    items.forEach((item, index) => {
        const product = productById.get(item.productId)
        if (!product) return
        const provider = detectProductProvider(product.printfulId)
        if (provider === 'gooten') {
            gootenItems.push({ item, index })
        } else {
            printfulItems.push({ item, index })
        }
    })

    let printfulOrderId: string | null = null
    let gootenOrderId: string | null = null
    let requiresReview = false

    // Build a print file per Printful item upfront. If any build fails, abort
    // the Printful order creation entirely and mark the order REQUIRES_REVIEW
    // so a human reprocesses it instead of silently shipping wrong art.
    const printFileByIndex = new Map<number, PrintFileResult>()
    if (printfulItems.length > 0) {
        try {
            await Promise.all(
                printfulItems.map(async ({ item, index }) => {
                    const product = productById.get(item.productId)!
                    const design = designById.get(item.designId)!
                    const printfulProductId = Number(product.printfulId)
                    if (!Number.isFinite(printfulProductId) || printfulProductId <= 0) {
                        throw new Error(
                            `Invalid Printful product id for "${product.name}": ${product.printfulId}`,
                        )
                    }
                    const printFile = await buildPrintFile({
                        sourceUrl: design.imageUrl,
                        printfulProductId,
                    })
                    if (!printFile.url || printFile.widthPx <= 0 || printFile.heightPx <= 0) {
                        throw new Error(
                            `Bad printFile for session ${session.id} item ${index}`,
                        )
                    }
                    printFileByIndex.set(index, printFile)
                }),
            )
        } catch (err) {
            requiresReview = true
            console.error('[webhook] mockup/print-file failed:', err)
        }
    }

    // ── Printful fulfillment ───────────────────────────────
    if (printfulItems.length > 0 && !requiresReview) {
        try {
            printfulCalledAt = new Date()
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
                items: printfulItems.map(({ item, index }) => {
                    const product = productById.get(item.productId)!
                    const colors = product.colors as unknown as ProductColor[]
                    const colorData = colors.find(
                        (c) => c.name.toLowerCase() === item.color.toLowerCase()
                    )
                    if (!colorData?.printfulVariantId) {
                        throw new Error(
                            `No Printful variant found for product "${product.name}" in color "${item.color}"`
                        )
                    }
                    const printFile = printFileByIndex.get(index)!
                    return {
                        variantId: colorData.printfulVariantId,
                        quantity: item.quantity,
                        imageUrl: printFile.url,
                        files: [
                            {
                                type: 'default',
                                url: printFile.url,
                                position: {
                                    area_width: printFile.widthPx,
                                    area_height: printFile.heightPx,
                                    width: printFile.widthPx,
                                    height: printFile.heightPx,
                                    top: 0,
                                    left: 0,
                                },
                            },
                        ],
                    }
                }),
            })
            printfulOrderId = String((printfulOrder as Record<string, unknown>).id)
            console.log(`Printful order created: ${printfulOrderId}`)
        } catch (err) {
            console.error('Printful order creation failed:', err)
            requiresReview = true
        }
    }

    // ── Gooten fulfillment ─────────────────────────────────
    if (gootenItems.length > 0) {
        try {
            const gooten = getGootenClient()
            const gootenOrderItems = gootenItems.map(({ item }) => {
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

    // Resolve the mockup URL we'll persist on each OrderItem. Prefer a real
    // Printful/Gelato/Gooten mockup from the cache; otherwise fall back to
    // the print-file URL (the actual artwork that shipped) or the raw design
    // image. The customer should see something representative on /success.
    const mockupCacheKey = (it: CheckoutItem) =>
        `${it.designId}|${it.productId}|${it.color.toLowerCase()}`
    const cachedMockups = await prisma.mockup.findMany({
        where: {
            OR: items.map((it) => ({
                designId: it.designId,
                productId: it.productId,
                color: it.color.toLowerCase(),
            })),
        },
    })
    const mockupByKey = new Map(
        cachedMockups.map((m) => [`${m.designId}|${m.productId}|${m.color.toLowerCase()}`, m.mockupUrl]),
    )
    const resolveMockupUrl = (item: CheckoutItem, index: number): string | null => {
        const cached = mockupByKey.get(mockupCacheKey(item))
        if (cached) return cached
        const printFile = printFileByIndex.get(index)
        if (printFile?.url) return printFile.url
        const design = designById.get(item.designId)
        return design?.imageUrl ?? null
    }

    try {
        const order = await prisma.order.create({
            data: {
                email: customerEmail,
                stripeSessionId: session.id,
                printfulOrderId: externalOrderId,
                status: requiresReview ? 'REQUIRES_REVIEW' : 'processing',
                subtotal: session.amount_subtotal! / 100,
                shippingCost: session.shipping_cost?.amount_total
                    ? session.shipping_cost.amount_total / 100
                    : 5.99,
                total: session.amount_total! / 100,
                shippingAddress: { ...shippingDetails.address },
                printfulCalledAt,
                paymentProvider,
                items: {
                    create: items.map((item, index) => ({
                        productId: item.productId,
                        designId: item.designId,
                        size: item.size,
                        color: item.color,
                        quantity: item.quantity,
                        price: productById.get(item.productId)!.sellPrice,
                        mockupUrl: resolveMockupUrl(item, index),
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

        try {
            await prisma.order.update({
                where: { id: order.id },
                data: { emailSentAt: new Date() },
            })
        } catch (e) {
            console.error('Failed to record emailSentAt:', e)
        }
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
            await processCheckoutSession(session, event.type)
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
        await processCheckoutSession(fullSession, event.type)
    } else if (event.type === 'checkout.session.async_payment_failed') {
        const session = event.data.object as Stripe.Checkout.Session
        console.warn(`async_payment_failed: ${session.id} payment_status=${session.payment_status}`)
    }

    return NextResponse.json({ ok: true })
}
