import { mkdir, readFile, appendFile } from 'node:fs/promises'
import path from 'node:path'
import { HOMEPAGE_EVENT_NAMES, type HomepageEventName } from '@/lib/analytics'

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown'

export type HomepageFunnelEventRecord = {
    eventName: HomepageEventName
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
    homepageToCreateCtr: number
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
}

const HOMEPAGE_EVENT_NAME_SET = new Set<HomepageEventName>(Object.values(HOMEPAGE_EVENT_NAMES))
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

function normalizeRecord(input: unknown): HomepageFunnelEventRecord | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return null
    }

    const payload = input as Record<string, unknown>
    const eventNameRaw = toNonEmptyString(payload.eventName)
    if (!eventNameRaw || !isHomepageEventName(eventNameRaw)) {
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
    const buckets = new Map<string, { viewed: number; toCreate: number }>()

    const getBucket = (pageVariant: string) => {
        const existing = buckets.get(pageVariant)
        if (existing) return existing
        const fresh = { viewed: 0, toCreate: 0 }
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
        }
    }

    return Array.from(buckets.entries())
        .map(([pageVariant, bucket]) => ({
            pageVariant,
            homepageViews: bucket.viewed,
            toCreateClicks: bucket.toCreate,
            homepageToCreateCtr: toRate(bucket.toCreate, bucket.viewed),
        }))
        .sort((a, b) => b.homepageViews - a.homepageViews)
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
        pageVariantBreakdown: aggregateByPageVariant(records),
    }
}

export async function buildHomepageFunnelReport(
    filePath?: string
): Promise<HomepageFunnelReport> {
    const records = await readHomepageEventRecords(filePath)
    return aggregateHomepageFunnel(records)
}
