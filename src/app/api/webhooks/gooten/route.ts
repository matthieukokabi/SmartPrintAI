import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendShipmentNotification } from '@/lib/resend'

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function asString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : ''
}

export async function POST(req: NextRequest) {
    let payload: unknown
    try {
        payload = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    if (!isObject(payload)) {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const eventType = asString(payload.EventType || payload.eventType || payload.type)
    const orderId = asString(payload.OrderId || payload.orderId || payload.Id || payload.id)

    if (!orderId) {
        console.warn('[Gooten webhook] No order ID in payload')
        return NextResponse.json({ ok: true })
    }

    const gootenRef = `gooten:${orderId}`

    if (eventType === 'Shipped' || eventType === 'shipped' || eventType === 'ItemShipped') {
        const shipments = (payload.Shipments || payload.shipments || payload.TrackingInfo || []) as unknown[]
        const firstShipment = Array.isArray(shipments) && isObject(shipments[0]) ? shipments[0] : null

        const trackingNumber = asString(
            firstShipment?.TrackingNumber || firstShipment?.trackingNumber || payload.TrackingNumber
        )
        const trackingUrl = asString(
            firstShipment?.TrackingUrl || firstShipment?.trackingUrl || payload.TrackingUrl
        )
        const carrier = asString(
            firstShipment?.Carrier || firstShipment?.carrier || firstShipment?.CarrierName || payload.Carrier
        )

        const order = await prisma.order.findFirst({
            where: { printfulOrderId: { contains: gootenRef } },
        })

        if (order) {
            await prisma.order.update({
                where: { id: order.id },
                data: {
                    status: 'shipped',
                    trackingNumber: trackingNumber || null,
                    trackingCarrier: carrier || null,
                    trackingUrl: trackingUrl || null,
                    shippedAt: new Date(),
                },
            })

            console.log(`[Gooten] Order ${orderId} shipped — tracking: ${trackingNumber}`)

            if (order.email) {
                await sendShipmentNotification({
                    email: order.email,
                    orderId: order.id,
                    trackingNumber: trackingNumber || null,
                    trackingUrl: trackingUrl || null,
                    carrier: carrier || null,
                }).catch((err) => console.error('[Gooten] Failed to send shipment email:', err))
            }
        } else {
            console.warn(`[Gooten] No order found for gooten ref: ${gootenRef}`)
        }
    } else {
        console.log(`[Gooten webhook] Unhandled event: ${eventType} for order ${orderId}`)
    }

    return NextResponse.json({ ok: true })
}
