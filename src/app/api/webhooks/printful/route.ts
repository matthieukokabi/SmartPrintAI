import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendShipmentNotification, sendOrderInProduction } from '@/lib/resend'

const CANDIDATE_HEADERS = [
    'x-printful-signature',
    'x-pf-webhook-signature',
    'x-pf-signature',
    'x-printful-webhook-signature',
]

const HEX_RE = /^[0-9a-fA-F]+$/

const SENSITIVE_HEADERS = new Set([
    'authorization',
    'cookie',
    'x-api-key',
    'stripe-signature',
])

interface VerifyResult {
    passed: boolean
    scheme: 'a' | 'b' | 'none'
    headerName: string | null
    receivedSig: string | null
}

function safeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a)
    const bb = Buffer.from(b)
    if (ab.length !== bb.length) return false
    return crypto.timingSafeEqual(ab, bb)
}

function tryVerifyAgainst(
    body: string,
    headerValue: string,
    secret: string
): { ok: boolean; scheme: 'a' | 'b' | 'none' } {
    const candidates = [headerValue, headerValue.replace(/^sha256=/i, '')]

    // Scheme A: HMAC raw secret string as key, base64 digest
    const expectedA = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('base64')
    for (const c of candidates) {
        if (safeEqual(c, expectedA)) return { ok: true, scheme: 'a' }
    }

    // Scheme B: HMAC hex-decoded secret as key, hex digest (lowercase compare)
    if (HEX_RE.test(secret) && secret.length % 2 === 0) {
        const expectedB = crypto
            .createHmac('sha256', Buffer.from(secret, 'hex'))
            .update(body)
            .digest('hex')
        for (const c of candidates) {
            if (safeEqual(c.toLowerCase(), expectedB.toLowerCase())) {
                return { ok: true, scheme: 'b' }
            }
        }
    }

    return { ok: false, scheme: 'none' }
}

function verifySignature(body: string, req: NextRequest): VerifyResult {
    const secret = process.env.PRINTFUL_WEBHOOK_SECRET
    if (!secret) {
        return { passed: false, scheme: 'none', headerName: null, receivedSig: null }
    }

    let firstPresentHeader: string | null = null
    let firstPresentValue: string | null = null

    for (const name of CANDIDATE_HEADERS) {
        const v = req.headers.get(name)
        if (!v) continue
        if (firstPresentHeader === null) {
            firstPresentHeader = name
            firstPresentValue = v
        }
        const result = tryVerifyAgainst(body, v, secret)
        if (result.ok) {
            return { passed: true, scheme: result.scheme, headerName: name, receivedSig: v }
        }
    }

    return {
        passed: false,
        scheme: 'none',
        headerName: firstPresentHeader,
        receivedSig: firstPresentValue,
    }
}

function maskHeaders(req: NextRequest): Record<string, string> {
    const out: Record<string, string> = {}
    req.headers.forEach((v, k) => {
        if (SENSITIVE_HEADERS.has(k.toLowerCase())) {
            out[k] = `<masked-${v.length}>`
        } else {
            out[k] = v
        }
    })
    return out
}

export async function POST(req: NextRequest) {
    const body = await req.text()
    const verifyRes = verifySignature(body, req)

    if (!verifyRes.passed) {
        const diag = {
            receivedHeaderName: verifyRes.headerName,
            receivedSig: verifyRes.receivedSig,
            bodyLength: body.length,
            bodyPreview: body.slice(0, 300),
            allHeaders: maskHeaders(req),
        }
        console.error('[printful-webhook] invalid signature ' + JSON.stringify(diag))
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

    console.log(
        `[printful-webhook] signature OK scheme=${verifyRes.scheme} header=${verifyRes.headerName} bodyLength=${body.length} eventType=${payload.type}`
    )

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
