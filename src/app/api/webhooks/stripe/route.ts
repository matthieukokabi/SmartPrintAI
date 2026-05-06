import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { printful } from '@/lib/printful'
import { buildPrintFile, type PrintFileResult } from '@/lib/print-file'
import { getGootenClient } from '@/lib/gooten'
import { gelato } from '@/lib/gelato'
import { detectProductProvider } from '@/lib/product-provider'
import { sendOrderConfirmation } from '@/lib/resend'
import { sendMakeOrderAlert } from '@/lib/make'
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

type ShippingDetailsWithPhone = Stripe.Checkout.Session.ShippingDetails & {
    phone?: string | null
}

function getShippingDetails(session: Stripe.Checkout.Session): ShippingDetailsWithPhone | null {
    if (session.shipping_details) {
        return {
            ...session.shipping_details,
            phone: session.customer_details?.phone ?? null,
        } as ShippingDetailsWithPhone
    }
    const collected = (session as unknown as {
        collected_information?: { shipping_details?: Stripe.Checkout.Session.ShippingDetails }
    }).collected_information
    if (collected?.shipping_details) {
        return {
            ...collected.shipping_details,
            phone: session.customer_details?.phone ?? null,
        } as ShippingDetailsWithPhone
    }

    // Third fallback: synthesize from customer_details (older Stripe Link /
    // wallet flows sometimes only populate this branch). Map name from
    // customer_details.name; address + phone from customer_details.
    const cd = session.customer_details
    if (cd?.address) {
        return {
            name: cd.name ?? 'Customer',
            address: cd.address,
            phone: cd.phone ?? null,
        } as ShippingDetailsWithPhone
    }
    return null
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
    eventType: string,
    requestId: string,
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

    // Missing shipping/email: persist the paid Order with status='manual_review'
    // and a note describing what's missing, so a human can recover the
    // customer contact info from Stripe's billing portal. Do NOT call
    // any fulfillment provider — we don't have a shipping address to
    // send. Do NOT fire the make alert here either; manual_review is
    // a different operator workflow than ordinary fulfilled orders.
    if (!shippingDetails?.address || !customerEmail) {
        const ts = new Date().toISOString()
        const reasons: string[] = []
        if (!shippingDetails?.address) reasons.push('shipping_details_missing')
        if (!customerEmail) reasons.push('customer_email_missing')
        const manualReviewNote =
            `[${ts}] manual_review: ${reasons.join(',')} ` +
            `for Stripe session ${session.id}`

        try {
            const products = await prisma.product.findMany({
                where: { id: { in: items.map((i) => i.productId) } },
            })
            const productById = new Map(products.map((p) => [p.id, p]))

            await prisma.order.create({
                data: {
                    email: customerEmail ?? 'unknown@manual-review.local',
                    stripeSessionId: session.id,
                    printfulOrderId: null,
                    status: 'manual_review',
                    internalNotes: manualReviewNote,
                    subtotal: session.amount_subtotal! / 100,
                    shippingCost: session.shipping_cost?.amount_total
                        ? session.shipping_cost.amount_total / 100
                        : 0,
                    total: session.amount_total! / 100,
                    shippingAddress: shippingDetails?.address
                        ? { ...shippingDetails.address }
                        : {},
                    paymentProvider: derivePaymentProvider(session, eventType),
                    items: {
                        create: items.map((item) => ({
                            productId: item.productId,
                            designId: item.designId,
                            size: item.size,
                            color: item.color,
                            quantity: item.quantity,
                            price: productById.get(item.productId)?.sellPrice ?? 0,
                        })),
                    },
                },
            })
            console.warn(`[webhook] manual_review order created for ${session.id}: ${reasons.join(',')}`)
        } catch (err) {
            console.error('[webhook] manual_review create failed:', err)
        }
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

    // Ready-to-buy items (catalog products bought as-is, no AI design) won't
    // have a Design row — Add to Cart on the PDP synthesizes a deterministic
    // designId of the form "ready_<productId>" and never persists. Upsert a
    // synthetic Design row here so downstream provider calls have an
    // imageUrl to send and OrderItem.designId can satisfy its FK.
    for (const item of items) {
        if (designById.has(item.designId)) continue
        const product = productById.get(item.productId)
        if (!product) continue
        try {
            const synthetic = await prisma.design.upsert({
                where: { id: item.designId },
                update: {},
                create: {
                    id: item.designId,
                    sessionId: session.id,
                    prompt: `[ready-to-buy] ${product.name}`,
                    style: 'ready_to_buy',
                    imageUrl: product.imageUrl,
                    status: 'ready',
                },
            })
            designById.set(synthetic.id, synthetic)
        } catch (err) {
            console.error(`[webhook] failed to upsert ready-to-buy design ${item.designId}:`, err)
        }
    }

    const printfulItems: Array<{ item: CheckoutItem; index: number }> = []
    const gootenItems: Array<{ item: CheckoutItem; index: number }> = []
    const gelatoItems: Array<{ item: CheckoutItem; index: number }> = []

    items.forEach((item, index) => {
        const product = productById.get(item.productId)
        if (!product) return
        const provider = detectProductProvider(product.printfulId)
        if (provider === 'gooten') {
            gootenItems.push({ item, index })
        } else if (provider === 'gelato') {
            gelatoItems.push({ item, index })
        } else {
            printfulItems.push({ item, index })
        }
    })

    let printfulOrderId: string | null = null
    let gootenOrderId: string | null = null
    let gelatoOrderId: string | null = null
    let requiresReview = false
    let requiresReviewNote: string | null = null

    // Build a print file per Printful item upfront. If any build fails, abort
    // the Printful order creation entirely and mark the order REQUIRES_REVIEW
    // so a human reprocesses it instead of silently shipping wrong art.
    // Ready-to-buy items skip the print-file build — their design IS the
    // catalog image, no normalization needed.
    const printFileByIndex = new Map<number, PrintFileResult>()
    const isReadyToBuy = (item: CheckoutItem) => item.designId.startsWith('ready_')
    const customPrintfulItems = printfulItems.filter(({ item }) => !isReadyToBuy(item))
    if (customPrintfulItems.length > 0) {
        try {
            await Promise.all(
                customPrintfulItems.map(async ({ item, index }) => {
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
            const reviewNote = (
                `[${new Date().toISOString()}] REQUIRES_REVIEW: ` +
                `print-file build failed for Stripe session ${session.id}. ` +
                `Error: ${err instanceof Error ? err.message : String(err)}`
            )
            requiresReview = true
            requiresReviewNote = reviewNote
            console.error('[webhook] mockup/print-file failed:', err)
        }
    }

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

    // ── Save Order to DB FIRST ─────────────────────────────
    // Provider calls (Gooten SourceId/ExternalId, Gelato orderReferenceId)
    // need the local Order.id as their correlation key, so we persist the
    // local row before calling out to providers. Provider order ids land
    // in a follow-up update at the end.
    let order: Awaited<ReturnType<typeof prisma.order.create>>
    try {
        order = await prisma.order.create({
            data: {
                email: customerEmail,
                stripeSessionId: session.id,
                printfulOrderId: null,
                status: requiresReview ? 'REQUIRES_REVIEW' : 'processing',
                internalNotes: requiresReview ? requiresReviewNote : null,
                subtotal: session.amount_subtotal! / 100,
                shippingCost: session.shipping_cost?.amount_total
                    ? session.shipping_cost.amount_total / 100
                    : 5.99,
                total: session.amount_total! / 100,
                shippingAddress: { ...shippingDetails.address },
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
    } catch (err) {
        console.error('Order create failed:', err)
        return
    }

    // ── Printful fulfillment ───────────────────────────────
    if (printfulItems.length > 0 && !requiresReview) {
        try {
            printfulCalledAt = new Date()
            const printfulOrder = await printful.createOrder({
                email: customerEmail,
                externalId: order.id,
                shippingAddress: {
                    name: shippingDetails.name!,
                    address1: shippingDetails.address.line1!,
                    city: shippingDetails.address.city!,
                    state_code: shippingDetails.address.state || '',
                    country_code: shippingDetails.address.country!,
                    zip: shippingDetails.address.postal_code!,
                    ...(shippingDetails.phone ? { phone: shippingDetails.phone } : {}),
                },
                items: printfulItems.map(({ item, index }) => {
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
                    // Ready-to-buy items: send the catalog image directly,
                    // no normalized print file (the design IS the catalog).
                    if (isReadyToBuy(item)) {
                        return {
                            variantId: colorData.printfulVariantId,
                            quantity: item.quantity,
                            imageUrl: design.imageUrl,
                        }
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
            const partnerBillingKey = (process.env.GOOTEN_PARTNER_BILLING_KEY || '').trim()
            const phone = shippingDetails.phone || session.customer_details?.phone || ''
            const firstName = (shippingDetails.name || '').split(' ')[0] || 'Customer'
            const lastName = (shippingDetails.name || '').split(' ').slice(1).join(' ') || ''
            const gootenOrderItems = gootenItems.map(({ item }) => {
                const product = productById.get(item.productId)!
                const design = designById.get(item.designId)!
                const sku = resolveGootenSku(product, item.color)
                if (!sku) {
                    throw new Error(
                        `No Gooten SKU found for product "${product.name}" in color "${item.color}"`
                    )
                }
                const printArea = (typeof product.printArea === 'object' && product.printArea !== null)
                    ? product.printArea as Record<string, unknown>
                    : {}
                const providerProductId = typeof printArea.providerProductId === 'string'
                    ? printArea.providerProductId
                    : ''
                return {
                    SKU: sku,
                    ProductId: providerProductId,
                    Quantity: item.quantity,
                    Images: [{ Url: design.imageUrl }],
                }
            })

            const gootenAddress = {
                FirstName: firstName,
                LastName: lastName,
                Line1: shippingDetails.address.line1 || '',
                Line2: shippingDetails.address.line2 || '',
                City: shippingDetails.address.city || '',
                State: shippingDetails.address.state || '',
                PostalCode: shippingDetails.address.postal_code || '',
                CountryCode: shippingDetails.address.country || 'US',
                Email: customerEmail,
                Phone: phone,
            }

            const gootenOrder = await gooten.createOrder({
                SourceId: order.id,
                ExternalId: order.id,
                BillingAddress: { ...gootenAddress },
                ShipToAddress: { ...gootenAddress },
                Items: gootenOrderItems,
                Payment: {
                    CurrencyCode: (session.currency || 'USD').toUpperCase(),
                    PartnerBillingKey: partnerBillingKey,
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

    // ── Gelato fulfillment ─────────────────────────────────
    if (gelatoItems.length > 0) {
        try {
            const phone = shippingDetails.phone || session.customer_details?.phone || ''
            const firstName = (shippingDetails.name || '').split(' ')[0] || 'Customer'
            const lastName = (shippingDetails.name || '').split(' ').slice(1).join(' ') || ''

            const gelatoOrderItems = gelatoItems.map(({ item }) => {
                const product = productById.get(item.productId)!
                const design = designById.get(item.designId)!
                const printArea = (typeof product.printArea === 'object' && product.printArea !== null)
                    ? product.printArea as Record<string, unknown>
                    : {}
                const variantMapping = (typeof printArea.variantMapping === 'object' && printArea.variantMapping !== null)
                    ? printArea.variantMapping as Record<string, string>
                    : {}
                const sizeColorKey = `${item.size}:${item.color}`.toLowerCase()
                const productUid = variantMapping[sizeColorKey]
                    || variantMapping[item.color.toLowerCase()]
                    || variantMapping['default']
                    || ''
                if (!productUid) {
                    throw new Error(
                        `No Gelato variant uid found for product "${product.name}" size="${item.size}" color="${item.color}"`,
                    )
                }
                return {
                    itemReferenceId: item.designId,
                    productUid,
                    quantity: item.quantity,
                    fileUrl: design.imageUrl,
                }
            })

            const gelatoOrder = await gelato.createOrder({
                orderReferenceId: order.id,
                currency: (session.currency || 'USD').toUpperCase(),
                customerEmail,
                shippingAddress: {
                    firstName,
                    lastName,
                    addressLine1: shippingDetails.address.line1 || '',
                    ...(shippingDetails.address.line2 ? { addressLine2: shippingDetails.address.line2 } : {}),
                    city: shippingDetails.address.city || '',
                    postcode: shippingDetails.address.postal_code || '',
                    ...(shippingDetails.address.state ? { stateCode: shippingDetails.address.state } : {}),
                    countryCode: shippingDetails.address.country || 'US',
                    email: customerEmail,
                    ...(phone ? { phone } : {}),
                },
                items: gelatoOrderItems,
            })

            const gelatoResult = gelatoOrder as Record<string, unknown>
            gelatoOrderId = String(gelatoResult.id || gelatoResult.Id || '')
            if (gelatoOrderId) {
                console.log(`Gelato order created: ${gelatoOrderId}`)
            }
        } catch (err) {
            console.error('Gelato order creation failed:', err)
        }
    }

    // ── Update Order with provider ids ─────────────────────
    const externalOrderId = [
        printfulOrderId,
        gootenOrderId ? `gooten:${gootenOrderId}` : null,
        gelatoOrderId ? `gelato:${gelatoOrderId}` : null,
    ].filter(Boolean).join(',') || null

    try {
        await prisma.order.update({
            where: { id: order.id },
            data: {
                printfulOrderId: externalOrderId,
                printfulCalledAt,
            },
        })
    } catch (err) {
        console.error('Failed to update Order with provider ids:', err)
    }

    try {
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

        // Fire ops alert (make.com webhook) — best-effort, never blocks
        // the response. printfulOrderId here is the cross-provider field
        // (printful id, gooten id, or gelato id depending on which
        // provider fulfilled the order).
        const externalIdForAlert =
            printfulOrderId || gootenOrderId || gelatoOrderId || ''
        try {
            await sendMakeOrderAlert({
                requestId,
                orderId: order.id,
                stripeSessionId: session.id,
                email: customerEmail,
                total: order.total,
                itemsCount: items.length,
                status: order.status,
                printfulOrderId: externalIdForAlert,
            })
        } catch (err) {
            console.error('[webhook] sendMakeOrderAlert failed:', err)
        }
    } catch (err) {
        console.error('Order DB/email error:', err)
    }
}

export async function POST(req: NextRequest) {
    const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID()
    const body = await req.text()
    const sig = req.headers.get('stripe-signature')!

    const respond = (
        payload: Record<string, unknown>,
        init?: ResponseInit,
    ): NextResponse => {
        const res = NextResponse.json(payload, init)
        res.headers.set('x-request-id', requestId)
        return res
    }

    let event: Stripe.Event
    try {
        event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch (err) {
        console.error('Webhook signature verification failed:', err)
        return respond({ error: 'Invalid signature' }, { status: 400 })
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.payment_status === 'paid') {
            await processCheckoutSession(session, event.type, requestId)
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
        await processCheckoutSession(fullSession, event.type, requestId)
    } else if (event.type === 'checkout.session.async_payment_failed') {
        const session = event.data.object as Stripe.Checkout.Session
        console.warn(`async_payment_failed: ${session.id} payment_status=${session.payment_status}`)
    }

    return respond({ ok: true })
}
