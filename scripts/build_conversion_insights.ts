import { execSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

type InsightStatus = 'ok' | 'unavailable'
type ConnectivityStatus = 'connected_live' | 'degraded_no_db' | 'stale_cached'
type DegradedPolicy = 'warn' | 'fail'

type DesignSignal = {
    sessionId: string | null
}

type OrderSignal = {
    status: string
    sessionId: string | null
}

type ConversionDataset = {
    current: {
        designs: DesignSignal[]
        orders: OrderSignal[]
    }
    previous: {
        designs: DesignSignal[]
        orders: OrderSignal[]
    }
}

type SourceRow = {
    source: string
    generatedCount: number
    purchaseCount: number
    dropoffCount: number
    dropoffRate: number
    conversionRate: number
}

type FunnelRow = {
    key: string
    label: string
    count: number
    dropoffFromPrevious: number
    dropoffRateFromPrevious: number
}

type Anomaly = {
    id: string
    severity: 'warning' | 'critical'
    message: string
    reasonHint: string
}

type AttributionCoverage = {
    recordCount: number
    attributedCount: number
    legacyCount: number
    unattributedCount: number
    unattributedRate: number
}

type ConversionInsightSummary = {
    generatedAt: string
    commitSha: string
    status: InsightStatus
    mode: ConnectivityStatus
    reasonCode: string
    connectivity: {
        status: ConnectivityStatus
        policy: DegradedPolicy
        reasonCode: string
        message: string
    }
    freshness: {
        ttlSeconds: number
        sourceGeneratedAt: string | null
        ageSeconds: number | null
        stale: boolean
        cacheFile: string
    }
    window: {
        days: number
        currentStart: string
        currentEnd: string
        previousStart: string
        previousEnd: string
    }
    totals: {
        generatedCount: number
        purchaseCount: number
        conversionRate: number
        previousGeneratedCount: number
        previousPurchaseCount: number
        previousConversionRate: number
    }
    attributionCoverage: AttributionCoverage
    sourceBreakdown: SourceRow[]
    pageDropoff: FunnelRow[]
    formStepDropoff: FunnelRow[]
    anomalies: Anomaly[]
}

type CachedSummaryReadResult = {
    status: 'hit' | 'miss' | 'invalid'
    summary: ConversionInsightSummary | null
}

type SessionAttribution = {
    source: string
    bucket: 'attributed' | 'legacy' | 'unattributed'
}

const PURCHASE_STATUSES = new Set(['paid', 'processing', 'shipped'])
const SESSION_PREFIX = 'spai1|'

function toAbsolutePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
        return filePath
    }
    return path.join(process.cwd(), filePath)
}

function toRelativePath(filePath: string): string {
    return path.relative(process.cwd(), filePath).split(path.sep).join('/')
}

function formatTimestampForPath(date: Date): string {
    return date
        .toISOString()
        .replace('T', '_')
        .replaceAll(':', '-')
        .replace(/\..+/, '')
}

function readWindowDays(): number {
    const rawValue = process.env.CONVERSION_INSIGHTS_WINDOW_DAYS
    if (!rawValue) {
        return 7
    }

    const parsed = Number(rawValue)
    if (!Number.isFinite(parsed)) {
        return 7
    }

    const clamped = Math.max(1, Math.min(31, Math.round(parsed)))
    return clamped
}

function readDegradedPolicy(): DegradedPolicy {
    const rawValue = process.env.CONVERSION_INSIGHTS_DEGRADED_POLICY?.trim().toLowerCase()
    if (rawValue === 'fail') {
        return 'fail'
    }
    return 'warn'
}

function readCacheTtlSeconds(): number {
    const rawValue = process.env.CONVERSION_INSIGHTS_CACHE_TTL_SECONDS?.trim()
    if (!rawValue) {
        return 6 * 60 * 60
    }

    const parsed = Number(rawValue)
    if (!Number.isFinite(parsed)) {
        return 6 * 60 * 60
    }

    return Math.max(60, Math.min(7 * 24 * 60 * 60, Math.round(parsed)))
}

function readCacheFilePath(): string {
    return toAbsolutePath(
        process.env.CONVERSION_INSIGHTS_CACHE_FILE || 'docs/reports/artifacts/wave7-conversion-pulse-cache/latest.json',
    )
}

function readCommitSha(): string {
    const explicit = process.env.CONVERSION_INSIGHTS_COMMIT_SHA?.trim()
    if (explicit) {
        return explicit
    }

    try {
        return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim() || 'unknown'
    } catch {
        return 'unknown'
    }
}

function formatRate(numerator: number, denominator: number): number {
    if (denominator <= 0) {
        return 0
    }
    return Number((numerator / denominator).toFixed(4))
}

function sanitizeSource(value: string | undefined): string | null {
    if (!value) {
        return null
    }

    const normalized = value.trim().toLowerCase()
    if (!normalized || normalized.length > 80) {
        return null
    }

    if (!/^[a-z0-9_-]+$/.test(normalized)) {
        return null
    }

    return normalized
}

function parseSessionAttribution(sessionId: string | null | undefined): SessionAttribution {
    if (!sessionId || sessionId.trim().length === 0) {
        return { source: 'unattributed', bucket: 'unattributed' }
    }

    const normalized = sessionId.trim()
    if (!normalized.startsWith(SESSION_PREFIX)) {
        return { source: 'legacy_session', bucket: 'legacy' }
    }

    const segments = normalized.split('|')
    let parsedSource: string | null = null
    for (const segment of segments) {
        const [key, value] = segment.split('=', 2)
        if (key === 'src') {
            parsedSource = sanitizeSource(value)
            break
        }
    }

    if (!parsedSource) {
        return { source: 'unknown_source', bucket: 'attributed' }
    }

    return {
        source: parsedSource,
        bucket: 'attributed',
    }
}

function normalizeDataset(input: unknown): ConversionDataset {
    if (typeof input !== 'object' || input === null) {
        throw new Error('Conversion insights fixture must be an object')
    }

    const root = input as Record<string, unknown>
    const normalizePeriod = (periodName: 'current' | 'previous') => {
        const periodRaw = root[periodName]
        if (typeof periodRaw !== 'object' || periodRaw === null) {
            throw new Error(`Conversion insights fixture is missing '${periodName}'`)
        }

        const period = periodRaw as Record<string, unknown>
        const designsRaw = period.designs
        const ordersRaw = period.orders
        if (!Array.isArray(designsRaw) || !Array.isArray(ordersRaw)) {
            throw new Error(`Conversion insights fixture '${periodName}' must include arrays: designs, orders`)
        }

        const designs: DesignSignal[] = designsRaw.map((entry) => {
            if (typeof entry !== 'object' || entry === null) {
                return { sessionId: null }
            }
            const maybeSessionId = (entry as Record<string, unknown>).sessionId
            if (typeof maybeSessionId !== 'string') {
                return { sessionId: null }
            }
            return { sessionId: maybeSessionId }
        })

        const orders: OrderSignal[] = ordersRaw.map((entry) => {
            if (typeof entry !== 'object' || entry === null) {
                return { status: 'unknown', sessionId: null }
            }

            const record = entry as Record<string, unknown>
            const status = typeof record.status === 'string' && record.status.trim().length > 0 ? record.status : 'unknown'
            const sessionId = typeof record.sessionId === 'string' ? record.sessionId : null
            return { status, sessionId }
        })

        return { designs, orders }
    }

    return {
        current: normalizePeriod('current'),
        previous: normalizePeriod('previous'),
    }
}

async function readFixtureDataset(filePath: string): Promise<ConversionDataset> {
    const raw = await readFile(toAbsolutePath(filePath), 'utf8')
    const parsed = JSON.parse(raw) as unknown
    return normalizeDataset(parsed)
}

async function readCachedSummary(filePath: string): Promise<CachedSummaryReadResult> {
    try {
        const raw = await readFile(toAbsolutePath(filePath), 'utf8')
        const parsed = JSON.parse(raw) as Partial<ConversionInsightSummary>

        if (
            typeof parsed !== 'object' ||
            parsed === null ||
            typeof parsed.generatedAt !== 'string' ||
            typeof parsed.status !== 'string' ||
            !parsed.totals ||
            !Array.isArray(parsed.pageDropoff) ||
            !Array.isArray(parsed.formStepDropoff) ||
            !Array.isArray(parsed.sourceBreakdown) ||
            !Array.isArray(parsed.anomalies)
        ) {
            return { status: 'invalid', summary: null }
        }

        return { status: 'hit', summary: parsed as ConversionInsightSummary }
    } catch (error) {
        if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            (error as { code?: string }).code === 'ENOENT'
        ) {
            return { status: 'miss', summary: null }
        }
        return { status: 'invalid', summary: null }
    }
}

function computeAgeSeconds(sourceGeneratedAt: string | null, now: Date): number | null {
    if (!sourceGeneratedAt) {
        return null
    }

    const parsed = Date.parse(sourceGeneratedAt)
    if (!Number.isFinite(parsed)) {
        return null
    }

    return Math.max(0, Math.round((now.getTime() - parsed) / 1000))
}

async function openLivePrismaClient(): Promise<
    | {
          ok: true
          prisma: PrismaClient
      }
    | {
          ok: false
          reasonCode: string
          message: string
      }
> {
    const databaseUrl = process.env.DATABASE_URL?.trim()
    if (!databaseUrl) {
        return {
            ok: false,
            reasonCode: 'missing_database_url',
            message: 'DATABASE_URL is missing in runtime environment.',
        }
    }

    const prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString: databaseUrl }),
        log: ['error'],
    })

    try {
        await prisma.$queryRawUnsafe('SELECT 1')
        return { ok: true, prisma }
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        await prisma.$disconnect()
        return {
            ok: false,
            reasonCode: 'database_connectivity_failed',
            message: `Unable to connect to runtime database: ${reason}`,
        }
    }
}

async function readDatabaseDataset(prisma: PrismaClient, now: Date, windowDays: number): Promise<ConversionDataset> {
    const windowMs = windowDays * 24 * 60 * 60 * 1000
    const currentEnd = now
    const currentStart = new Date(currentEnd.getTime() - windowMs)
    const previousEnd = currentStart
    const previousStart = new Date(previousEnd.getTime() - windowMs)

    const [currentDesigns, previousDesigns, currentOrders, previousOrders] = await Promise.all([
        prisma.design.findMany({
            where: { createdAt: { gte: currentStart, lt: currentEnd } },
            select: { sessionId: true },
        }),
        prisma.design.findMany({
            where: { createdAt: { gte: previousStart, lt: previousEnd } },
            select: { sessionId: true },
        }),
        prisma.order.findMany({
            where: { createdAt: { gte: currentStart, lt: currentEnd } },
            select: { status: true, sessionId: true },
        }),
        prisma.order.findMany({
            where: { createdAt: { gte: previousStart, lt: previousEnd } },
            select: { status: true, sessionId: true },
        }),
    ])

    return {
        current: {
            designs: currentDesigns.map((entry) => ({ sessionId: entry.sessionId || null })),
            orders: currentOrders.map((entry) => ({ status: entry.status, sessionId: entry.sessionId || null })),
        },
        previous: {
            designs: previousDesigns.map((entry) => ({ sessionId: entry.sessionId || null })),
            orders: previousOrders.map((entry) => ({ status: entry.status, sessionId: entry.sessionId || null })),
        },
    }
}

function buildSourceBreakdown(designs: DesignSignal[], orders: OrderSignal[]): SourceRow[] {
    const map = new Map<string, { generatedCount: number; purchaseCount: number }>()

    const incrementGenerated = (source: string) => {
        const existing = map.get(source)
        if (existing) {
            existing.generatedCount += 1
            return
        }
        map.set(source, { generatedCount: 1, purchaseCount: 0 })
    }

    const incrementPurchases = (source: string) => {
        const existing = map.get(source)
        if (existing) {
            existing.purchaseCount += 1
            return
        }
        map.set(source, { generatedCount: 0, purchaseCount: 1 })
    }

    for (const design of designs) {
        const attribution = parseSessionAttribution(design.sessionId)
        incrementGenerated(attribution.source)
    }

    for (const order of orders) {
        if (!PURCHASE_STATUSES.has(order.status.trim().toLowerCase())) {
            continue
        }
        const attribution = parseSessionAttribution(order.sessionId)
        incrementPurchases(attribution.source)
    }

    return Array.from(map.entries())
        .map(([source, counts]) => {
            const dropoffCount = Math.max(counts.generatedCount - counts.purchaseCount, 0)
            return {
                source,
                generatedCount: counts.generatedCount,
                purchaseCount: counts.purchaseCount,
                dropoffCount,
                dropoffRate: formatRate(dropoffCount, counts.generatedCount),
                conversionRate: formatRate(counts.purchaseCount, counts.generatedCount),
            }
        })
        .sort((a, b) => {
            if (b.generatedCount !== a.generatedCount) {
                return b.generatedCount - a.generatedCount
            }
            if (b.purchaseCount !== a.purchaseCount) {
                return b.purchaseCount - a.purchaseCount
            }
            return a.source.localeCompare(b.source)
        })
}

function buildAttributionCoverage(designs: DesignSignal[], orders: OrderSignal[]): AttributionCoverage {
    const purchasedOrders = orders.filter((order) => PURCHASE_STATUSES.has(order.status.trim().toLowerCase()))
    const records = [
        ...designs.map((design) => parseSessionAttribution(design.sessionId).bucket),
        ...purchasedOrders.map((order) => parseSessionAttribution(order.sessionId).bucket),
    ]

    const attributedCount = records.filter((bucket) => bucket === 'attributed').length
    const legacyCount = records.filter((bucket) => bucket === 'legacy').length
    const unattributedCount = records.filter((bucket) => bucket === 'unattributed').length

    return {
        recordCount: records.length,
        attributedCount,
        legacyCount,
        unattributedCount,
        unattributedRate: formatRate(unattributedCount, records.length),
    }
}

function buildFunnelRows(generatedCount: number, purchaseCount: number): { pageDropoff: FunnelRow[]; formStepDropoff: FunnelRow[] } {
    const createDropoff = 0
    const checkoutDropoff = Math.max(generatedCount - purchaseCount, 0)

    const pageDropoff: FunnelRow[] = [
        {
            key: 'create',
            label: '/create',
            count: generatedCount,
            dropoffFromPrevious: createDropoff,
            dropoffRateFromPrevious: 0,
        },
        {
            key: 'checkout',
            label: '/checkout',
            count: purchaseCount,
            dropoffFromPrevious: checkoutDropoff,
            dropoffRateFromPrevious: formatRate(checkoutDropoff, generatedCount),
        },
    ]

    const formStepDropoff: FunnelRow[] = [
        {
            key: 'generate_success',
            label: 'generate_success',
            count: generatedCount,
            dropoffFromPrevious: 0,
            dropoffRateFromPrevious: 0,
        },
        {
            key: 'purchase_completed',
            label: 'purchase_completed',
            count: purchaseCount,
            dropoffFromPrevious: checkoutDropoff,
            dropoffRateFromPrevious: formatRate(checkoutDropoff, generatedCount),
        },
    ]

    return { pageDropoff, formStepDropoff }
}

function buildAnomalies(params: {
    status: InsightStatus
    unavailableReasonCode: string
    currentGeneratedCount: number
    currentPurchaseCount: number
    currentConversionRate: number
    previousGeneratedCount: number
    previousPurchaseCount: number
    previousConversionRate: number
    coverage: AttributionCoverage
    sourceBreakdown: SourceRow[]
}): Anomaly[] {
    const anomalies: Anomaly[] = []

    if (params.status === 'unavailable') {
        anomalies.push({
            id: params.unavailableReasonCode || 'database_unavailable',
            severity: 'warning',
            message: 'Conversion insights are running in unavailable mode (no database input).',
            reasonHint: 'Set DATABASE_URL in the checkpoint runtime or pass CONVERSION_INSIGHTS_INPUT_FILE for fixture-mode validation.',
        })
        return anomalies
    }

    if (
        params.previousGeneratedCount >= 20 &&
        params.previousPurchaseCount >= 8 &&
        params.currentGeneratedCount >= 20 &&
        params.currentConversionRate + 0.001 < params.previousConversionRate - 0.12
    ) {
        anomalies.push({
            id: 'conversion_rate_drop',
            severity: 'critical',
            message: `Weekly conversion rate dropped from ${params.previousConversionRate} to ${params.currentConversionRate}.`,
            reasonHint: 'Review `/create` -> checkout friction, payment failures, and product-page trust rendering changes in the same period.',
        })
    }

    if (
        params.previousPurchaseCount >= 10 &&
        params.currentPurchaseCount <= Math.floor(params.previousPurchaseCount * 0.65)
    ) {
        anomalies.push({
            id: 'purchase_volume_drop',
            severity: 'warning',
            message: `Weekly completed purchases fell from ${params.previousPurchaseCount} to ${params.currentPurchaseCount}.`,
            reasonHint: 'Inspect ad-spend shifts, catalog availability, and Stripe webhook delivery for the affected time window.',
        })
    }

    if (params.coverage.recordCount >= 20 && params.coverage.unattributedRate >= 0.6) {
        anomalies.push({
            id: 'attribution_coverage_low',
            severity: 'warning',
            message: `Session attribution coverage is low; unattributed rate is ${params.coverage.unattributedRate}.`,
            reasonHint: 'Ensure conversion session IDs are passed from `/create` and checkout flows so source-level dropoff stays actionable.',
        })
    }

    const topSource = params.sourceBreakdown[0]
    if (
        topSource &&
        params.currentGeneratedCount >= 20 &&
        topSource.generatedCount / params.currentGeneratedCount >= 0.85
    ) {
        anomalies.push({
            id: 'source_concentration_high',
            severity: 'warning',
            message: `Top source '${topSource.source}' contributes ${topSource.generatedCount}/${params.currentGeneratedCount} generated sessions.`,
            reasonHint: 'A single traffic source dominates the funnel. Diversify acquisition to reduce conversion volatility.',
        })
    }

    return anomalies
}

function buildMarkdown(summary: ConversionInsightSummary, summaryPath: string): string {
    const lines: string[] = []

    lines.push('# Wave 6 Conversion Insight Pack')
    lines.push('')
    lines.push(`Generated: ${summary.generatedAt}`)
    lines.push(`Commit: \`${summary.commitSha}\``)
    lines.push(`Status: **${summary.status.toUpperCase()}**`)
    lines.push(`Mode: **${summary.mode}**`)
    lines.push(`Reason code: \`${summary.reasonCode}\``)
    lines.push(
        `Connectivity: **${summary.connectivity.status}** (policy=${summary.connectivity.policy}, reason=${summary.connectivity.reasonCode})`,
    )
    lines.push(
        `Freshness: stale=${summary.freshness.stale}, ageSeconds=${summary.freshness.ageSeconds ?? 'n/a'}, ttlSeconds=${summary.freshness.ttlSeconds}`,
    )
    lines.push(`Summary JSON: \`${toRelativePath(summaryPath)}\``)
    lines.push('')

    lines.push('## Weekly Totals')
    lines.push(`- Generated designs: ${summary.totals.generatedCount}`)
    lines.push(`- Completed purchases: ${summary.totals.purchaseCount}`)
    lines.push(`- Conversion rate: ${summary.totals.conversionRate}`)
    lines.push(`- Previous conversion rate: ${summary.totals.previousConversionRate}`)
    lines.push('')

    lines.push('## Source Dropoff')
    if (summary.sourceBreakdown.length === 0) {
        lines.push('- No source data available for this window.')
    } else {
        for (const row of summary.sourceBreakdown) {
            lines.push(
                `- ${row.source}: generated=${row.generatedCount}, purchases=${row.purchaseCount}, dropoff=${row.dropoffCount}, conversionRate=${row.conversionRate}`,
            )
        }
    }
    lines.push('')

    lines.push('## Page Dropoff')
    for (const row of summary.pageDropoff) {
        lines.push(`- ${row.label}: count=${row.count}, dropoffFromPrevious=${row.dropoffFromPrevious}`)
    }
    lines.push('')

    lines.push('## Form-Step Dropoff')
    for (const row of summary.formStepDropoff) {
        lines.push(`- ${row.label}: count=${row.count}, dropoffFromPrevious=${row.dropoffFromPrevious}`)
    }
    lines.push('')

    lines.push('## Anomaly Flags')
    if (summary.anomalies.length === 0) {
        lines.push('- None')
    } else {
        for (const anomaly of summary.anomalies) {
            lines.push(`- [${anomaly.severity}] ${anomaly.message}`)
            lines.push(`  Reason hint: ${anomaly.reasonHint}`)
        }
    }

    return lines.join('\n')
}

async function main(): Promise<void> {
    const now = new Date()
    const nowIso = now.toISOString()
    const windowDays = readWindowDays()
    const degradedPolicy = readDegradedPolicy()
    const cacheTtlSeconds = readCacheTtlSeconds()
    const cacheFilePath = readCacheFilePath()
    const windowMs = windowDays * 24 * 60 * 60 * 1000
    const commitSha = readCommitSha()
    const timestamp = formatTimestampForPath(now)

    const artifactDir = toAbsolutePath(
        process.env.CONVERSION_INSIGHTS_ARTIFACT_DIR || `docs/reports/artifacts/wave6-conversion-insights-${timestamp}-${commitSha}`,
    )
    const summaryPath = path.join(artifactDir, 'summary.json')
    const reportPath = toAbsolutePath(
        process.env.CONVERSION_INSIGHTS_REPORT_FILE || `docs/reports/WAVE6_CONVERSION_INSIGHTS_${timestamp}_${commitSha}.md`,
    )

    const currentEnd = now
    const currentStart = new Date(currentEnd.getTime() - windowMs)
    const previousEnd = currentStart
    const previousStart = new Date(previousEnd.getTime() - windowMs)

    let status: InsightStatus = 'ok'
    let mode: ConnectivityStatus = 'connected_live'
    let reasonCode = 'live_database'
    let connectivityMessage = 'Runtime database connectivity precheck passed.'
    let sourceGeneratedAt: string | null = nowIso
    let ageSeconds: number | null = 0
    let stale = false
    let dataset: ConversionDataset | null = null
    let cachedSummary: ConversionInsightSummary | null = null

    const fixturePath = process.env.CONVERSION_INSIGHTS_INPUT_FILE?.trim()
    if (fixturePath) {
        dataset = await readFixtureDataset(fixturePath)
        mode = 'connected_live'
        reasonCode = 'fixture_input'
        connectivityMessage = 'Fixture input file provided; runtime DB connectivity check skipped.'
    } else {
        const connection = await openLivePrismaClient()
        if (!connection.ok) {
            const cacheRead = await readCachedSummary(cacheFilePath)
            if (cacheRead.status === 'hit' && cacheRead.summary && cacheRead.summary.status === 'ok') {
                cachedSummary = cacheRead.summary
                mode = 'stale_cached'
                reasonCode = `cache_fallback_${connection.reasonCode}`
                connectivityMessage = `${connection.message} Using cached conversion pulse summary.`
                sourceGeneratedAt = cachedSummary.generatedAt || null
                ageSeconds = computeAgeSeconds(sourceGeneratedAt, now)
                stale = ageSeconds === null ? true : ageSeconds > cacheTtlSeconds
            } else {
                const cacheStateSuffix =
                    cacheRead.status === 'miss'
                        ? 'no_cache'
                        : cacheRead.status === 'invalid'
                          ? 'cache_invalid'
                          : 'cache_unusable'

                status = 'unavailable'
                mode = 'degraded_no_db'
                reasonCode = `${connection.reasonCode}_${cacheStateSuffix}`
                connectivityMessage = `${connection.message} No usable cache fallback (${cacheStateSuffix}).`
                sourceGeneratedAt = null
                ageSeconds = null
                stale = true
                dataset = {
                    current: { designs: [], orders: [] },
                    previous: { designs: [], orders: [] },
                }
                if (degradedPolicy === 'fail') {
                    throw new Error(`[conversion-insights:${reasonCode}] ${connectivityMessage}`)
                }
            }
        } else {
            try {
                dataset = await readDatabaseDataset(connection.prisma, now, windowDays)
            } finally {
                await connection.prisma.$disconnect()
            }
        }
    }

    let summary: ConversionInsightSummary
    if (cachedSummary) {
        const fallbackAnomalyId = stale ? 'conversion_pulse_stale_cache' : 'conversion_pulse_cached_fallback'
        const fallbackAnomaly: Anomaly = {
            id: fallbackAnomalyId,
            severity: 'warning',
            message: stale
                ? `Conversion pulse is using stale cache (${ageSeconds ?? 'unknown'}s old; ttl ${cacheTtlSeconds}s).`
                : 'Runtime database is unavailable; conversion pulse is using cached data within freshness TTL.',
            reasonHint: stale
                ? 'Restore runtime DB connectivity and rerun the checkpoint to refresh conversion metrics.'
                : 'Investigate runtime DB connectivity before cache freshness TTL is exceeded.',
        }

        const priorAnomalies = (cachedSummary.anomalies || []).filter(
            (anomaly) => anomaly.id !== 'conversion_pulse_stale_cache' && anomaly.id !== 'conversion_pulse_cached_fallback',
        )

        summary = {
            ...cachedSummary,
            generatedAt: nowIso,
            commitSha,
            status: 'ok',
            mode,
            reasonCode,
            connectivity: {
                status: mode,
                policy: degradedPolicy,
                reasonCode,
                message: connectivityMessage,
            },
            freshness: {
                ttlSeconds: cacheTtlSeconds,
                sourceGeneratedAt,
                ageSeconds,
                stale,
                cacheFile: cacheFilePath,
            },
            anomalies: [...priorAnomalies, fallbackAnomaly],
        }
    } else {
        const safeDataset = dataset || {
            current: { designs: [], orders: [] },
            previous: { designs: [], orders: [] },
        }

        const currentGeneratedCount = safeDataset.current.designs.length
        const currentPurchaseCount = safeDataset.current.orders.filter((order) =>
            PURCHASE_STATUSES.has(order.status.trim().toLowerCase()),
        ).length

        const previousGeneratedCount = safeDataset.previous.designs.length
        const previousPurchaseCount = safeDataset.previous.orders.filter((order) =>
            PURCHASE_STATUSES.has(order.status.trim().toLowerCase()),
        ).length

        const currentConversionRate = formatRate(currentPurchaseCount, currentGeneratedCount)
        const previousConversionRate = formatRate(previousPurchaseCount, previousGeneratedCount)

        const sourceBreakdown = buildSourceBreakdown(safeDataset.current.designs, safeDataset.current.orders)
        const coverage = buildAttributionCoverage(safeDataset.current.designs, safeDataset.current.orders)
        const { pageDropoff, formStepDropoff } = buildFunnelRows(currentGeneratedCount, currentPurchaseCount)

        const anomalies = buildAnomalies({
            status,
            unavailableReasonCode: reasonCode,
            currentGeneratedCount,
            currentPurchaseCount,
            currentConversionRate,
            previousGeneratedCount,
            previousPurchaseCount,
            previousConversionRate,
            coverage,
            sourceBreakdown,
        })

        summary = {
            generatedAt: nowIso,
            commitSha,
            status,
            mode,
            reasonCode,
            connectivity: {
                status: mode,
                policy: degradedPolicy,
                reasonCode,
                message: connectivityMessage,
            },
            freshness: {
                ttlSeconds: cacheTtlSeconds,
                sourceGeneratedAt,
                ageSeconds,
                stale,
                cacheFile: cacheFilePath,
            },
            window: {
                days: windowDays,
                currentStart: currentStart.toISOString(),
                currentEnd: currentEnd.toISOString(),
                previousStart: previousStart.toISOString(),
                previousEnd: previousEnd.toISOString(),
            },
            totals: {
                generatedCount: currentGeneratedCount,
                purchaseCount: currentPurchaseCount,
                conversionRate: currentConversionRate,
                previousGeneratedCount,
                previousPurchaseCount,
                previousConversionRate,
            },
            attributionCoverage: coverage,
            sourceBreakdown,
            pageDropoff,
            formStepDropoff,
            anomalies,
        }
    }

    await mkdir(path.dirname(summaryPath), { recursive: true })
    await mkdir(path.dirname(reportPath), { recursive: true })

    await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
    await writeFile(reportPath, `${buildMarkdown(summary, summaryPath)}\n`, 'utf8')
    if (!fixturePath && summary.status === 'ok' && summary.mode === 'connected_live') {
        await mkdir(path.dirname(cacheFilePath), { recursive: true })
        await writeFile(cacheFilePath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
    }

    console.log(`Conversion insight summary: ${toRelativePath(summaryPath)}`)
    console.log(`Conversion insight report: ${toRelativePath(reportPath)}`)
    console.log(`Conversion pulse mode: ${summary.mode} (${summary.reasonCode})`)
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
})
