type MakeWebhookResult = {
    sent: boolean
    status?: number
    reason?: string
}

type MakeEventEnvelope<TPayload> = {
    source: 'smartprintai'
    eventType: string
    occurredAt: string
    payload: TPayload
}

type OrderAlertPayload = {
    requestId: string
    orderId: string
    stripeSessionId: string
    email: string
    total: number
    itemsCount: number
    status: string
    printfulOrderId: string
    internalNotes: string | null
}

type ShippedReviewPayload = {
    requestId: string
    orderId: string
    printfulOrderId: string
    email: string
    trackingUrl: string | null
    trackingNumber: string | null
    carrier: string | null
}

type AbandonedCartCandidatePayload = {
    requestId: string
    stripeSessionId: string
    checkoutUrl: string
    email: string | null
    sessionId: string | null
    itemCount: number
    cartTotal: number
    items: Array<{
        productId: string
        designId: string
        size: string
        color: string
        quantity: number
    }>
}

type DesignAutoPostPayload = {
    requestId: string
    designId: string
    prompt: string
    style: string
    imageUrl: string
    sessionId: string | null
    createdAtIso: string
}

type DailyDigestPayload = {
    requestId: string
    windowStartIso: string
    windowEndIso: string
    windowHours: number
    ordersCreated: number
    ordersPaid: number
    ordersProcessing: number
    ordersShipped: number
    ordersFulfillmentFailed: number
    designsCreated: number
}

function parseTimeoutMs(): number {
    const raw = process.env.MAKE_WEBHOOK_TIMEOUT_MS
    if (!raw) return 8000

    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return 8000

    const clamped = Math.min(Math.max(Math.round(parsed), 1000), 30000)
    return clamped
}

function normalizeWebhookUrl(value: string | undefined): string | null {
    if (!value) return null
    const trimmed = value.trim()
    if (!trimmed) return null

    try {
        const parsed = new URL(trimmed)
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return null
        }
        return parsed.toString()
    } catch {
        return null
    }
}

function webhookHost(url: string): string {
    try {
        return new URL(url).host
    } catch {
        return 'invalid-url'
    }
}

async function dispatchMakeEvent<TPayload>(
    webhookUrl: string | undefined,
    eventType: string,
    payload: TPayload
): Promise<MakeWebhookResult> {
    const normalizedUrl = normalizeWebhookUrl(webhookUrl)
    if (!normalizedUrl) {
        return { sent: false, reason: 'webhook_not_configured' }
    }

    const envelope: MakeEventEnvelope<TPayload> = {
        source: 'smartprintai',
        eventType,
        occurredAt: new Date().toISOString(),
        payload,
    }

    try {
        const response = await fetch(normalizedUrl, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify(envelope),
            signal: AbortSignal.timeout(parseTimeoutMs()),
        })

        if (!response.ok) {
            console.warn(
                JSON.stringify({
                    level: 'warn',
                    route: '/integrations/make',
                    event: 'make_webhook_non_2xx',
                    eventType,
                    host: webhookHost(normalizedUrl),
                    status: response.status,
                })
            )
            return { sent: false, status: response.status, reason: 'non_2xx_response' }
        }

        return { sent: true, status: response.status }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(
            JSON.stringify({
                level: 'warn',
                route: '/integrations/make',
                event: 'make_webhook_request_failed',
                eventType,
                host: webhookHost(normalizedUrl),
                message,
            })
        )
        return { sent: false, reason: 'request_failed' }
    }
}

export async function sendMakeOrderAlert(payload: OrderAlertPayload): Promise<MakeWebhookResult> {
    return dispatchMakeEvent(process.env.MAKE_ORDER_ALERT_WEBHOOK_URL, 'order_alert', payload)
}

export async function sendMakeShippedReviewRequest(payload: ShippedReviewPayload): Promise<MakeWebhookResult> {
    return dispatchMakeEvent(
        process.env.MAKE_SHIPPED_REVIEW_WEBHOOK_URL,
        'shipped_review_request',
        payload
    )
}

export async function sendMakeAbandonedCartCandidate(
    payload: AbandonedCartCandidatePayload
): Promise<MakeWebhookResult> {
    return dispatchMakeEvent(
        process.env.MAKE_ABANDONED_CART_WEBHOOK_URL,
        'abandoned_cart_candidate',
        payload
    )
}

export async function sendMakeDailyDigest(payload: DailyDigestPayload): Promise<MakeWebhookResult> {
    return dispatchMakeEvent(process.env.MAKE_DAILY_DIGEST_WEBHOOK_URL, 'daily_digest', payload)
}

export async function sendMakeDesignAutoPost(payload: DesignAutoPostPayload): Promise<MakeWebhookResult> {
    return dispatchMakeEvent(
        process.env.MAKE_DESIGN_AUTOPOST_WEBHOOK_URL,
        'design_auto_post',
        payload
    )
}
