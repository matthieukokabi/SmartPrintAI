import { NextRequest } from 'next/server'
import { getRequestId, jsonWithRequestId, logApiError, logApiInfo, logApiWarn } from '@/lib/api-logging'
import { rateLimitRequest } from '@/lib/rate-limit'
import { sendSupportAutoReply, sendSupportRequest } from '@/lib/resend'
import { appendSupportIntakeRecord } from '@/lib/support-intake-log'

type SupportPayload = {
    name: string
    email: string
    subject: string
    message: string
    orderId?: string
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function isNonEmptyString(value: unknown, maxLen = 200): value is string {
    return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLen
}

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function validateSupportPayload(input: unknown):
    | { ok: true; data: SupportPayload }
    | { ok: false; error: string } {
    if (!isObject(input)) {
        return { ok: false, error: 'Invalid payload' }
    }

    if (!isNonEmptyString(input.name, 120)) {
        return { ok: false, error: 'Invalid name' }
    }

    if (!isNonEmptyString(input.email, 254) || !isValidEmail(input.email)) {
        return { ok: false, error: 'Invalid email' }
    }

    if (!isNonEmptyString(input.subject, 140)) {
        return { ok: false, error: 'Invalid subject' }
    }

    if (!isNonEmptyString(input.message, 5000) || input.message.trim().length < 10) {
        return { ok: false, error: 'Message too short' }
    }

    let orderId: string | undefined
    if (input.orderId !== undefined && input.orderId !== null) {
        if (!isNonEmptyString(input.orderId, 120)) {
            return { ok: false, error: 'Invalid orderId' }
        }
        const trimmed = input.orderId.trim()
        if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
            return { ok: false, error: 'Invalid orderId' }
        }
        orderId = trimmed
    }

    return {
        ok: true,
        data: {
            name: input.name.trim(),
            email: input.email.trim().toLowerCase(),
            subject: input.subject.trim(),
            message: input.message.trim(),
            orderId,
        },
    }
}

export async function POST(req: NextRequest) {
    const route = '/api/support'
    const requestId = getRequestId(req)
    const respond = <T>(body: T, init?: ResponseInit) => jsonWithRequestId(requestId, body, init)

    logApiInfo(route, requestId, 'request_received')

    const limiter = await rateLimitRequest(req, 'support', 10, 3600)
    if (!limiter.allowed) {
        logApiWarn(route, requestId, 'rate_limited', { resetInSec: limiter.resetInSec })
        const response = respond({ error: 'Rate limit exceeded. Please try again shortly.' }, { status: 429 })
        response.headers.set('retry-after', String(limiter.resetInSec))
        response.headers.set('x-ratelimit-limit', String(limiter.limit))
        response.headers.set('x-ratelimit-remaining', String(limiter.remaining))
        return response
    }

    try {
        let rawPayload: unknown
        try {
            rawPayload = await req.json()
        } catch {
            logApiWarn(route, requestId, 'invalid_json')
            return respond({ error: 'Invalid JSON body' }, { status: 400 })
        }

        const validation = validateSupportPayload(rawPayload)
        if (!validation.ok) {
            logApiWarn(route, requestId, 'validation_failed', { reason: validation.error })
            return respond({ error: validation.error }, { status: 400 })
        }

        const { name, email, subject, message, orderId } = validation.data

        await sendSupportRequest({
            name,
            email,
            subject,
            message,
            orderId,
            requestId,
        })

        await sendSupportAutoReply({
            name,
            email,
            orderId,
        })

        try {
            await appendSupportIntakeRecord({
                requestId,
                createdAt: new Date().toISOString(),
                name,
                email,
                subject,
                orderId: orderId || null,
            })
        } catch (error) {
            logApiWarn(route, requestId, 'support_intake_log_failed', {
                message: error instanceof Error ? error.message : 'unknown_error',
            })
        }

        logApiInfo(route, requestId, 'request_succeeded')
        return respond({
            ok: true,
            message: 'Support request received. We reply within 24 business hours.',
        })
    } catch (error) {
        logApiError(route, requestId, 'request_failed', error)
        return respond({ error: 'Support request failed' }, { status: 500 })
    }
}
