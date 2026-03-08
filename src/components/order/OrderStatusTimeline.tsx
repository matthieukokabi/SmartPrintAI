import { AlertTriangle, CheckCircle2, Circle, Clock3 } from 'lucide-react'

type StepState = 'done' | 'current' | 'pending' | 'warning' | 'error'

type Step = {
    key: 'paid' | 'processing' | 'shipped'
    label: string
    description: string
}

const STEPS: Step[] = [
    {
        key: 'paid',
        label: 'Payment confirmed',
        description: 'Your payment was received successfully.',
    },
    {
        key: 'processing',
        label: 'In production',
        description: 'Your item is being prepared and printed.',
    },
    {
        key: 'shipped',
        label: 'Shipped',
        description: 'Your package left production and is on the way.',
    },
]

function normalizeStatus(status: string): string {
    return status.trim().toLowerCase()
}

function toTitleCase(value: string): string {
    return value
        .replace(/_/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
}

function getStepState(status: string, index: number): StepState {
    const normalized = normalizeStatus(status)

    if (normalized === 'manual_review') {
        if (index === 0) return 'done'
        if (index === 1) return 'warning'
        return 'pending'
    }

    if (normalized === 'fulfillment_failed') {
        if (index === 0) return 'done'
        if (index === 1) return 'error'
        return 'pending'
    }

    if (normalized === 'shipped') {
        return 'done'
    }

    if (normalized === 'processing') {
        if (index === 0) return 'done'
        if (index === 1) return 'current'
        return 'pending'
    }

    if (normalized === 'paid') {
        if (index === 0) return 'current'
        return 'pending'
    }

    return 'pending'
}

function iconForState(state: StepState) {
    if (state === 'done') return <CheckCircle2 className="w-4 h-4" />
    if (state === 'current') return <Clock3 className="w-4 h-4" />
    if (state === 'warning' || state === 'error') return <AlertTriangle className="w-4 h-4" />
    return <Circle className="w-4 h-4" />
}

function stateClasses(state: StepState): string {
    if (state === 'done') return 'text-green-400 border-green-500/40 bg-green-500/10'
    if (state === 'current') return 'text-blue-300 border-blue-400/40 bg-blue-500/10'
    if (state === 'warning') return 'text-yellow-300 border-yellow-400/40 bg-yellow-500/10'
    if (state === 'error') return 'text-red-300 border-red-400/40 bg-red-500/10'
    return 'text-muted-foreground border-white/10 bg-white/5'
}

function helperMessage(status: string): string | null {
    const normalized = normalizeStatus(status)

    if (normalized === 'manual_review') {
        return 'Order requires manual review before fulfillment starts.'
    }
    if (normalized === 'fulfillment_failed') {
        return 'Fulfillment failed. Support intervention is required.'
    }
    return null
}

export function getReadableOrderStatus(status: string): string {
    return toTitleCase(normalizeStatus(status) || 'pending')
}

type Props = {
    status: string
}

export default function OrderStatusTimeline({ status }: Props) {
    const note = helperMessage(status)

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Order status</p>
                <span className="text-sm font-medium text-foreground">{getReadableOrderStatus(status)}</span>
            </div>

            <ol className="space-y-3">
                {STEPS.map((step, index) => {
                    const state = getStepState(status, index)
                    return (
                        <li key={step.key} className={`rounded-lg border p-3 ${stateClasses(state)}`}>
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5">{iconForState(state)}</div>
                                <div>
                                    <p className="text-sm font-medium">{step.label}</p>
                                    <p className="text-xs opacity-85">{step.description}</p>
                                </div>
                            </div>
                        </li>
                    )
                })}
            </ol>

            {note ? <p className="text-xs text-yellow-300">{note}</p> : null}
        </div>
    )
}
