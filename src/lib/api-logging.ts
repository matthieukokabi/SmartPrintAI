import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { captureApiException } from '@/lib/sentry'

type LogFields = Record<string, unknown>

function safeError(error: unknown): LogFields {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
        }
    }

    return {
        message: String(error),
    }
}

export function getRequestId(req: NextRequest): string {
    const fromHeader = req.headers.get('x-request-id')?.trim()
    if (fromHeader && fromHeader.length <= 120) {
        return fromHeader
    }
    return randomUUID()
}

export function logApiInfo(route: string, requestId: string, event: string, fields: LogFields = {}) {
    console.log(JSON.stringify({
        level: 'info',
        route,
        requestId,
        event,
        ...fields,
    }))
}

export function logApiWarn(route: string, requestId: string, event: string, fields: LogFields = {}) {
    console.warn(JSON.stringify({
        level: 'warn',
        route,
        requestId,
        event,
        ...fields,
    }))
}

export function logApiError(route: string, requestId: string, event: string, error: unknown, fields: LogFields = {}) {
    const errorFields = safeError(error)

    console.error(JSON.stringify({
        level: 'error',
        route,
        requestId,
        event,
        ...fields,
        ...errorFields,
    }))

    captureApiException(error, {
        route,
        requestId,
        event,
        ...fields,
        ...errorFields,
    })
}

export function jsonWithRequestId<T>(requestId: string, body: T, init?: ResponseInit): NextResponse<T> {
    const response = NextResponse.json(body, init)
    response.headers.set('x-request-id', requestId)
    return response
}
