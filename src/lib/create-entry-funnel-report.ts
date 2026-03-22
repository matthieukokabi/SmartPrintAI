import { CREATE_ENTRY_EVENT_NAMES } from '@/lib/analytics'
import { readHomepageEventRecords, type HomepageFunnelEventRecord } from '@/lib/homepage-funnel-report'

type CreateEntrypoint = 'homepage' | 'other' | 'unknown'
type CreatePromptLengthBucket = '0_2' | '3_10' | '11_30' | '31_80' | '81_plus' | 'unknown'
type CreateEntryDropoffStep = 'before_prompt_focus' | 'before_prompt_start' | 'before_generation_start' | 'none'

type CreateEntryBreakdownRow = {
    value: string
    count: number
    share: number
}

type CreateEntryDropoffRow = {
    step: Exclude<CreateEntryDropoffStep, 'none'>
    fromCount: number
    toCount: number
    dropoffCount: number
    dropoffRate: number
}

export type CreateEntryFunnelReport = {
    source: 'event_log'
    generatedAt: string
    recordCount: number
    createRecordCount: number
    hasData: boolean
    totals: {
        createPageViews: number
        entrypointResolved: number
        promptInputFocused: number
        promptStarted: number
        generationStarted: number
        productSelected: number
        templateSelected: number
        abandonedEarly: number
    }
    rates: {
        promptInteractionRate: number
        promptStartedRate: number
        generationStartRate: number
        productSelectionRateFromGeneration: number
        templateSelectionRate: number
        earlyAbandonmentRate: number
    }
    dropoff: {
        stageRows: CreateEntryDropoffRow[]
        biggestEarlyDropoffStep: CreateEntryDropoffStep
    }
    firstFrictionPoint: CreateEntryDropoffStep
    nextAction: string
    entrypointBreakdown: CreateEntryBreakdownRow[]
    homepageVariantBreakdown: CreateEntryBreakdownRow[]
    promptLengthBreakdown: CreateEntryBreakdownRow[]
}

const CREATE_ENTRY_EVENT_SET = new Set<string>(Object.values(CREATE_ENTRY_EVENT_NAMES))

function toRate(numerator: number, denominator: number): number {
    if (denominator <= 0) {
        return 0
    }
    return Number(((numerator / denominator) * 100).toFixed(2))
}

function asString(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null
    }
    const normalized = value.trim()
    if (!normalized) {
        return null
    }
    return normalized
}

function normalizeEntrypoint(value: unknown): CreateEntrypoint {
    const entrypoint = asString(value)?.toLowerCase()
    if (entrypoint === 'homepage' || entrypoint === 'other' || entrypoint === 'unknown') {
        return entrypoint
    }
    return 'unknown'
}

function normalizePromptLengthBucket(value: unknown): CreatePromptLengthBucket {
    const bucket = asString(value)
    switch (bucket) {
        case '0_2':
        case '3_10':
        case '11_30':
        case '31_80':
        case '81_plus':
            return bucket
        default:
            return 'unknown'
    }
}

function toBreakdownRows(counts: Map<string, number>): CreateEntryBreakdownRow[] {
    const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0)
    return Array.from(counts.entries())
        .map(([value, count]) => ({
            value,
            count,
            share: toRate(count, total),
        }))
        .sort((left, right) => right.count - left.count)
}

function countEvent(records: HomepageFunnelEventRecord[], eventName: string): number {
    return records.filter((record) => record.eventName === eventName).length
}

function clampStageCount(count: number, max: number): number {
    return Math.min(Math.max(count, 0), Math.max(max, 0))
}

export function aggregateCreateEntryFunnel(records: HomepageFunnelEventRecord[]): CreateEntryFunnelReport {
    const createRecords = records.filter((record) => CREATE_ENTRY_EVENT_SET.has(record.eventName))

    const createPageViews = countEvent(createRecords, CREATE_ENTRY_EVENT_NAMES.pageViewed)
    const entrypointResolved = countEvent(createRecords, CREATE_ENTRY_EVENT_NAMES.entrypointResolved)
    const promptInputFocused = countEvent(createRecords, CREATE_ENTRY_EVENT_NAMES.promptInputFocused)
    const promptStarted = countEvent(createRecords, CREATE_ENTRY_EVENT_NAMES.promptStarted)
    const generationStarted = countEvent(createRecords, CREATE_ENTRY_EVENT_NAMES.generationStarted)
    const productSelected = countEvent(createRecords, CREATE_ENTRY_EVENT_NAMES.productSelected)
    const templateSelected = countEvent(createRecords, CREATE_ENTRY_EVENT_NAMES.templateSelected)
    const abandonedEarly = countEvent(createRecords, CREATE_ENTRY_EVENT_NAMES.flowAbandonedEarly)

    const stageViews = Math.max(0, createPageViews)
    const stagePromptFocused = clampStageCount(promptInputFocused, stageViews)
    const stagePromptStarted = clampStageCount(promptStarted, stagePromptFocused)
    const stageGenerationStarted = clampStageCount(generationStarted, stagePromptStarted)

    const stageRows: CreateEntryDropoffRow[] = [
        {
            step: 'before_prompt_focus',
            fromCount: stageViews,
            toCount: stagePromptFocused,
            dropoffCount: Math.max(0, stageViews - stagePromptFocused),
            dropoffRate: toRate(Math.max(0, stageViews - stagePromptFocused), stageViews),
        },
        {
            step: 'before_prompt_start',
            fromCount: stagePromptFocused,
            toCount: stagePromptStarted,
            dropoffCount: Math.max(0, stagePromptFocused - stagePromptStarted),
            dropoffRate: toRate(Math.max(0, stagePromptFocused - stagePromptStarted), stagePromptFocused),
        },
        {
            step: 'before_generation_start',
            fromCount: stagePromptStarted,
            toCount: stageGenerationStarted,
            dropoffCount: Math.max(0, stagePromptStarted - stageGenerationStarted),
            dropoffRate: toRate(Math.max(0, stagePromptStarted - stageGenerationStarted), stagePromptStarted),
        },
    ]

    const biggestStage = stageRows.reduce<CreateEntryDropoffRow | null>((largest, current) => {
        if (!largest) {
            return current
        }
        return current.dropoffCount > largest.dropoffCount ? current : largest
    }, null)
    const biggestEarlyDropoffStep: CreateEntryDropoffStep = biggestStage?.dropoffCount
        ? biggestStage.step
        : 'none'

    const entrypointCounts = new Map<string, number>()
    const variantCounts = new Map<string, number>()
    const promptLengthCounts = new Map<string, number>()

    for (const record of createRecords) {
        if (record.eventName === CREATE_ENTRY_EVENT_NAMES.entrypointResolved) {
            const value = normalizeEntrypoint(record.params.entrypoint)
            entrypointCounts.set(value, (entrypointCounts.get(value) || 0) + 1)
        }

        if (record.eventName === CREATE_ENTRY_EVENT_NAMES.pageViewed) {
            const variant = asString(record.params.page_variant) || record.pageVariant || 'unknown'
            variantCounts.set(variant, (variantCounts.get(variant) || 0) + 1)
        }

        if (record.eventName === CREATE_ENTRY_EVENT_NAMES.promptStarted) {
            const bucket = normalizePromptLengthBucket(record.params.prompt_length_bucket)
            promptLengthCounts.set(bucket, (promptLengthCounts.get(bucket) || 0) + 1)
        }
    }

    let nextAction = 'Keep collecting create-entry data until a clear early-stage drop-off appears.'
    if (biggestEarlyDropoffStep === 'before_prompt_focus') {
        nextAction = 'Clarify the very first instruction at the top of /create and reduce first-screen ambiguity.'
    } else if (biggestEarlyDropoffStep === 'before_prompt_start') {
        nextAction = 'Improve prompt examples and helper text to make writing the first prompt easier.'
    } else if (biggestEarlyDropoffStep === 'before_generation_start') {
        nextAction = 'Investigate prompt submission friction (button clarity, validation messaging, or loading confidence).'
    }

    return {
        source: 'event_log',
        generatedAt: new Date().toISOString(),
        recordCount: records.length,
        createRecordCount: createRecords.length,
        hasData: createRecords.length > 0,
        totals: {
            createPageViews,
            entrypointResolved,
            promptInputFocused,
            promptStarted,
            generationStarted,
            productSelected,
            templateSelected,
            abandonedEarly,
        },
        rates: {
            promptInteractionRate: toRate(promptInputFocused, createPageViews),
            promptStartedRate: toRate(promptStarted, createPageViews),
            generationStartRate: toRate(generationStarted, createPageViews),
            productSelectionRateFromGeneration: toRate(productSelected, generationStarted),
            templateSelectionRate: toRate(templateSelected, createPageViews),
            earlyAbandonmentRate: toRate(abandonedEarly, createPageViews),
        },
        dropoff: {
            stageRows,
            biggestEarlyDropoffStep,
        },
        firstFrictionPoint: biggestEarlyDropoffStep,
        nextAction,
        entrypointBreakdown: toBreakdownRows(entrypointCounts),
        homepageVariantBreakdown: toBreakdownRows(variantCounts),
        promptLengthBreakdown: toBreakdownRows(promptLengthCounts),
    }
}

export async function buildCreateEntryFunnelReport(filePath?: string): Promise<CreateEntryFunnelReport> {
    const records = await readHomepageEventRecords(filePath)
    return aggregateCreateEntryFunnel(records)
}
