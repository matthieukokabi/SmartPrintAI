import { CREATE_ENTRY_EVENT_NAMES } from '@/lib/analytics'
import { readHomepageEventRecords, type HomepageFunnelEventRecord } from '@/lib/homepage-funnel-report'

type CreateEntrypoint = 'homepage' | 'other' | 'unknown'
type CreatePromptLengthBucket = '0_2' | '3_10' | '11_30' | '31_80' | '81_plus' | 'unknown'
export type CreateEntryDropoffStep = 'before_prompt_focus' | 'before_prompt_start' | 'before_generation_start' | 'none'
export type CreateEntryStatus = 'insufficient_data' | 'ready_for_comparison' | 'friction_candidate' | 'inconclusive'
export type CreateEntryDecision = 'continue_running' | 'investigate_tracking' | 'optimize_first_friction_point' | 'no_action_yet'

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

export type CreateEntryThresholdProgressItem = {
    metric: 'create_page_viewed' | 'create_prompt_input_focused' | 'create_prompt_started' | 'create_generation_started'
    label: string
    current: number
    required: number
    remaining: number
    met: boolean
    message: string
}

type CreateEntryThresholds = {
    minCreatePageViewed: number
    minPromptInputFocused: number
    minPromptStarted: number
    minGenerationStarted: number
    minActionableDropoffRatePct: number
}

type CreateEntryThresholdChecks = {
    minCreatePageViewed: boolean
    minPromptInputFocused: boolean
    minPromptStarted: boolean
    minGenerationStarted: boolean
    all: boolean
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
        promptStartRateFromCreateView: number
        generationStartRate: number
        generationStartRateFromCreateView: number
        generationStartRateFromPromptStart: number
        productSelectionRateFromGeneration: number
        templateSelectionRate: number
        earlyAbandonmentRate: number
    }
    dropoff: {
        stageRows: CreateEntryDropoffRow[]
        biggestEarlyDropoffStep: CreateEntryDropoffStep
    }
    firstFrictionPoint: CreateEntryDropoffStep
    firstActionableFrictionPoint: CreateEntryDropoffStep
    primaryMetric: 'prompt_start_rate_from_create_view'
    secondaryMetric: 'generation_start_rate_from_prompt_start'
    status: CreateEntryStatus
    decision: CreateEntryDecision
    reason: string
    nextAction: string
    thresholds: CreateEntryThresholds
    thresholdChecks: CreateEntryThresholdChecks
    readiness: {
        readyForOptimization: boolean
        readinessMessage: string
        progressItems: CreateEntryThresholdProgressItem[]
        blockers: string[]
    }
    entrypointBreakdown: CreateEntryBreakdownRow[]
    homepageVariantBreakdown: CreateEntryBreakdownRow[]
    promptLengthBreakdown: CreateEntryBreakdownRow[]
}

const CREATE_ENTRY_EVENT_SET = new Set<string>(Object.values(CREATE_ENTRY_EVENT_NAMES))
const DEFAULT_CREATE_ENTRY_THRESHOLDS: CreateEntryThresholds = {
    minCreatePageViewed: 120,
    minPromptInputFocused: 70,
    minPromptStarted: 45,
    minGenerationStarted: 25,
    minActionableDropoffRatePct: 10,
}

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

function buildProgressItem(params: {
    metric: CreateEntryThresholdProgressItem['metric']
    label: string
    metricName: string
    current: number
    required: number
}): CreateEntryThresholdProgressItem {
    const remaining = Math.max(0, params.required - params.current)
    const met = remaining === 0
    return {
        metric: params.metric,
        label: params.label,
        current: params.current,
        required: params.required,
        remaining,
        met,
        message: met
            ? `${params.label}: threshold met (${params.current}/${params.required})`
            : `Need ${remaining} more ${params.metricName} event${remaining === 1 ? '' : 's'}.`,
    }
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
        if (current.dropoffCount > largest.dropoffCount) {
            return current
        }
        if (current.dropoffCount === largest.dropoffCount && current.dropoffRate > largest.dropoffRate) {
            return current
        }
        return largest
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

    const promptStartRateFromCreateView = toRate(promptStarted, createPageViews)
    const generationStartRateFromPromptStart = toRate(generationStarted, promptStarted)
    const generationStartRateFromCreateView = toRate(generationStarted, createPageViews)

    const thresholdChecks: CreateEntryThresholdChecks = {
        minCreatePageViewed: createPageViews >= DEFAULT_CREATE_ENTRY_THRESHOLDS.minCreatePageViewed,
        minPromptInputFocused: promptInputFocused >= DEFAULT_CREATE_ENTRY_THRESHOLDS.minPromptInputFocused,
        minPromptStarted: promptStarted >= DEFAULT_CREATE_ENTRY_THRESHOLDS.minPromptStarted,
        minGenerationStarted: generationStarted >= DEFAULT_CREATE_ENTRY_THRESHOLDS.minGenerationStarted,
        all: false,
    }
    thresholdChecks.all = thresholdChecks.minCreatePageViewed
        && thresholdChecks.minPromptInputFocused
        && thresholdChecks.minPromptStarted
        && thresholdChecks.minGenerationStarted

    const progressItems: CreateEntryThresholdProgressItem[] = [
        buildProgressItem({
            metric: 'create_page_viewed',
            label: 'create_page_viewed',
            metricName: 'create_page_viewed',
            current: createPageViews,
            required: DEFAULT_CREATE_ENTRY_THRESHOLDS.minCreatePageViewed,
        }),
        buildProgressItem({
            metric: 'create_prompt_input_focused',
            label: 'create_prompt_input_focused',
            metricName: 'create_prompt_input_focused',
            current: promptInputFocused,
            required: DEFAULT_CREATE_ENTRY_THRESHOLDS.minPromptInputFocused,
        }),
        buildProgressItem({
            metric: 'create_prompt_started',
            label: 'create_prompt_started',
            metricName: 'create_prompt_started',
            current: promptStarted,
            required: DEFAULT_CREATE_ENTRY_THRESHOLDS.minPromptStarted,
        }),
        buildProgressItem({
            metric: 'create_generation_started',
            label: 'create_generation_started',
            metricName: 'create_generation_started',
            current: generationStarted,
            required: DEFAULT_CREATE_ENTRY_THRESHOLDS.minGenerationStarted,
        }),
    ]
    const blockers = progressItems.filter((item) => !item.met).map((item) => item.message)

    const hasTrackingIntegrityIssue = (
        (createPageViews >= DEFAULT_CREATE_ENTRY_THRESHOLDS.minCreatePageViewed && entrypointResolved === 0)
        || (promptStarted > 0 && createPageViews === 0)
        || (generationStarted > 0 && promptStarted === 0)
    )
    const hasActionableFriction = thresholdChecks.all
        && biggestEarlyDropoffStep !== 'none'
        && (biggestStage?.dropoffRate || 0) >= DEFAULT_CREATE_ENTRY_THRESHOLDS.minActionableDropoffRatePct

    let status: CreateEntryStatus
    let decision: CreateEntryDecision
    let reason: string
    let nextAction: string
    let firstActionableFrictionPoint: CreateEntryDropoffStep = 'none'
    let readinessMessage: string

    if (hasTrackingIntegrityIssue) {
        status = 'inconclusive'
        decision = 'investigate_tracking'
        reason = 'Create-entry event sequence is inconsistent and may be impacted by tracking gaps.'
        nextAction = 'Audit create entry event firing and payload integrity before making UX decisions.'
        readinessMessage = 'Create-entry data is inconclusive due to tracking integrity checks.'
    } else if (!thresholdChecks.all) {
        status = 'insufficient_data'
        decision = 'continue_running'
        reason = 'Create-entry sample thresholds are not met yet.'
        nextAction = 'Continue collecting create-entry events until thresholds are satisfied.'
        readinessMessage = 'Data too immature to optimize create-entry friction.'
    } else if (hasActionableFriction) {
        status = 'friction_candidate'
        decision = 'optimize_first_friction_point'
        reason = `Thresholds are met and ${biggestEarlyDropoffStep} has actionable drop-off (${(biggestStage?.dropoffRate || 0).toFixed(2)}%).`
        nextAction = `Run one focused /create UX iteration targeting ${biggestEarlyDropoffStep}.`
        firstActionableFrictionPoint = biggestEarlyDropoffStep
        readinessMessage = `Ready to optimize ${biggestEarlyDropoffStep}.`
    } else {
        status = 'ready_for_comparison'
        decision = 'no_action_yet'
        reason = 'Thresholds are met, but no early-stage drop-off is strong enough to justify a focused UX change.'
        nextAction = 'Keep collecting data and re-evaluate when a stronger friction point emerges.'
        readinessMessage = 'Thresholds met, but no clear first friction candidate yet.'
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
            promptStartedRate: promptStartRateFromCreateView,
            promptStartRateFromCreateView,
            generationStartRate: generationStartRateFromCreateView,
            generationStartRateFromCreateView,
            generationStartRateFromPromptStart,
            productSelectionRateFromGeneration: toRate(productSelected, generationStarted),
            templateSelectionRate: toRate(templateSelected, createPageViews),
            earlyAbandonmentRate: toRate(abandonedEarly, createPageViews),
        },
        dropoff: {
            stageRows,
            biggestEarlyDropoffStep,
        },
        firstFrictionPoint: biggestEarlyDropoffStep,
        firstActionableFrictionPoint,
        primaryMetric: 'prompt_start_rate_from_create_view',
        secondaryMetric: 'generation_start_rate_from_prompt_start',
        status,
        decision,
        reason,
        nextAction,
        thresholds: DEFAULT_CREATE_ENTRY_THRESHOLDS,
        thresholdChecks,
        readiness: {
            readyForOptimization: thresholdChecks.all && !hasTrackingIntegrityIssue,
            readinessMessage,
            progressItems,
            blockers,
        },
        entrypointBreakdown: toBreakdownRows(entrypointCounts),
        homepageVariantBreakdown: toBreakdownRows(variantCounts),
        promptLengthBreakdown: toBreakdownRows(promptLengthCounts),
    }
}

export async function buildCreateEntryFunnelReport(filePath?: string): Promise<CreateEntryFunnelReport> {
    const records = await readHomepageEventRecords(filePath)
    return aggregateCreateEntryFunnel(records)
}
