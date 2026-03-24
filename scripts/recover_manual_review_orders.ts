import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local', override: true })

import { PrismaPg } from '@prisma/adapter-pg'
import { Prisma, PrismaClient } from '@prisma/client'
import Stripe from 'stripe'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
    throw new Error('DATABASE_URL is required')
}
const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
})

type ScriptArgs = {
    execute: boolean
    orderId?: string
    sessionId?: string
    limit: number
}

type ProductColor = {
    name: string
    printfulVariantId?: number
}

type CheckoutAddress = {
    line1: string
    line2: string | null
    city: string
    state: string | null
    country: string
    postal_code: string
}

type RecoverableOrder = Prisma.OrderGetPayload<{
    include: { items: true }
}>

type RuntimeModules = {
    stripe: typeof import('../src/lib/stripe').stripe
    printful: typeof import('../src/lib/printful').printful
    gelato: typeof import('../src/lib/gelato').gelato
    getGootenClient: typeof import('../src/lib/gooten').getGootenClient
    detectProductProvider: typeof import('../src/lib/product-provider').detectProductProvider
    sendOrderConfirmation: typeof import('../src/lib/resend').sendOrderConfirmation
    sendMakeOrderAlert: typeof import('../src/lib/make').sendMakeOrderAlert
}

let runtimeModulesPromise: Promise<RuntimeModules> | null = null

async function getRuntimeModules(): Promise<RuntimeModules> {
    if (!runtimeModulesPromise) {
        runtimeModulesPromise = (async () => {
            const [
                { stripe },
                { printful },
                { gelato },
                { getGootenClient },
                { detectProductProvider },
                { sendOrderConfirmation },
                { sendMakeOrderAlert },
            ] = await Promise.all([
                import('../src/lib/stripe'),
                import('../src/lib/printful'),
                import('../src/lib/gelato'),
                import('../src/lib/gooten'),
                import('../src/lib/product-provider'),
                import('../src/lib/resend'),
                import('../src/lib/make'),
            ])

            return {
                stripe,
                printful,
                gelato,
                getGootenClient,
                detectProductProvider,
                sendOrderConfirmation,
                sendMakeOrderAlert,
            }
        })()
    }

    return runtimeModulesPromise
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function isNonEmptyString(value: unknown, maxLen = 191): value is string {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLen
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

function resolveOrderEmail(
    session: Stripe.Checkout.Session,
    fallbackEmail: string
): string | null {
    const sessionEmail =
        (isNonEmptyString(session.customer_email, 254) && session.customer_email.trim().toLowerCase()) ||
        (isNonEmptyString(session.customer_details?.email, 254) && session.customer_details.email.trim().toLowerCase()) ||
        null

    if (sessionEmail) {
        return sessionEmail
    }

    if (isNonEmptyString(fallbackEmail, 254) && !fallbackEmail.endsWith('@smartprintai.local')) {
        return fallbackEmail.trim().toLowerCase()
    }

    return null
}

function resolveOrderAddress(
    session: Stripe.Checkout.Session
): CheckoutAddress | null {
    const address = session.shipping_details?.address || session.customer_details?.address
    if (
        !address ||
        !isNonEmptyString(address.line1, 255) ||
        !isNonEmptyString(address.city, 120) ||
        !isNonEmptyString(address.country, 2) ||
        !isNonEmptyString(address.postal_code, 32)
    ) {
        return null
    }

    return {
        line1: address.line1.trim(),
        line2: isNonEmptyString(address.line2, 255) ? address.line2.trim() : null,
        city: address.city.trim(),
        state: isNonEmptyString(address.state, 120) ? address.state.trim() : null,
        country: address.country.trim(),
        postal_code: address.postal_code.trim(),
    }
}

function parseArgs(argv: string[]): ScriptArgs {
    const args: ScriptArgs = {
        execute: false,
        limit: 10,
    }

    for (const token of argv) {
        if (token === '--execute') {
            args.execute = true
            continue
        }
        if (token.startsWith('--order-id=')) {
            args.orderId = token.slice('--order-id='.length).trim()
            continue
        }
        if (token.startsWith('--session-id=')) {
            args.sessionId = token.slice('--session-id='.length).trim()
            continue
        }
        if (token.startsWith('--limit=')) {
            const parsed = Number(token.slice('--limit='.length))
            if (Number.isFinite(parsed) && parsed > 0) {
                args.limit = Math.min(Math.floor(parsed), 200)
            }
            continue
        }
    }

    return args
}

async function recoverOrder(order: RecoverableOrder, execute: boolean) {
    const {
        stripe,
        printful,
        gelato,
        getGootenClient,
        detectProductProvider,
        sendOrderConfirmation,
        sendMakeOrderAlert,
    } = await getRuntimeModules()

    const existingShippingAddress = isObject(order.shippingAddress) ? order.shippingAddress : null
    const hasStoredAddress =
        isNonEmptyString(existingShippingAddress?.line1, 255) &&
        isNonEmptyString(existingShippingAddress?.city, 120) &&
        isNonEmptyString(existingShippingAddress?.country, 2) &&
        isNonEmptyString(existingShippingAddress?.postal_code, 32)
    const hasManualReviewMarker = existingShippingAddress?.needs_manual_review === true

    if (!hasManualReviewMarker || hasStoredAddress) {
        return {
            orderId: order.id,
            stripeSessionId: order.stripeSessionId,
            outcome: 'skipped_not_bug_signature',
            detail: 'Order does not match missing-shipping manual_review bug signature.',
        }
    }

    const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId)

    if (session.payment_status !== 'paid' || session.status !== 'complete') {
        return {
            orderId: order.id,
            stripeSessionId: order.stripeSessionId,
            outcome: 'skipped_unpaid_or_incomplete',
            detail: `Stripe session not in recoverable state (payment_status=${session.payment_status}, status=${session.status}).`,
        }
    }

    const email = resolveOrderEmail(session, order.email)
    const address = resolveOrderAddress(session)
    if (!email || !address) {
        return {
            orderId: order.id,
            stripeSessionId: order.stripeSessionId,
            outcome: 'skipped_not_bug_signature',
            detail: 'Could not resolve a valid recoverable email/address from Stripe session.',
        }
    }

    const productIds = Array.from(new Set(order.items.map((item) => item.productId)))
    const designIds = Array.from(new Set(order.items.map((item) => item.designId)))
    const [products, designs] = await Promise.all([
        prisma.product.findMany({ where: { id: { in: productIds } } }),
        prisma.design.findMany({ where: { id: { in: designIds } } }),
    ])

    if (products.length !== productIds.length || designs.length !== designIds.length) {
        return {
            orderId: order.id,
            stripeSessionId: order.stripeSessionId,
            outcome: 'skipped_missing_order_data',
            detail: 'Order references missing product/design records.',
        }
    }

    const productById = new Map(products.map((product) => [product.id, product]))
    const designById = new Map(designs.map((design) => [design.id, design]))

    const mappedItems: Array<{
        orderItem: (typeof order.items)[number]
        product: (typeof products)[number]
        design: (typeof designs)[number]
        provider: 'printful' | 'gelato' | 'gooten'
        variantId?: number
        gelatoProductUid?: string
        gootenSku?: string
        gootenProductId?: string
    }> = []

    for (const orderItem of order.items) {
        const product = productById.get(orderItem.productId)
        const design = designById.get(orderItem.designId)
        if (!product || !design) {
            return {
                orderId: order.id,
                stripeSessionId: order.stripeSessionId,
                outcome: 'skipped_missing_order_data',
                detail: `Missing mapped product/design for item ${orderItem.id}.`,
            }
        }

        const provider = detectProductProvider(product.printfulId)
        if (provider === 'gelato') {
            const printArea = (product.printArea || {}) as Record<string, unknown>
            const mapping = (printArea.variantMapping || {}) as Record<string, string>
            const sizeKey = orderItem.size.toLowerCase()
            const colorKey = orderItem.color.toLowerCase()
            const fullKey = `${sizeKey}:${colorKey}`
            const gelatoProductUid =
                mapping[fullKey] ||
                mapping[colorKey] ||
                mapping[sizeKey] ||
                (printArea.providerProductUid as string)

            if (!gelatoProductUid) {
                return {
                    orderId: order.id,
                    stripeSessionId: order.stripeSessionId,
                    outcome: 'skipped_variant_mapping_missing',
                    detail: `Missing Gelato mapping for ${orderItem.productId} (${orderItem.size}/${orderItem.color}).`,
                }
            }

            mappedItems.push({
                orderItem,
                product,
                design,
                provider: 'gelato',
                gelatoProductUid,
            })
            continue
        }

        if (provider === 'gooten') {
            const printArea = (product.printArea || {}) as Record<string, unknown>
            const mapping = (printArea.variantMapping || {}) as Record<string, string>
            const sizeKey = orderItem.size.toLowerCase()
            const colorKey = orderItem.color.toLowerCase()
            const fullKey = `${sizeKey}:${colorKey}`

            const gootenSku =
                mapping[fullKey] ||
                mapping[colorKey] ||
                mapping[sizeKey] ||
                (printArea.providerDefaultSku as string)
            const gootenProductId = printArea.providerProductId as string

            if (!gootenSku || !gootenProductId) {
                return {
                    orderId: order.id,
                    stripeSessionId: order.stripeSessionId,
                    outcome: 'skipped_variant_mapping_missing',
                    detail: `Missing Gooten mapping for ${orderItem.productId} (${orderItem.size}/${orderItem.color}).`,
                }
            }

            mappedItems.push({
                orderItem,
                product,
                design,
                provider: 'gooten',
                gootenSku,
                gootenProductId,
            })
            continue
        }

        if (provider !== 'printful') {
            return {
                orderId: order.id,
                stripeSessionId: order.stripeSessionId,
                outcome: 'skipped_unknown_provider',
                detail: `Unsupported provider for ${orderItem.productId}: ${provider}.`,
            }
        }

        const colorData = parseProductColors(product.colors).find(
            (color) => color.name.toLowerCase() === orderItem.color.toLowerCase()
        )
        if (!colorData || typeof colorData.printfulVariantId !== 'number' || colorData.printfulVariantId <= 0) {
            return {
                orderId: order.id,
                stripeSessionId: order.stripeSessionId,
                outcome: 'skipped_variant_mapping_missing',
                detail: `Missing Printful mapping for ${orderItem.productId} (${orderItem.size}/${orderItem.color}).`,
            }
        }

        mappedItems.push({
            orderItem,
            product,
            design,
            provider: 'printful',
            variantId: colorData.printfulVariantId,
        })
    }

    if (!execute) {
        return {
            orderId: order.id,
            stripeSessionId: order.stripeSessionId,
            outcome: 'dry_run_recoverable',
            detail: `Recoverable order (${mappedItems.length} item(s)) with valid Stripe customer_details fallback.`,
        }
    }

    const lock = await prisma.order.updateMany({
        where: {
            id: order.id,
            status: 'manual_review',
            printfulOrderId: null,
        },
        data: {
            status: 'manual_review_recovery_in_progress',
        },
    })

    if (lock.count === 0) {
        return {
            orderId: order.id,
            stripeSessionId: order.stripeSessionId,
            outcome: 'skipped_already_recovered',
            detail: 'Order is no longer eligible for recovery lock (status/fulfillment changed).',
        }
    }

    try {
        const printfulItems = mappedItems.filter((item) => item.provider === 'printful')
        const gelatoItems = mappedItems.filter((item) => item.provider === 'gelato')
        const gootenItems = mappedItems.filter((item) => item.provider === 'gooten')

        const recipientName = resolveRecipientName(session, email)
        const recipient = splitRecipientName(recipientName)

        let printfulOrderId: string | null = null
        let gelatoOrderId: string | null = null
        let gootenOrderId: string | null = null

        if (printfulItems.length > 0) {
            const printfulOrder = (await printful.createOrder({
                email,
                shippingAddress: {
                    name: recipientName,
                    address1: address.line1,
                    city: address.city,
                    state_code: address.state || '',
                    country_code: address.country,
                    zip: address.postal_code,
                },
                items: printfulItems.map(({ orderItem, design, variantId }) => ({
                    variantId: variantId!,
                    quantity: orderItem.quantity,
                    imageUrl: design.imageUrl,
                })),
            })) as { id: string | number }
            printfulOrderId = String(printfulOrder.id)
        }

        if (gelatoItems.length > 0) {
            const orderCurrency = isNonEmptyString(session.currency, 10)
                ? session.currency.trim().toUpperCase()
                : 'USD'
            const gelatoOrder = (await gelato.createOrder({
                orderReferenceId: order.id,
                currency: orderCurrency,
                customerEmail: email,
                shippingAddress: {
                    firstName: recipient.firstName,
                    lastName: recipient.lastName,
                    addressLine1: address.line1,
                    addressLine2: address.line2 || '',
                    city: address.city,
                    postcode: address.postal_code,
                    stateCode: address.state || '',
                    countryCode: address.country,
                    email,
                },
                items: gelatoItems.map(({ orderItem, design, gelatoProductUid }) => ({
                    itemReferenceId: `${order.id}-${orderItem.productId}`,
                    productUid: gelatoProductUid!,
                    quantity: orderItem.quantity,
                    fileUrl: design.imageUrl,
                })),
            })) as { id: string }
            gelatoOrderId = gelatoOrder.id
        }

        if (gootenItems.length > 0) {
            const gooten = getGootenClient()
            const primaryPayload = {
                SourceId: order.id,
                ExternalId: order.id,
                ShipToAddress: {
                    FirstName: recipient.firstName,
                    LastName: recipient.lastName,
                    Line1: address.line1,
                    Line2: address.line2 || '',
                    City: address.city,
                    State: address.state || '',
                    PostalCode: address.postal_code,
                    CountryCode: address.country,
                    Email: email,
                },
                Items: gootenItems.map(({ orderItem, design, gootenSku, gootenProductId }) => ({
                    SKU: gootenSku!,
                    ProductId: gootenProductId!,
                    Quantity: orderItem.quantity,
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
                        firstName: recipient.firstName,
                        lastName: recipient.lastName,
                        line1: address.line1,
                        line2: address.line2 || '',
                        city: address.city,
                        state: address.state || '',
                        postalCode: address.postal_code,
                        countryCode: address.country,
                        email,
                    },
                    items: gootenItems.map(({ orderItem, design, gootenSku, gootenProductId }) => ({
                        sku: gootenSku!,
                        productId: gootenProductId!,
                        quantity: orderItem.quantity,
                        images: [{ url: design.imageUrl }],
                    })),
                })
            }

            gootenOrderId = parseGootenOrderId(gootenResponse) || order.id
        }

        const fulfillmentOrderId = gootenOrderId || gelatoOrderId || printfulOrderId
        if (!fulfillmentOrderId) {
            throw new Error('Recovery created no provider order id.')
        }

        await prisma.order.update({
            where: { id: order.id },
            data: {
                status: 'processing',
                printfulOrderId: fulfillmentOrderId,
                email,
                shippingAddress: {
                    line1: address.line1,
                    line2: address.line2,
                    city: address.city,
                    state: address.state,
                    country: address.country,
                    postal_code: address.postal_code,
                    recovered_from_manual_review: true,
                    recovery_attempted: true,
                },
            },
        })

        await sendOrderConfirmation({
            email,
            orderId: order.id,
            items: order.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
            })),
            total: order.total,
        })

        await sendMakeOrderAlert({
            requestId: `manual-review-recovery:${order.id}`,
            orderId: order.id,
            stripeSessionId: order.stripeSessionId,
            email,
            total: order.total,
            itemsCount: order.items.length,
            status: 'processing',
            printfulOrderId: fulfillmentOrderId,
        })

        return {
            orderId: order.id,
            stripeSessionId: order.stripeSessionId,
            outcome: 'recovered',
            detail: `Recovered to processing with fulfillment id ${fulfillmentOrderId}.`,
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        await prisma.order.update({
            where: { id: order.id },
            data: {
                status: 'manual_review',
                shippingAddress: {
                    line1: address.line1,
                    line2: address.line2,
                    city: address.city,
                    state: address.state,
                    country: address.country,
                    postal_code: address.postal_code,
                    needs_manual_review: true,
                    recovery_attempted: true,
                    recovered_from_manual_review: false,
                    recovery_error: message,
                    recovery_failed_at: new Date().toISOString(),
                },
            },
        })

        return {
            orderId: order.id,
            stripeSessionId: order.stripeSessionId,
            outcome: 'recovery_failed',
            detail: message,
        }
    }
}

async function main() {
    const args = parseArgs(process.argv.slice(2))

    const where: Record<string, unknown> = {
        status: 'manual_review',
        printfulOrderId: null,
    }

    if (args.orderId) {
        where.id = args.orderId
    }
    if (args.sessionId) {
        where.stripeSessionId = args.sessionId
    }

    const orders = await prisma.order.findMany({
        where,
        include: {
            items: true,
        },
        orderBy: { createdAt: 'asc' },
        take: args.limit,
    })

    if (orders.length === 0) {
        console.log(JSON.stringify({ mode: args.execute ? 'execute' : 'dry_run', results: [] }, null, 2))
        return
    }

    const results = []
    for (const order of orders) {
        const result = await recoverOrder(order, args.execute)
        results.push(result)
    }

    console.log(JSON.stringify({
        mode: args.execute ? 'execute' : 'dry_run',
        matchedOrders: orders.length,
        results,
    }, null, 2))
}

main()
    .catch((error) => {
        console.error(error)
        process.exitCode = 1
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
