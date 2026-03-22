import { mkdir, readFile, appendFile } from 'node:fs/promises'
import path from 'node:path'
import {
    CREATE_ENTRY_EVENT_NAMES,
    HOMEPAGE_EVENT_NAMES,
    PRODUCT_PROOF_EVENT_NAMES,
    type FunnelEventName,
    type HomepageEventName,
} from '@/lib/analytics'

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown'

export type HomepageFunnelEventRecord = {
    eventName: FunnelEventName
    params: Record<string, unknown>
    path: string
    pageVariant: string | null
    locale: string | null
    userAgent: string | null
    deviceType: DeviceType
    createdAt: string
}

type RateMetrics = {
    homepageToCreateCtr: number
    createStartRate: number
    clickToCreateStartRate: number
}

type CtaBreakdownRow = {
    ctaLocation: string
    clicks: number
    shareOfToCreateClicks: number
}

type DeviceBreakdownRow = {
    deviceType: DeviceType
    homepageViews: number
    toCreateClicks: number
    createStarts: number
    homepageToCreateCtr: number
    clickToCreateStartRate: number
}

type PageVariantBreakdownRow = {
    pageVariant: string
    homepageViews: number
    toCreateClicks: number
    createStarts: number
    homepageToCreateCtr: number
    createStartRate: number
    clickToCreateStartRate: number
    beforeCtaClickCount: number
    beforeCtaClickRate: number
    afterCtaClickCount: number
    afterCtaClickRate: number
    biggestDropoffStep: 'before_cta_click' | 'after_cta_click_before_create_start' | 'none'
}

export type HeroExperimentStatus = 'insufficient_data' | 'ready_for_comparison' | 'winner_candidate' | 'inconclusive'
export type HeroExperimentDecision = 'continue_running' | 'investigate_tracking' | 'ship_winner' | 'iterate_loser_dimension'
export type HeroExperimentVariantKey = 'variant_a' | 'variant_b'

type HeroExperimentVariantMetrics = {
    pageVariant: HeroExperimentVariantKey
    homepageViews: number
    toCreateClicks: number
    createStarts: number
    homepageToCreateCtr: number
    createStartRate: number
    clickToCreateStartRate: number
}

export type HeroExperimentThresholdProgressItem = {
    metric: 'total_homepage_views' | 'variant_homepage_views' | 'variant_to_create_clicks'
    variant: HeroExperimentVariantKey | null
    label: string
    current: number
    required: number
    remaining: number
    met: boolean
    message: string
}

type HeroExperimentThresholds = {
    minTotalHomepageViews: number
    minHomepageViewsPerVariant: number
    minToCreateClicksPerVariant: number
    minPrimaryMetricLiftPctPoints: number
    maxSecondaryMetricConflictPctPoints: number
}

type HeroExperimentThresholdChecks = {
    minTotalHomepageViews: boolean
    minHomepageViewsPerVariant: boolean
    minToCreateClicksPerVariant: boolean
    all: boolean
}

type HeroExperimentReadout = {
    primaryMetric: 'homepage_to_create_ctr'
    secondaryMetric: 'create_start_rate'
    status: HeroExperimentStatus
    decision: HeroExperimentDecision
    reason: string
    nextAction: string
    winnerCandidate: HeroExperimentVariantKey | null
    thresholds: HeroExperimentThresholds
    thresholdChecks: HeroExperimentThresholdChecks
    readiness: {
        readyForComparison: boolean
        readinessMessage: string
        progressItems: HeroExperimentThresholdProgressItem[]
        blockers: string[]
    }
    totals: {
        homepageViewsOverall: number
        homepageViewsExperimentEligible: number
        legacyOrUnknownVariantViews: number
        homepageToCreateClicksExperimentEligible: number
        createFlowStartsExperimentEligible: number
    }
    variants: HeroExperimentVariantMetrics[]
    comparison: {
        ctrDeltaPctPoints: number
        createStartRateDeltaPctPoints: number
        clickToCreateStartRateDeltaPctPoints: number
        leadingVariant: HeroExperimentVariantKey | null
        trailingVariant: HeroExperimentVariantKey | null
    }
}

export type HomepageFunnelReport = {
    source: 'event_log'
    generatedAt: string
    recordCount: number
    hasData: boolean
    totals: {
        homepageViews: number
        homepageToCreateClicks: number
        createFlowStarts: number
    }
    rates: RateMetrics
    dropoff: {
        beforeCtaClickCount: number
        beforeCtaClickRate: number
        afterCtaClickCount: number
        afterCtaClickRate: number
        biggestDropoffStep: 'before_cta_click' | 'after_cta_click_before_create_start' | 'none'
    }
    ctaBreakdown: CtaBreakdownRow[]
    underperformingPrimaryCtaLocation: string | null
    deviceBreakdown: DeviceBreakdownRow[]
    pageVariantBreakdown: PageVariantBreakdownRow[]
    heroExperiment: HeroExperimentReadout
}

const HOMEPAGE_EVENT_NAME_SET = new Set<HomepageEventName>(Object.values(HOMEPAGE_EVENT_NAMES))
const FUNNEL_EVENT_NAME_SET = new Set<FunnelEventName>([
    ...Object.values(HOMEPAGE_EVENT_NAMES),
    ...Object.values(PRODUCT_PROOF_EVENT_NAMES),
    ...Object.values(CREATE_ENTRY_EVENT_NAMES),
])
const HERO_EXPERIMENT_VARIANTS: HeroExperimentVariantKey[] = ['variant_a', 'variant_b']
const DEFAULT_HERO_EXPERIMENT_THRESHOLDS: HeroExperimentThresholds = {
    minTotalHomepageViews: 200,
    minHomepageViewsPerVariant: 75,
    minToCreateClicksPerVariant: 10,
    minPrimaryMetricLiftPctPoints: 5,
    maxSecondaryMetricConflictPctPoints: 2,
}
const PRIMARY_CTA_LOCATIONS = [
    'hero_primary_create',
    'navbar_primary_create',
    'how_it_works_primary_create',
    'mid_band_primary_create',
    'final_primary_create',
]

function toEventLogPath(inputPath?: string): string {
    const defaultPath = path.join(process.cwd(), 'data', 'analytics', 'homepage-events.jsonl')
    const raw = inputPath || process.env.HOMEPAGE_FUNNEL_EVENT_LOG_PATH || defaultPath
    return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw)
}

function toRate(numerator: number, denominator: number): number {
    if (denominator <= 0) return 0
    return Number(((numerator / denominator) * 100).toFixed(2))
}

function toNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
}

function normalizePath(value: unknown): string {
    const normalized = toNonEmptyString(value)
    if (!normalized) return '/'
    return normalized.length > 240 ? normalized.slice(0, 240) : normalized
}

function normalizeLocale(value: unknown): string | null {
    const normalized = toNonEmptyString(value)
    if (!normalized) return null
    const lower = normalized.toLowerCase()
    if (!/^[a-z-]{2,10}$/.test(lower)) return null
    return lower
}

function normalizePageVariant(value: unknown): string | null {
    const normalized = toNonEmptyString(value)
    if (!normalized) return null
    return normalized.slice(0, 80)
}

function normalizeParams(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {}
    }

    const entries = Object.entries(value as Record<string, unknown>).filter(([key, entryValue]) => {
        if (typeof key !== 'string' || key.length === 0 || key.length > 80) {
            return false
        }
        if (entryValue === undefined) {
            return false
        }
        if (
            typeof entryValue === 'string' ||
            typeof entryValue === 'number' ||
            typeof entryValue === 'boolean' ||
            entryValue === null
        ) {
            return true
        }
        return false
    })

    return Object.fromEntries(entries)
}

export function classifyDeviceType(userAgent: string | null | undefined): DeviceType {
    if (!userAgent || userAgent.trim().length === 0) {
        return 'unknown'
    }
    const value = userAgent.toLowerCase()

    if (value.includes('bot') || value.includes('crawler') || value.includes('spider') || value.includes('slurp')) {
        return 'bot'
    }
    if (value.includes('ipad') || value.includes('tablet')) {
        return 'tablet'
    }
    if (value.includes('mobile') || value.includes('iphone') || value.includes('android')) {
        return 'mobile'
    }
    return 'desktop'
}

export function isHomepageEventName(eventName: string): eventName is HomepageEventName {
    return HOMEPAGE_EVENT_NAME_SET.has(eventName as HomepageEventName)
}

export function isFunnelEventName(eventName: string): eventName is FunnelEventName {
    return FUNNEL_EVENT_NAME_SET.has(eventName as FunnelEventName)
}

function normalizeRecord(input: unknown): HomepageFunnelEventRecord | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return null
    }

    const payload = input as Record<string, unknown>
    const eventNameRaw = toNonEmptyString(payload.eventName)
    if (!eventNameRaw || !isFunnelEventName(eventNameRaw)) {
        return null
    }

    const createdAtRaw = toNonEmptyString(payload.createdAt)
    const createdAt = createdAtRaw && !Number.isNaN(Date.parse(createdAtRaw))
        ? new Date(createdAtRaw).toISOString()
        : new Date().toISOString()

    const userAgent = toNonEmptyString(payload.userAgent)
    const params = normalizeParams(payload.params)
    const pageVariant = normalizePageVariant(payload.pageVariant ?? params.page_variant)

    return {
        eventName: eventNameRaw,
        params,
        path: normalizePath(payload.path),
        pageVariant,
        locale: normalizeLocale(payload.locale),
        userAgent,
        deviceType: classifyDeviceType(userAgent),
        createdAt,
    }
}

export async function appendHomepageEventRecord(
    payload: Omit<HomepageFunnelEventRecord, 'deviceType' | 'createdAt'> & { createdAt?: string }
): Promise<HomepageFunnelEventRecord> {
    const normalized = normalizeRecord({
        ...payload,
        createdAt: payload.createdAt || new Date().toISOString(),
    })

    if (!normalized) {
        throw new Error('Invalid homepage analytics event payload')
    }

    const logPath = toEventLogPath()
    await mkdir(path.dirname(logPath), { recursive: true })
    await appendFile(logPath, `${JSON.stringify(normalized)}\n`, 'utf8')
    return normalized
}

export async function readHomepageEventRecords(filePath?: string): Promise<HomepageFunnelEventRecord[]> {
    const logPath = toEventLogPath(filePath)
    try {
        const raw = await readFile(logPath, 'utf8')
        return raw
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .map((line) => {
                try {
                    return normalizeRecord(JSON.parse(line) as unknown)
                } catch {
                    return null
                }
            })
            .filter((record): record is HomepageFunnelEventRecord => !!record)
    } catch {
        return []
    }
}

function aggregateByDevice(records: HomepageFunnelEventRecord[]): DeviceBreakdownRow[] {
    const buckets = new Map<DeviceType, { viewed: number; toCreate: number; createStarted: number }>()

    const getBucket = (deviceType: DeviceType) => {
        const existing = buckets.get(deviceType)
        if (existing) return existing
        const fresh = { viewed: 0, toCreate: 0, createStarted: 0 }
        buckets.set(deviceType, fresh)
        return fresh
    }

    for (const record of records) {
        const bucket = getBucket(record.deviceType)
        if (record.eventName === HOMEPAGE_EVENT_NAMES.viewed) {
            bucket.viewed += 1
        } else if (record.eventName === HOMEPAGE_EVENT_NAMES.toCreateClicked) {
            bucket.toCreate += 1
        } else if (record.eventName === HOMEPAGE_EVENT_NAMES.createFlowStarted) {
            bucket.createStarted += 1
        }
    }

    return Array.from(buckets.entries())
        .map(([deviceType, bucket]) => ({
            deviceType,
            homepageViews: bucket.viewed,
            toCreateClicks: bucket.toCreate,
            createStarts: bucket.createStarted,
            homepageToCreateCtr: toRate(bucket.toCreate, bucket.viewed),
            clickToCreateStartRate: toRate(bucket.createStarted, bucket.toCreate),
        }))
        .sort((a, b) => b.homepageViews - a.homepageViews)
}

function aggregateByPageVariant(records: HomepageFunnelEventRecord[]): PageVariantBreakdownRow[] {
    const buckets = new Map<string, { viewed: number; toCreate: number; createStarted: number }>()

    const getBucket = (pageVariant: string) => {
        const existing = buckets.get(pageVariant)
        if (existing) return existing
        const fresh = { viewed: 0, toCreate: 0, createStarted: 0 }
        buckets.set(pageVariant, fresh)
        return fresh
    }

    for (const record of records) {
        const variant = record.pageVariant || 'unknown'
        const bucket = getBucket(variant)
        if (record.eventName === HOMEPAGE_EVENT_NAMES.viewed) {
            bucket.viewed += 1
        } else if (record.eventName === HOMEPAGE_EVENT_NAMES.toCreateClicked) {
            bucket.toCreate += 1
        } else if (record.eventName === HOMEPAGE_EVENT_NAMES.createFlowStarted) {
            bucket.createStarted += 1
        }
    }

    return Array.from(buckets.entries())
        .map(([pageVariant, bucket]) => {
            const beforeCtaClickCount = Math.max(0, bucket.viewed - bucket.toCreate)
            const afterCtaClickCount = Math.max(0, bucket.toCreate - bucket.createStarted)

            let biggestDropoffStep: PageVariantBreakdownRow['biggestDropoffStep'] = 'none'
            if (beforeCtaClickCount > 0 || afterCtaClickCount > 0) {
                biggestDropoffStep = beforeCtaClickCount >= afterCtaClickCount
                    ? 'before_cta_click'
                    : 'after_cta_click_before_create_start'
            }

            return {
                pageVariant,
                homepageViews: bucket.viewed,
                toCreateClicks: bucket.toCreate,
                createStarts: bucket.createStarted,
                homepageToCreateCtr: toRate(bucket.toCreate, bucket.viewed),
                createStartRate: toRate(bucket.createStarted, bucket.viewed),
                clickToCreateStartRate: toRate(bucket.createStarted, bucket.toCreate),
                beforeCtaClickCount,
                beforeCtaClickRate: toRate(beforeCtaClickCount, bucket.viewed),
                afterCtaClickCount,
                afterCtaClickRate: toRate(afterCtaClickCount, bucket.toCreate),
                biggestDropoffStep,
            }
        })
        .sort((a, b) => b.homepageViews - a.homepageViews)
}

function getExperimentVariantMetrics(
    pageVariantBreakdown: PageVariantBreakdownRow[],
    variant: HeroExperimentVariantKey
): HeroExperimentVariantMetrics {
    const row = pageVariantBreakdown.find((entry) => entry.pageVariant === variant)
    if (row) {
        return {
            pageVariant: variant,
            homepageViews: row.homepageViews,
            toCreateClicks: row.toCreateClicks,
            createStarts: row.createStarts,
            homepageToCreateCtr: row.homepageToCreateCtr,
            createStartRate: row.createStartRate,
            clickToCreateStartRate: row.clickToCreateStartRate,
        }
    }

    return {
        pageVariant: variant,
        homepageViews: 0,
        toCreateClicks: 0,
        createStarts: 0,
        homepageToCreateCtr: 0,
        createStartRate: 0,
        clickToCreateStartRate: 0,
    }
}

function buildProgressItem(params: {
    metric: HeroExperimentThresholdProgressItem['metric']
    variant?: HeroExperimentVariantKey
    label: string
    metricNameSingular: string
    contextLabel: string
    current: number
    required: number
}): HeroExperimentThresholdProgressItem {
    const remaining = Math.max(0, params.required - params.current)
    const met = remaining === 0

    return {
        metric: params.metric,
        variant: params.variant || null,
        label: params.label,
        current: params.current,
        required: params.required,
        remaining,
        met,
        message: met
            ? `${params.label}: threshold met (${params.current}/${params.required})`
            : `Need ${remaining} more ${params.metricNameSingular}${remaining === 1 ? '' : 's'} in ${params.contextLabel}.`,
    }
}

function buildHeroExperimentReadout(params: {
    pageVariantBreakdown: PageVariantBreakdownRow[]
    homepageViewsOverall: number
}): HeroExperimentReadout {
    const variants = HERO_EXPERIMENT_VARIANTS.map((variant) =>
        getExperimentVariantMetrics(params.pageVariantBreakdown, variant)
    )
    const [variantA, variantB] = variants

    const homepageViewsExperimentEligible = variantA.homepageViews + variantB.homepageViews
    const legacyOrUnknownVariantViews = Math.max(0, params.homepageViewsOverall - homepageViewsExperimentEligible)
    const homepageToCreateClicksExperimentEligible = variantA.toCreateClicks + variantB.toCreateClicks
    const createFlowStartsExperimentEligible = variantA.createStarts + variantB.createStarts

    const thresholdChecks: HeroExperimentThresholdChecks = {
        minTotalHomepageViews:
            homepageViewsExperimentEligible >= DEFAULT_HERO_EXPERIMENT_THRESHOLDS.minTotalHomepageViews,
        minHomepageViewsPerVariant:
            variantA.homepageViews >= DEFAULT_HERO_EXPERIMENT_THRESHOLDS.minHomepageViewsPerVariant
            && variantB.homepageViews >= DEFAULT_HERO_EXPERIMENT_THRESHOLDS.minHomepageViewsPerVariant,
        minToCreateClicksPerVariant:
            variantA.toCreateClicks >= DEFAULT_HERO_EXPERIMENT_THRESHOLDS.minToCreateClicksPerVariant
            && variantB.toCreateClicks >= DEFAULT_HERO_EXPERIMENT_THRESHOLDS.minToCreateClicksPerVariant,
        all: false,
    }
    thresholdChecks.all = thresholdChecks.minTotalHomepageViews
        && thresholdChecks.minHomepageViewsPerVariant
        && thresholdChecks.minToCreateClicksPerVariant

    const progressItems: HeroExperimentThresholdProgressItem[] = [
        buildProgressItem({
            metric: 'total_homepage_views',
            label: 'Total homepage views (experiment variants)',
            metricNameSingular: 'homepage view',
            contextLabel: 'experiment',
            current: homepageViewsExperimentEligible,
            required: DEFAULT_HERO_EXPERIMENT_THRESHOLDS.minTotalHomepageViews,
        }),
        ...variants.map((variant) =>
            buildProgressItem({
                metric: 'variant_homepage_views',
                variant: variant.pageVariant,
                label: `${variant.pageVariant} views`,
                metricNameSingular: 'view',
                contextLabel: variant.pageVariant,
                current: variant.homepageViews,
                required: DEFAULT_HERO_EXPERIMENT_THRESHOLDS.minHomepageViewsPerVariant,
            })
        ),
        ...variants.map((variant) =>
            buildProgressItem({
                metric: 'variant_to_create_clicks',
                variant: variant.pageVariant,
                label: `${variant.pageVariant} to-create clicks`,
                metricNameSingular: 'to-create click',
                contextLabel: variant.pageVariant,
                current: variant.toCreateClicks,
                required: DEFAULT_HERO_EXPERIMENT_THRESHOLDS.minToCreateClicksPerVariant,
            })
        ),
    ]
    const blockers = progressItems.filter((item) => !item.met).map((item) => item.message)
    const readinessMessage = thresholdChecks.all
        ? 'Hero experiment ready for comparison.'
        : 'Hero experiment still too immature to compare.'

    const ctrDeltaPctPoints = Number((variantA.homepageToCreateCtr - variantB.homepageToCreateCtr).toFixed(2))
    const createStartRateDeltaPctPoints = Number((variantA.createStartRate - variantB.createStartRate).toFixed(2))
    const clickToCreateStartRateDeltaPctPoints = Number((variantA.clickToCreateStartRate - variantB.clickToCreateStartRate).toFixed(2))

    const leadingVariant: HeroExperimentVariantKey | null = ctrDeltaPctPoints === 0
        ? null
        : (ctrDeltaPctPoints > 0 ? 'variant_a' : 'variant_b')
    const trailingVariant: HeroExperimentVariantKey | null = leadingVariant === 'variant_a'
        ? 'variant_b'
        : (leadingVariant === 'variant_b' ? 'variant_a' : null)

    const oneVariantMissingAtScale = thresholdChecks.minTotalHomepageViews
        && (variantA.homepageViews === 0 || variantB.homepageViews === 0)

    let status: HeroExperimentStatus
    let decision: HeroExperimentDecision
    let reason: string
    let nextAction: string
    let winnerCandidate: HeroExperimentVariantKey | null = null

    if (oneVariantMissingAtScale) {
        status = 'inconclusive'
        decision = 'investigate_tracking'
        reason = 'One hero variant is missing exposure at comparison scale; assignment or event propagation should be checked.'
        nextAction = 'Audit middleware cookie assignment and homepage_viewed page_variant logging before interpreting performance.'
    } else if (!thresholdChecks.all) {
        status = 'insufficient_data'
        decision = 'continue_running'
        reason = 'Sample thresholds are not met yet for a stable hero comparison.'
        nextAction = 'Keep traffic collection running until minimum total and per-variant thresholds are satisfied.'
    } else {
        const ctrGap = Math.abs(ctrDeltaPctPoints)
        const clearPrimaryWinner = !!leadingVariant
            && ctrGap >= DEFAULT_HERO_EXPERIMENT_THRESHOLDS.minPrimaryMetricLiftPctPoints

        if (!clearPrimaryWinner) {
            status = 'ready_for_comparison'
            decision = 'continue_running'
            reason = 'Thresholds are met, but primary metric lift is below winner criteria.'
            nextAction = 'Keep the test running until a clearer CTR separation appears.'
        } else {
            const secondarySupportsLeader = leadingVariant === 'variant_a'
                ? variantA.createStartRate + DEFAULT_HERO_EXPERIMENT_THRESHOLDS.maxSecondaryMetricConflictPctPoints >= variantB.createStartRate
                : variantB.createStartRate + DEFAULT_HERO_EXPERIMENT_THRESHOLDS.maxSecondaryMetricConflictPctPoints >= variantA.createStartRate

            if (secondarySupportsLeader) {
                status = 'winner_candidate'
                decision = 'ship_winner'
                winnerCandidate = leadingVariant
                reason = `Primary metric lift is ${ctrGap.toFixed(2)}pp and secondary metric does not conflict with the leading variant.`
                nextAction = `Prepare to promote ${leadingVariant} as control after one final sanity check on tracking integrity.`
            } else {
                status = 'inconclusive'
                decision = 'iterate_loser_dimension'
                reason = 'Primary metric favors one variant, but secondary create-start rate conflicts beyond tolerance.'
                nextAction = 'Keep current variants live and plan one focused iteration on a single hero dimension after additional data.'
            }
        }
    }

    return {
        primaryMetric: 'homepage_to_create_ctr',
        secondaryMetric: 'create_start_rate',
        status,
        decision,
        reason,
        nextAction,
        winnerCandidate,
        thresholds: DEFAULT_HERO_EXPERIMENT_THRESHOLDS,
        thresholdChecks,
        readiness: {
            readyForComparison: thresholdChecks.all,
            readinessMessage,
            progressItems,
            blockers,
        },
        totals: {
            homepageViewsOverall: params.homepageViewsOverall,
            homepageViewsExperimentEligible,
            legacyOrUnknownVariantViews,
            homepageToCreateClicksExperimentEligible,
            createFlowStartsExperimentEligible,
        },
        variants,
        comparison: {
            ctrDeltaPctPoints,
            createStartRateDeltaPctPoints,
            clickToCreateStartRateDeltaPctPoints,
            leadingVariant,
            trailingVariant,
        },
    }
}

function aggregateCtaBreakdown(records: HomepageFunnelEventRecord[]): CtaBreakdownRow[] {
    const counts = new Map<string, number>()
    let totalToCreateClicks = 0

    for (const record of records) {
        if (record.eventName !== HOMEPAGE_EVENT_NAMES.toCreateClicked) {
            continue
        }
        const ctaLocation = toNonEmptyString(record.params.cta_location) || 'unknown'
        counts.set(ctaLocation, (counts.get(ctaLocation) || 0) + 1)
        totalToCreateClicks += 1
    }

    return Array.from(counts.entries())
        .map(([ctaLocation, clicks]) => ({
            ctaLocation,
            clicks,
            shareOfToCreateClicks: toRate(clicks, totalToCreateClicks),
        }))
        .sort((a, b) => b.clicks - a.clicks)
}

function identifyUnderperformingPrimaryCta(ctaBreakdown: CtaBreakdownRow[]): string | null {
    const byLocation = new Map(ctaBreakdown.map((row) => [row.ctaLocation, row.clicks]))
    const scored = PRIMARY_CTA_LOCATIONS.map((location) => ({
        location,
        clicks: byLocation.get(location) || 0,
    }))

    const underperforming = scored.reduce((lowest, current) => {
        if (!lowest) return current
        return current.clicks < lowest.clicks ? current : lowest
    }, null as { location: string; clicks: number } | null)

    if (!underperforming || underperforming.clicks <= 0) {
        return null
    }
    return underperforming.location
}

export function aggregateHomepageFunnel(
    records: HomepageFunnelEventRecord[]
): HomepageFunnelReport {
    const homepageViews = records.filter((record) => record.eventName === HOMEPAGE_EVENT_NAMES.viewed).length
    const homepageToCreateClicks = records.filter((record) => record.eventName === HOMEPAGE_EVENT_NAMES.toCreateClicked).length
    const createFlowStarts = records.filter((record) => record.eventName === HOMEPAGE_EVENT_NAMES.createFlowStarted).length

    const beforeCtaClickCount = Math.max(0, homepageViews - homepageToCreateClicks)
    const afterCtaClickCount = Math.max(0, homepageToCreateClicks - createFlowStarts)

    const beforeCtaClickRate = toRate(beforeCtaClickCount, homepageViews)
    const afterCtaClickRate = toRate(afterCtaClickCount, homepageToCreateClicks)

    let biggestDropoffStep: HomepageFunnelReport['dropoff']['biggestDropoffStep'] = 'none'
    if (beforeCtaClickCount > 0 || afterCtaClickCount > 0) {
        biggestDropoffStep = beforeCtaClickCount >= afterCtaClickCount
            ? 'before_cta_click'
            : 'after_cta_click_before_create_start'
    }

    const ctaBreakdown = aggregateCtaBreakdown(records)
    const pageVariantBreakdown = aggregateByPageVariant(records)
    const heroExperiment = buildHeroExperimentReadout({
        pageVariantBreakdown,
        homepageViewsOverall: homepageViews,
    })

    return {
        source: 'event_log',
        generatedAt: new Date().toISOString(),
        recordCount: records.length,
        hasData: records.length > 0,
        totals: {
            homepageViews,
            homepageToCreateClicks,
            createFlowStarts,
        },
        rates: {
            homepageToCreateCtr: toRate(homepageToCreateClicks, homepageViews),
            createStartRate: toRate(createFlowStarts, homepageViews),
            clickToCreateStartRate: toRate(createFlowStarts, homepageToCreateClicks),
        },
        dropoff: {
            beforeCtaClickCount,
            beforeCtaClickRate,
            afterCtaClickCount,
            afterCtaClickRate,
            biggestDropoffStep,
        },
        ctaBreakdown,
        underperformingPrimaryCtaLocation: identifyUnderperformingPrimaryCta(ctaBreakdown),
        deviceBreakdown: aggregateByDevice(records),
        pageVariantBreakdown,
        heroExperiment,
    }
}

export async function buildHomepageFunnelReport(
    filePath?: string
): Promise<HomepageFunnelReport> {
    const records = await readHomepageEventRecords(filePath)
    return aggregateHomepageFunnel(records)
}
