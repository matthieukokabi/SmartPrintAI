import * as Sentry from '@sentry/node'

type SentryContext = Record<string, unknown>

let initialized = false

function parseSampleRate(raw: string | undefined): number {
    if (!raw) return 0
    const value = Number(raw)
    if (!Number.isFinite(value)) return 0
    if (value < 0) return 0
    if (value > 1) return 1
    return value
}

function ensureSentryInitialized() {
    if (initialized) return true

    const dsn = process.env.SENTRY_DSN
    if (!dsn) {
        return false
    }

    Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: parseSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE),
        sendDefaultPii: false,
    })

    initialized = true
    return true
}

export function captureApiException(error: unknown, context: SentryContext = {}) {
    if (!ensureSentryInitialized()) {
        return
    }

    Sentry.withScope((scope) => {
        scope.setTag('component', 'api')

        for (const [key, value] of Object.entries(context)) {
            scope.setExtra(key, value)
        }

        if (error instanceof Error) {
            Sentry.captureException(error)
            return
        }

        Sentry.captureMessage(String(error), 'error')
    })
}
