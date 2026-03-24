import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { printful } from '@/lib/printful'
import { sendOrderConfirmation } from '@/lib/resend'
import { sendMakeOrderAlert } from '@/lib/make'
import Stripe from 'stripe'
import { getRequestId, jsonWithRequestId, logApiError, logApiInfo, logApiWarn } from '@/lib/api-logging'
import { detectProductProvider } from '@/lib/product-provider'
import { gelato } from '@/lib/gelato'
import { getGootenClient } from '@/lib/gooten'
import { isMockupEligibleProduct } from '@/lib/mockup-eligibility'

type CheckoutItem = {
    productId: string
    designId: string
    size: string
    color: string
    quantity: number
}

type ProductColor = {
    name: string
    printfulVariantId?: number
}

type PrintfulOrderResponse = {
    id: string | number
}

const MAX_ITEMS = 25
const MAX_QTY = 20

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function isNonEmptyString(value: unknown, maxLen = 191): value is string {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLen
}

function parseCheckoutItems(raw: string | undefined): CheckoutItem[] | null {
    if (!raw) {
        return null
    }

    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch {
        return null
    }

    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > MAX_ITEMS) {
        return null
    }

    const items: CheckoutItem[] = []
    for (const item of parsed) {
        if (!isObject(item)) {
            return null
        }

        const { productId, designId, size, color, quantity } = item

        if (!isNonEmptyString(productId, 120)) return null
        if (!isNonEmptyString(designId, 160)) return null
        if (!isNonEmptyString(size, 40)) return null
        if (!isNonEmptyString(color, 60)) return null
        if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) {
            return null
        }

        items.push({
            productId: productId.trim(),
            designId: designId.trim(),
            size: size.trim(),
            color: color.trim(),
            quantity,
        })
    }

    return items
}

function parseProductColors(value: unknown): ProductColor[] {
    if (!Array.isArray(value)) {
        return []
    }

    return value
        .filter((item): item is ProductColor => {
            if (!isObject(item)) return false
            return typeof item.name === 'string'
        })
        .map((item) => item)
}

function parseGootenOrderId(payload: unknown): string | null {
    if (!isObject(payload)) {
        return null
    }

    const directCandidates = [payload.OrderId, payload.orderId, payload.Id, payload.id]
    for (const candidate of directCandidates) {
        if (isNonEmptyString(candidate, 255)) {
            return candidate.trim()
        }
    }

    if (isObject(payload.Result)) {
        return parseGootenOrderId(payload.Result)
    }

    return null
}

function resolveRecipientName(session: Stripe.Checkout.Session, fallbackEmail: string): string {
    const shippingName =
        (isNonEmptyString(session.shipping_details?.name, 120) && session.shipping_details.name.trim()) ||
        null
    const customerName =
        (isNonEmptyString(session.customer_details?.name, 120) && session.customer_details.name.trim()) ||
        null

    return shippingName || customerName || fallbackEmail
}

function splitRecipientName(fullName: string): { firstName: string; lastName: string } {
    const normalized = fullName.trim()
    if (!normalized) {
        return { firstName: 'Customer', lastName: 'Customer' }
    }

    const parts = normalized.split(/\s+/)
    if (parts.length === 1) {
        return { firstName: parts[0], lastName: 'Customer' }
    }

    return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' '),
    }
}

export async function POST(req: NextRequest) {
    const route = '/api/webhooks/stripe'
    const requestId = getRequestId(req)
    const respond = <T>(body: T, init?: ResponseInit) => jsonWithRequestId(requestId, body, init)

    logApiInfo(route, requestId, 'request_received')

    try {
        const body = await req.text()
        const sig = req.headers.get('stripe-signature')

        if (!sig) {
            logApiWarn(route, requestId, 'missing_signature')
            return respond({ error: 'Missing signature' }, { status: 400 })
        }

        let event: Stripe.Event
        try {
            event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
        } catch {
            logApiWarn(route, requestId, 'invalid_signature')
            return respond({ error: 'Invalid signature' }, { status: 400 })
        }

        if (event.type !== 'checkout.session.completed') {
            logApiInfo(route, requestId, 'ignored_event', { type: event.type })
            return respond({ ok: true })
        }

        const session = event.data.object as Stripe.Checkout.Session

        const items = parseCheckoutItems(session.metadata?.items)
        if (!items) {
            logApiWarn(route, requestId, 'invalid_metadata_items')
            return respond({ ok: true })
        }

        if (!isNonEmptyString(session.id, 255)) {
            logApiWarn(route, requestId, 'invalid_session_id')
            return respond({ ok: true })
        }

        if (typeof session.amount_total !== 'number' || typeof session.amount_subtotal !== 'number') {
            logApiWarn(route, requestId, 'invalid_amounts')
            return respond({ ok: true })
        }

        const products = await prisma.product.findMany({
            where: { id: { in: items.map((i) => i.productId) } },
        })
        const designs = await prisma.design.findMany({
            where: { id: { in: items.map((i) => i.designId) } },
        })

        const productById = new Map(products.map((p) => [p.id, p]))
        const designById = new Map(designs.map((d) => [d.id, d]))

        const mappedItems: Array<{
            item: CheckoutItem
            product: (typeof products)[number]
            design: (typeof designs)[number]
            provider: string
            variantId?: number
            gelatoProductUid?: string
            gootenSku?: string
            gootenProductId?: string
        }> = []

        for (const item of items) {
            const product = productById.get(item.productId)
            if (!product) {
                logApiWarn(route, requestId, 'order_mapping_missing_refs')
                return respond({ ok: true })
            }

            let design = designById.get(item.designId)
            if (!design) {
                const aiEligible = isMockupEligibleProduct({
                    name: product.name,
                    printfulId: product.printfulId,
                    printArea: product.printArea,
                })

                if (aiEligible) {
                    logApiWarn(route, requestId, 'order_mapping_missing_refs')
                    return respond({ ok: true })
                }

                const fallbackImageUrl = isNonEmptyString(product.imageUrl, 2048)
                    ? product.imageUrl.trim()
                    : `${(process.env.NEXT_PUBLIC_APP_URL || 'https://smartprintai.com').replace(/\/$/, '')}/favicon.ico`

                design = await prisma.design.upsert({
                    where: { id: item.designId },
                    update: {},
                    create: {
                        id: item.designId,
                        sessionId: session.id,
                        prompt: `[ready-to-buy] ${product.name}`,
                        style: 'ready_to_buy',
                        imageUrl: fallbackImageUrl,
                        status: 'ready',
                    },
                })
                designById.set(item.designId, design)
                logApiInfo(route, requestId, 'ready_to_buy_design_upserted', {
                    productId: product.id,
                    designId: item.designId,
                })
            }

            const provider = detectProductProvider(product.printfulId)

            if (provider === 'gelato') {
                const printArea = (product.printArea || {}) as Record<string, unknown>
                const mapping = (printArea.variantMapping || {}) as Record<string, string>
                const sizeKey = item.size.toLowerCase()
                const colorKey = item.color.toLowerCase()
                const fullKey = `${sizeKey}:${colorKey}`

                const gelatoProductUid = mapping[fullKey] || mapping[colorKey] || mapping[sizeKey] || (printArea.providerProductUid as string)

                if (!gelatoProductUid) {
                    logApiWarn(route, requestId, 'gelato_variant_mapping_missing', { productId: product.id, sizeKey, colorKey })
                    return respond({ ok: true })
                }

                mappedItems.push({
                    item,
                    product,
                    design,
                    provider,
                    gelatoProductUid,
                })
            } else if (provider === 'gooten') {
                const printArea = (product.printArea || {}) as Record<string, unknown>
                const mapping = (printArea.variantMapping || {}) as Record<string, string>
                const sizeKey = item.size.toLowerCase()
                const colorKey = item.color.toLowerCase()
                const fullKey = `${sizeKey}:${colorKey}`

                const gootenSku =
                    mapping[fullKey] ||
                    mapping[colorKey] ||
                    mapping[sizeKey] ||
                    (printArea.providerDefaultSku as string)
                const gootenProductId = printArea.providerProductId as string

                if (!gootenSku || !gootenProductId) {
                    logApiWarn(route, requestId, 'gooten_variant_mapping_missing', { productId: product.id, sizeKey, colorKey })
                    return respond({ ok: true })
                }

                mappedItems.push({
                    item,
                    product,
                    design,
                    provider,
                    gootenSku,
                    gootenProductId,
                })
            } else {
                const colorData = parseProductColors(product.colors).find(
                    (c) => c.name.toLowerCase() === item.color.toLowerCase()
                )

                if (!colorData || typeof colorData.printfulVariantId !== 'number' || colorData.printfulVariantId <= 0) {
                    logApiWarn(route, requestId, 'invalid_variant_mapping', { productId: product.id })
                    return respond({ ok: true })
                }

                mappedItems.push({
                    item,
                    product,
                    design,
                    provider: 'printful',
                    variantId: colorData.printfulVariantId,
                })
            }
        }

        const customerEmail =
            (isNonEmptyString(session.customer_email, 254) && session.customer_email.trim().toLowerCase()) ||
            (isNonEmptyString(session.customer_details?.email, 254) && session.customer_details?.email.trim().toLowerCase()) ||
            null

        const existingUser = customerEmail
            ? await prisma.user.findUnique({
                where: { email: customerEmail },
                select: { id: true },
            })
            : null

        const address = session.shipping_details?.address || session.customer_details?.address
        const hasShippingAddress =
            !!address &&
            isNonEmptyString(address.line1, 255) &&
            isNonEmptyString(address.city, 120) &&
            isNonEmptyString(address.country, 2) &&
            isNonEmptyString(address.postal_code, 32)

        if (!customerEmail || !hasShippingAddress) {
            const fallbackEmail = customerEmail || `missing-email+${session.id}@smartprintai.local`
            const manualShippingAddress = {
                line1: address?.line1 || null,
                line2: address?.line2 || null,
                city: address?.city || null,
                state: address?.state || null,
                country: address?.country || null,
                postal_code: address?.postal_code || null,
                needs_manual_review: true,
            } as Prisma.InputJsonValue

            try {
                await prisma.order.create({
                    data: {
                        email: fallbackEmail,
                        userId: existingUser?.id,
                        stripeSessionId: session.id,
                        status: 'manual_review',
                        subtotal: session.amount_subtotal / 100,
                        shippingCost: session.shipping_cost?.amount_total
                            ? session.shipping_cost.amount_total / 100
                            : 5.99,
                        total: session.amount_total / 100,
                        shippingAddress: manualShippingAddress,
                        items: {
                            create: mappedItems.map(({ item, product }) => ({
                                productId: item.productId,
                                designId: item.designId,
                                size: item.size,
                                color: item.color,
                                quantity: item.quantity,
                                price: product.sellPrice,
                            })),
                        },
                    },
                })
            } catch (err: unknown) {
                if (
                    typeof err === 'object' &&
                    err !== null &&
                    'code' in err &&
                    (err as { code?: string }).code === 'P2002'
                ) {
                    logApiInfo(route, requestId, 'duplicate_webhook', { stripeSessionId: session.id })
                    return respond({ ok: true })
                }
                throw err
            }

            logApiWarn(route, requestId, 'manual_review_created', { stripeSessionId: session.id })
            return respond({ ok: true })
        }

        const recipientName = resolveRecipientName(session, customerEmail)
        const recipient = splitRecipientName(recipientName)

        const shippingAddress = {
            line1: address.line1,
            line2: address.line2,
            city: address.city!,
            state: address.state,
            country: address.country,
            postal_code: address.postal_code,
        } as Prisma.InputJsonValue

        let order
        try {
            order = await prisma.order.create({
                data: {
                    email: customerEmail,
                    userId: existingUser?.id,
                    stripeSessionId: session.id,
                    status: 'paid',
                    subtotal: session.amount_subtotal / 100,
                    shippingCost: session.shipping_cost?.amount_total
                        ? session.shipping_cost.amount_total / 100
                        : 5.99,
                    total: session.amount_total / 100,
                    shippingAddress,
                    items: {
                        create: mappedItems.map(({ item, product }) => ({
                            productId: item.productId,
                            designId: item.designId,
                            size: item.size,
                            color: item.color,
                            quantity: item.quantity,
                            price: product.sellPrice,
                        })),
                    },
                },
            })
        } catch (err: unknown) {
            if (
                typeof err === 'object' &&
                err !== null &&
                'code' in err &&
                (err as { code?: string }).code === 'P2002'
            ) {
                logApiInfo(route, requestId, 'duplicate_webhook', { stripeSessionId: session.id })
                return respond({ ok: true })
            }
            throw err
        }

        try {
            const printfulItems = mappedItems.filter((i) => i.provider === 'printful')
            const gelatoItems = mappedItems.filter((i) => i.provider === 'gelato')
            const gootenItems = mappedItems.filter((i) => i.provider === 'gooten')

            let printfulOrderId: string | null = null
            let gelatoOrderId: string | null = null
            let gootenOrderId: string | null = null

            if (printfulItems.length > 0) {
                const printfulOrder = (await printful.createOrder({
                    email: customerEmail,
                    shippingAddress: {
                        name: recipientName,
                        address1: address.line1!,
                        city: address.city!,
                        state_code: address.state || '',
                        country_code: address.country!,
                        zip: address.postal_code!,
                    },
                    items: printfulItems.map(({ item, design, variantId }) => ({
                        variantId: variantId!,
                        quantity: item.quantity,
                        imageUrl: design.imageUrl,
                    })),
                })) as PrintfulOrderResponse
                printfulOrderId = String(printfulOrder.id)
            }

            if (gelatoItems.length > 0) {
                const orderCurrency = isNonEmptyString(session.currency, 10)
                    ? session.currency.trim().toUpperCase()
                    : 'USD'
                const gelatoOrder = (await gelato.createOrder({
                    orderReferenceId: order.id,
                    currency: orderCurrency,
                    customerEmail,
                    shippingAddress: {
                        firstName: recipient.firstName,
                        lastName: recipient.lastName,
                        addressLine1: address.line1!,
                        addressLine2: address.line2 || '',
                        city: address.city!,
                        postcode: address.postal_code!,
                        stateCode: address.state || '',
                        countryCode: address.country!,
                        email: customerEmail,
                    },
                    items: gelatoItems.map(({ item, design, gelatoProductUid }) => ({
                        itemReferenceId: `${order.id}-${item.productId}`,
                        productUid: gelatoProductUid!,
                        quantity: item.quantity,
                        fileUrl: design.imageUrl,
                    })),
                })) as { id: string }
                gelatoOrderId = gelatoOrder.id
            }

            if (gootenItems.length > 0) {
                const gooten = getGootenClient()
                const firstName = recipient.firstName
                const lastName = recipient.lastName
                const countryCode = address.country!

                const primaryPayload = {
                    SourceId: order.id,
                    ExternalId: order.id,
                    ShipToAddress: {
                        FirstName: firstName,
                        LastName: lastName,
                        Line1: address.line1!,
                        Line2: address.line2 || '',
                        City: address.city!,
                        State: address.state || '',
                        PostalCode: address.postal_code!,
                        CountryCode: countryCode,
                        Email: customerEmail,
                    },
                    Items: gootenItems.map(({ item, design, gootenSku, gootenProductId }) => ({
                        SKU: gootenSku!,
                        ProductId: gootenProductId!,
                        Quantity: item.quantity,
                        Images: [{ Url: design.imageUrl }],
                    })),
                }

                let gootenResponse: unknown
                try {
                    gootenResponse = await gooten.createOrder(primaryPayload)
                } catch {
                    gootenResponse = await gooten.createOrder({
                        sourceId: order.id,
                        externalId: order.id,
                        shipToAddress: {
                            firstName,
                            lastName,
                            line1: address.line1!,
                            line2: address.line2 || '',
                            city: address.city!,
                            state: address.state || '',
                            postalCode: address.postal_code!,
                            countryCode,
                            email: customerEmail,
                        },
                        items: gootenItems.map(({ item, design, gootenSku, gootenProductId }) => ({
                            sku: gootenSku!,
                            productId: gootenProductId!,
                            quantity: item.quantity,
                            images: [{ url: design.imageUrl }],
                        })),
                    })
                }
                gootenOrderId = parseGootenOrderId(gootenResponse) || order.id
            }

            await prisma.order.update({
                where: { id: order.id },
                data: {
                    printfulOrderId: gootenOrderId || gelatoOrderId || printfulOrderId,
                    status: 'processing',
                },
            })

            await sendOrderConfirmation({
                email: customerEmail,
                orderId: order.id,
                items,
                total: order.total,
            })

            await sendMakeOrderAlert({
                requestId,
                orderId: order.id,
                stripeSessionId: session.id,
                email: customerEmail,
                total: order.total,
                itemsCount: items.length,
                status: 'processing',
                printfulOrderId: gootenOrderId || gelatoOrderId || printfulOrderId || '',
            })

            logApiInfo(route, requestId, 'request_succeeded', { orderId: order.id })
        } catch (err) {
            logApiError(route, requestId, 'fulfillment_failed', err, { orderId: order.id })
            await prisma.order.update({
                where: { id: order.id },
                data: { status: 'fulfillment_failed' },
            })
        }

        return respond({ ok: true })
    } catch (error) {
        logApiError(route, requestId, 'request_failed', error)
        return respond({ error: 'Webhook processing failed' }, { status: 500 })
    }
}
