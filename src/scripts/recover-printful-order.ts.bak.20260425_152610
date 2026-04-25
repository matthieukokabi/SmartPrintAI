/**
 * One-off recovery script for orders where Printful fulfillment failed
 * before commit f897a0c (Printful client missing X-PF-Store-Id header).
 *
 * Usage:  npx tsx src/scripts/recover-printful-order.ts <orderId>
 *
 * Safe to re-run: refuses to fire if the Order already has a printfulOrderId.
 * Leaves printfulOrderId NULL on any error so a follow-up retry is possible.
 */
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { printful } from '@/lib/printful'

interface ProductColor {
    name: string
    hex: string
    printfulVariantId: number
    previewImageUrl?: string | null
}

interface ShippingAddressJson {
    line1?: string
    line2?: string | null
    city?: string
    state?: string
    country?: string
    postal_code?: string
}

const orderId = process.argv[2]
if (!orderId) {
    console.error('Usage: npx tsx src/scripts/recover-printful-order.ts <orderId>')
    process.exit(1)
}

async function main() {
    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) {
        throw new Error(`Order ${orderId} not found`)
    }
    if (order.printfulOrderId) {
        console.log(`[recover] Order ${orderId} already has printfulOrderId=${order.printfulOrderId} — nothing to do.`)
        return
    }
    if (!order.stripeSessionId) {
        throw new Error(`Order ${orderId} has no stripeSessionId — cannot recover.`)
    }

    console.log(`[recover] Recovering Printful for order ${orderId} (stripe session ${order.stripeSessionId})…`)

    const items = await prisma.orderItem.findMany({
        where: { orderId },
        include: { product: true, design: true },
    })
    if (items.length === 0) {
        throw new Error(`No OrderItems found for ${orderId}`)
    }

    // Re-fetch Stripe session for recipient name (not persisted in shippingAddress JSON).
    // shipping_details and customer_details are populated properties, not expandable relations,
    // so they come back on a plain retrieve.
    const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId)
    const sessionAny = session as unknown as {
        shipping_details?: { name?: string | null }
        collected_information?: { shipping_details?: { name?: string | null } }
        customer_details?: { name?: string | null }
    }
    const recipientName =
        sessionAny.shipping_details?.name ||
        sessionAny.collected_information?.shipping_details?.name ||
        sessionAny.customer_details?.name ||
        null
    if (!recipientName) {
        throw new Error(`No recipient name in Stripe session ${order.stripeSessionId}`)
    }

    const ship = order.shippingAddress as unknown as ShippingAddressJson
    if (!ship?.line1 || !ship.city || !ship.country || !ship.postal_code) {
        throw new Error(`Order shippingAddress JSONB is incomplete: ${JSON.stringify(ship)}`)
    }

    const printfulItems = items.map((item) => {
        const colors = (item.product.colors as unknown) as ProductColor[]
        const colorData = colors.find(
            (c) => c.name.toLowerCase() === item.color.toLowerCase()
        )
        if (!colorData?.printfulVariantId) {
            throw new Error(`No Printful variant found for product "${item.product.name}" in color "${item.color}"`)
        }
        return {
            variantId: colorData.printfulVariantId,
            quantity: item.quantity,
            imageUrl: item.design.imageUrl,
        }
    })

    const payload = {
        email: order.email,
        shippingAddress: {
            name: recipientName,
            address1: ship.line1,
            city: ship.city,
            state_code: ship.state || '',
            country_code: ship.country,
            zip: ship.postal_code,
        },
        items: printfulItems,
    }

    console.log('[recover] Printful payload:')
    console.log(JSON.stringify({ ...payload, items: payload.items.map((i) => ({ ...i, imageUrl: '<redacted>' })) }, null, 2))
    console.log(`[recover] (item imageUrl present, ${payload.items.length} item(s))`)

    const printfulOrder = (await printful.createOrder(payload)) as { id: number | string }
    const printfulOrderId = String(printfulOrder.id)

    console.log(`[recover] Printful created order id=${printfulOrderId}`)

    const updated = await prisma.order.update({
        where: { id: orderId },
        data: { printfulOrderId, updatedAt: new Date() },
    })
    console.log(`[recover] Order ${orderId} updated: printfulOrderId=${updated.printfulOrderId}, status=${updated.status}`)
}

main()
    .catch((e) => {
        console.error('[recover] FAILED:', e instanceof Error ? `${e.message}\n${e.stack}` : e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
