import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { printful } from '@/lib/printful'
import { sendOrderConfirmation } from '@/lib/resend'
import Stripe from 'stripe'

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

        const items = JSON.parse(session.metadata?.items || '[]')
        const shippingDetails = session.shipping_details

        if (!shippingDetails?.address) {
            console.error('No shipping address in session')
            return NextResponse.json({ ok: true })
        }

        const products = await prisma.product.findMany({
            where: { id: { in: items.map((i: any) => i.productId) } },
        })

        const designs = await prisma.design.findMany({
            where: { id: { in: items.map((i: any) => i.designId) } },
        })

        try {
            // Create Printful order
            const printfulOrder = await printful.createOrder({
                email: session.customer_email!,
                shippingAddress: {
                    name: shippingDetails.name!,
                    address1: shippingDetails.address.line1!,
                    city: shippingDetails.address.city!,
                    state_code: shippingDetails.address.state || '',
                    country_code: shippingDetails.address.country!,
                    zip: shippingDetails.address.postal_code!,
                },
                items: items.map((item: any) => {
                    const product = products.find((p) => p.id === item.productId)!
                    const design = designs.find((d) => d.id === item.designId)!
                    const colorData = (product.colors as any[]).find(
                        (c) => c.name.toLowerCase() === item.color.toLowerCase()
                    )
                    return {
                        catalogVariantId: colorData?.printfulVariantId,
                        quantity: item.quantity,
                        imageUrl: design.imageUrl,
                    }
                }),
            })

            // Save order to DB
            const order = await prisma.order.create({
                data: {
                    email: session.customer_email!,
                    stripeSessionId: session.id,
                    printfulOrderId: String((printfulOrder as any).id),
                    status: 'processing',
                    subtotal: session.amount_subtotal! / 100,
                    shippingCost: session.shipping_cost?.amount_total
                        ? session.shipping_cost.amount_total / 100
                        : 5.99,
                    total: session.amount_total! / 100,
                    shippingAddress: shippingDetails.address as any,
                    items: {
                        create: items.map((item: any) => ({
                            productId: item.productId,
                            designId: item.designId,
                            size: item.size,
                            color: item.color,
                            quantity: item.quantity,
                            price: products.find((p) => p.id === item.productId)!.sellPrice,
                        })),
                    },
                },
            })

            // Send confirmation email
            await sendOrderConfirmation({
                email: session.customer_email!,
                orderId: order.id,
                items,
                total: order.total,
            })
        } catch (err) {
            console.error('Order processing error:', err)
        }
    }

    return NextResponse.json({ ok: true })
}
