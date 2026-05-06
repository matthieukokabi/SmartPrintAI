import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { printful } from '@/lib/printful'

// V1 Printful webhooks are unsigned. We verify by re-fetching from
// Printful's authenticated API; the webhook body is treated as an
// untrusted "kick" telling us to refresh state, never as a source
// of truth. See:
//   00_admin/handoffs/claude_code_fix_printful_webhook_signature.md

type PrintfulWebhookEnvelope = {
    type: string
    created?: number
    retries?: number
    store?: number
    data?: {
        order?: { id?: number | string; external_id?: string | null }
    }
}

const SENSITIVE_HEADERS = new Set([
    'authorization',
    'cookie',
    'x-api-key',
    'stripe-signature',
])

function maskedHeaders(req: NextRequest): Record<string, string> {
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

function mapPrintfulStatusToLocal(printfulStatus: string): string | null {
    const s = (printfulStatus || '').toLowerCase()
    if (s === 'fulfilled' || s === 'shipped') return 'fulfilled'
    if (s === 'canceled' || s === 'cancelled') return 'canceled'
    if (s === 'failed') return 'REQUIRES_REVIEW'
    // pending / inprocess / onhold / partial / etc.: leave unchanged
    return null
}

export async function POST(req: NextRequest) {
    const requestId = crypto.randomUUID()
    const bodyText = await req.text()
    const allHeaders = maskedHeaders(req)

    let envelope: PrintfulWebhookEnvelope
    try {
        envelope = JSON.parse(bodyText) as PrintfulWebhookEnvelope
    } catch {
        console.error(
            '[printful-webhook] invalid JSON ' +
                JSON.stringify({
                    requestId,
                    bodyLength: bodyText.length,
                    bodyPreview: bodyText.slice(0, 200),
                    allHeaders,
                }),
        )
        return NextResponse.json({ error: 'invalid json' }, { status: 400 })
    }

    const printfulOrderId = envelope?.data?.order?.id
    const externalId = envelope?.data?.order?.external_id ?? null
    const eventType = envelope?.type ?? 'unknown'

    if (!printfulOrderId) {
        console.error(
            '[printful-webhook] missing order id ' +
                JSON.stringify({
                    requestId,
                    eventType,
                    bodyLength: bodyText.length,
                    allHeaders,
                }),
        )
        // Always 200 unless body is malformed JSON — Printful retries
        // forever on non-2xx, which fills logs with no benefit.
        return NextResponse.json({ ok: true, ignored: true })
    }

    // Re-fetch authoritative order state from Printful's authenticated
    // API. This is the new security boundary: forging a webhook body
    // is useless because we ignore the body's claims and ask Printful
    // directly with our API key.
    let authoritative: Awaited<ReturnType<typeof printful.getOrder>>
    try {
        authoritative = await printful.getOrder(printfulOrderId)
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(
            '[printful-webhook] re-fetch failed ' +
                JSON.stringify({
                    requestId,
                    eventType,
                    printfulOrderId,
                    error: msg,
                }),
        )
        return NextResponse.json({ ok: true, refetchFailed: true })
    }

    const localOrder = await prisma.order.findFirst({
        where: {
            OR: [
                { printfulOrderId: String(printfulOrderId) },
                ...(externalId ? [{ id: externalId }] : []),
            ],
        },
    })

    if (!localOrder) {
        console.warn(
            '[printful-webhook] no local order found ' +
                JSON.stringify({
                    requestId,
                    eventType,
                    printfulOrderId,
                    externalId,
                }),
        )
        return NextResponse.json({ ok: true, noLocalOrder: true })
    }

    const newStatus = mapPrintfulStatusToLocal(authoritative.status)

    const trackingSummary =
        (authoritative.shipments || [])
            .map((s) => [s.carrier, s.tracking_number].filter(Boolean).join(':'))
            .filter(Boolean)
            .join(',') || null

    const ts = new Date().toISOString()
    const noteAddition =
        `[${ts}] webhook=${eventType} ` +
        `printful_status=${authoritative.status} ` +
        `local_status_before=${localOrder.status} ` +
        `local_status_after=${newStatus ?? localOrder.status}` +
        (trackingSummary ? ` tracking=${trackingSummary}` : '')

    const updatedNotes = localOrder.internalNotes
        ? `${localOrder.internalNotes}\n${noteAddition}`
        : noteAddition

    await prisma.order.update({
        where: { id: localOrder.id },
        data: {
            ...(newStatus ? { status: newStatus } : {}),
            internalNotes: updatedNotes,
        },
    })

    console.log(
        '[printful-webhook] processed ' +
            JSON.stringify({
                requestId,
                eventType,
                printfulOrderId,
                localOrderId: localOrder.id,
                statusBefore: localOrder.status,
                statusAfter: newStatus ?? localOrder.status,
                trackingSummary,
            }),
    )

    return NextResponse.json({ ok: true })
}
