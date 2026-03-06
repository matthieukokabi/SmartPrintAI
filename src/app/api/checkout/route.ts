import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    try {
        const { items, email, sessionId } = await req.json()

        if (!items?.length) {
            return NextResponse.json({ error: 'No items in cart' }, { status: 400 })
        }

        // Always fetch prices from DB — never trust client prices
        const products = await prisma.product.findMany({
            where: { id: { in: items.map((i: any) => i.productId) } },
        })

        const lineItems = items.map((item: any) => {
            const product = products.find((p) => p.id === item.productId)!
            return {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: product.name,
                        description: `Custom AI Design — ${item.size}, ${item.color}`,
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

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            customer_email: email,
            shipping_address_collection: {
                allowed_countries: ['US', 'CA', 'GB', 'DE', 'FR', 'AU', 'NL', 'BE', 'CH', 'AT', 'IT', 'ES'],
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
            metadata: {
                sessionId: sessionId || '',
                items: JSON.stringify(items),
            },
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cart`,
        })

        return NextResponse.json({ url: session.url })
    } catch (error) {
        console.error('Checkout error:', error)
        return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
    }
}
