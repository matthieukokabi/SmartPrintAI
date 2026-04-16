import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendShipmentNotification, sendOrderInProduction } from '@/lib/resend'

function verifySignature(body: string, signature: string | null): boolean {
    const secret = process.env.PRINTFUL_WEBHOOK_SECRET
    if (!secret || !signature) return false

    const expected = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('base64')

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
    )
}

export async function POST(req: NextRequest) {
    const body = await req.text()
    const signature = req.headers.get('x-printful-signature')

    if (!verifySignature(body, signature)) {
        console.error('Printful webhook: invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    let payload: {
        type: string
        data: {
            order: {
                id: number
                external_id?: string
                status: string
                shipments?: Array<{
                    carrier: string
                    tracking_number: string
                    tracking_url: string
                }>
            }
        }
    }

    try {
        payload = JSON.parse(body)
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const printfulOrderId = String(payload.data.order.id)

    if (payload.type === 'package_shipped') {
        const shipment = payload.data.order.shipments?.[0]

        await prisma.order.updateMany({
            where: { printfulOrderId },
            data: {
                status: 'shipped',
                trackingNumber: shipment?.tracking_number ?? null,
                trackingCarrier: shipment?.carrier ?? null,
                trackingUrl: shipment?.tracking_url ?? null,
                shippedAt: new Date(),
            },
        })

        console.log(`Order ${printfulOrderId} shipped — tracking: ${shipment?.tracking_number}`)

        const shippedOrder = await prisma.order.findFirst({ where: { printfulOrderId } })
        if (shippedOrder?.email) {
            await sendShipmentNotification({
                email: shippedOrder.email,
                orderId: shippedOrder.id,
                trackingNumber: shipment?.tracking_number ?? null,
                trackingUrl: shipment?.tracking_url ?? null,
                carrier: shipment?.carrier ?? null,
            }).catch((err) => console.error('Failed to send shipment email:', err))
        }
    }

    if (payload.type === 'order_updated') {
        const printfulStatus = payload.data.order.status

        const statusMap: Record<string, string> = {
            draft: 'pending',
            pending: 'processing',
            in_process: 'processing',
            fulfilled: 'shipped',
            canceled: 'cancelled',
            failed: 'failed',
        }

        const mappedStatus = statusMap[printfulStatus] ?? 'processing'

        await prisma.order.updateMany({
            where: { printfulOrderId },
            data: { status: mappedStatus },
        })

        console.log(`Order ${printfulOrderId} status updated: ${printfulStatus} → ${mappedStatus}`)

        if (printfulStatus === 'in_process') {
            const prodOrder = await prisma.order.findFirst({ where: { printfulOrderId } })
            if (prodOrder?.email) {
                await sendOrderInProduction({
                    email: prodOrder.email,
                    orderId: prodOrder.id,
                }).catch((err) => console.error('Failed to send production email:', err))
            }
        }
    }

    return NextResponse.json({ ok: true })
}
