import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

type GateFlag = 'green' | 'amber' | 'red'

type CheckpointStage = {
    status?: number
    summary?: string
    phase?: string
    report?: string
}

type CheckpointSummary = {
    generatedAt?: string
    commitSha?: string
    stages?: {
        rendered?: CheckpointStage
        lighthouse?: CheckpointStage
        trend?: CheckpointStage
        conversion?: CheckpointStage
        alerts?: CheckpointStage
    }
}

type LighthouseRouteResult = {
    finalScores?: {
        performance?: number
        accessibility?: number
        seo?: number
    }
}

type LighthouseSummary = {
    failures?: string[]
    routeResults?: LighthouseRouteResult[]
    productDetailResolution?: {
        strategy?: string
        resolvedPath?: string | null
        sourcePath?: string | null
    }
}

type RenderedRouteResult = {
    expectedTrustExpectation?: 'required' | 'optional' | 'absent'
    actualTrustVisible?: boolean
    schema?: {
        expected?: 'none' | 'breadcrumb' | 'itemlist+breadcrumb' | 'product+breadcrumb'
        parseErrors?: string[]
        hasBreadcrumbList?: boolean
        hasItemList?: boolean
        hasProductOfferShape?: boolean
    }
    legalLinks?: {
        expected?: 'required' | 'optional' | 'absent'
        supportPathFound?: boolean
        supportLabelFound?: boolean
        termsPathFound?: boolean
        termsLabelFound?: boolean
        reachability?: Record<string, number | string | null>
    }
}

type RenderedTarget = {
    routeResults?: RenderedRouteResult[]
}

type RenderedSummary = {
    failures?: string[]
    targets?: RenderedTarget[]
}

type TrendFinding = {
    metric?: string
    current?: number
    baselineMean?: number
    baselineStdDev?: number
    drop?: number
    threshold?: number
}

type TrendSummary = {
    status?: 'pass' | 'warmup' | 'fail'
    warmup?: {
        active?: boolean
        remaining?: {
            lighthouse?: number
            rendered?: number
        }
    }
    findings?: TrendFinding[]
}

type ConversionAnomaly = {
    id?: string
    severity?: 'warning' | 'critical'
}

type ConversionRuntimeMode = 'connected_live' | 'degraded_no_db' | 'stale_cached'
type ConversionMode = ConversionRuntimeMode | 'unknown'

type ConversionSummary = {
    status?: 'ok' | 'unavailable'
    mode?: ConversionRuntimeMode
    reasonCode?: string
    connectivity?: {
        status?: ConversionRuntimeMode
        reasonCode?: string
    }
    freshness?: {
        ageSeconds?: number | null
        stale?: boolean
    }
    totals?: {
        generatedCount?: number
        purchaseCount?: number
        conversionRate?: number
    }
    anomalies?: ConversionAnomaly[]
}

type Snapshot = {
    generatedAt: string
    commitSha: string
    checkpointFile: string
    overallFlag: GateFlag
    flags: {
        rendered: GateFlag
        lighthouse: GateFlag
        trend: GateFlag
        deterministicRoute: GateFlag
        trustSchema: GateFlag
        legalLinks: GateFlag
        conversionPulse: GateFlag
        deployHealth: GateFlag
    }
    lighthouse: {
        routeCount: number
        failureCount: number
        averageScores: {
            performance: number
            accessibility: number
            seo: number
        }
        productDetailResolution: {
            strategy: string
            resolvedPath: string | null
            sourcePath: string | null
        }
    }
    rendered: {
        failureCount: number
        requiredTrustVisible: number
        requiredTrustTotal: number
        requiredTrustRate: number
        trustSchemaPass: boolean
        legalLinksPass: boolean
    }
    trend: {
        status: 'pass' | 'warmup' | 'fail' | 'unknown'
        findingCount: number
        topFinding: TrendFinding | null
        warmupRemaining: {
            lighthouse: number
            rendered: number
        }
    }
    conversion: {
        status: 'ok' | 'unavailable' | 'unknown'
        mode: ConversionMode
        dbConnectivityStatus: ConversionMode
        dataFreshnessAge: number | null
        stale: boolean
        reasonCode: string | null
        amberReasonCode: string | null
        generatedCount: number
        purchaseCount: number
        conversionRate: number
        warningAnomalyCount: number
        criticalAnomalyCount: number
    }
    deployHealth: {
        status: 'healthy' | 'watch' | 'degraded'
        renderedStageStatus: number | null
        lighthouseStageStatus: number | null
    }
    releaseConfidenceCard: {
        renderedSemantics: {
            flag: GateFlag
            requiredTrustRate: number
            failureCount: number
        }
        lighthouseDeterministicGate: {
            flag: GateFlag
            strategy: string
            averageScores: {
                performance: number
                accessibility: number
                seo: number
            }
        }
        trendStatus: {
            flag: GateFlag
            status: 'pass' | 'warmup' | 'fail' | 'unknown'
            findingCount: number
        }
        deployHealth: {
            flag: GateFlag
            status: 'healthy' | 'watch' | 'degraded'
        }
        conversionPulse: {
            flag: GateFlag
            status: 'ok' | 'unavailable' | 'unknown'
            conversionRate: number
            criticalAnomalyCount: number
            warningAnomalyCount: number
            db_connectivity_status: ConversionMode
            conversion_pulse_mode: ConversionMode
            data_freshness_age: number | null
            amber_reason_code: string | null
        }
    }
    sources: {
        lighthouseSummary: string | null
        renderedSummary: string | null
        trendSummary: string | null
        conversionSummary: string | null
    }
}

function toAbsolutePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
        return filePath
    }
    return path.join(process.cwd(), filePath)
}

function toRelativePath(filePath: string): string {
    return path.relative(process.cwd(), filePath).split(path.sep).join('/')
}

async function readJsonIfExists<T>(filePath: string | undefined): Promise<T | null> {
    if (!filePath) {
        return null
    }

    try {
        const raw = await readFile(toAbsolutePath(filePath), 'utf8')
        return JSON.parse(raw) as T
    } catch {
        return null
    }
}

function isPassingStatus(status: number | undefined): boolean {
    return status === 0
}

function average(values: number[]): number {
    if (values.length === 0) {
        return 0
    }
    return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3))
}

function routeSchemaPass(route: RenderedRouteResult): boolean {
    const schema = route.schema
    if (!schema || !schema.expected || schema.expected === 'none') {
        return true
    }

    if ((schema.parseErrors || []).length > 0) {
        return false
    }

    if (schema.expected === 'breadcrumb') {
        return Boolean(schema.hasBreadcrumbList)
    }

    if (schema.expected === 'itemlist+breadcrumb') {
        return Boolean(schema.hasBreadcrumbList && schema.hasItemList)
    }

    if (schema.expected === 'product+breadcrumb') {
        return Boolean(schema.hasBreadcrumbList && schema.hasProductOfferShape)
    }

    return false
}

function routeLegalLinksPass(route: RenderedRouteResult): boolean {
    const legal = route.legalLinks
    if (!legal || legal.expected !== 'required') {
        return true
    }

    if (!legal.supportPathFound || !legal.supportLabelFound || !legal.termsPathFound || !legal.termsLabelFound) {
        return false
    }

    const reachability = legal.reachability || {}
    return Object.values(reachability).every((status) => {
        if (typeof status !== 'number') {
            return false
        }
        return status >= 200 && status < 400
    })
}

function deriveOverallFlag(flags: GateFlag[]): GateFlag {
    if (flags.includes('red')) {
        return 'red'
    }
    if (flags.includes('amber')) {
        return 'amber'
    }
    return 'green'
}

function formatFlag(flag: GateFlag): string {
    if (flag === 'green') {
        return 'GREEN'
    }
    if (flag === 'amber') {
        return 'AMBER'
    }
    return 'RED'
}

function toConversionMode(value: string | undefined | null): ConversionMode {
    if (value === 'connected_live' || value === 'degraded_no_db' || value === 'stale_cached') {
        return value
    }
    return 'unknown'
}

function buildMarkdown(snapshot: Snapshot, outputJsonPath: string): string {
    const lines: string[] = []
    lines.push('# Wave 6 Release Confidence Snapshot')
    lines.push('')
    lines.push(`Generated: ${snapshot.generatedAt}`)
    lines.push(`Commit: \`${snapshot.commitSha}\``)
    lines.push(`Overall: **${formatFlag(snapshot.overallFlag)}**`)
    lines.push(`Snapshot JSON: \`${toRelativePath(outputJsonPath)}\``)
    lines.push('')
    lines.push('## Gate Flags')
    lines.push(`- Rendered harness: ${formatFlag(snapshot.flags.rendered)}`)
    lines.push(`- Lighthouse gate: ${formatFlag(snapshot.flags.lighthouse)}`)
    lines.push(`- Trend gate: ${formatFlag(snapshot.flags.trend)}`)
    lines.push(`- Deterministic route: ${formatFlag(snapshot.flags.deterministicRoute)}`)
    lines.push(`- Trust/schema semantic pass: ${formatFlag(snapshot.flags.trustSchema)}`)
    lines.push(`- Legal/support links pass: ${formatFlag(snapshot.flags.legalLinks)}`)
    lines.push(`- Deploy health: ${formatFlag(snapshot.flags.deployHealth)}`)
    lines.push(`- Conversion pulse: ${formatFlag(snapshot.flags.conversionPulse)}`)
    lines.push('')
    lines.push('## Highlights')
    lines.push(
        `- Lighthouse avg (perf/a11y/seo): ${snapshot.lighthouse.averageScores.performance} / ${snapshot.lighthouse.averageScores.accessibility} / ${snapshot.lighthouse.averageScores.seo}`,
    )
    lines.push(
        `- Trust visibility: ${snapshot.rendered.requiredTrustVisible}/${snapshot.rendered.requiredTrustTotal} (${(snapshot.rendered.requiredTrustRate * 100).toFixed(1)}%)`,
    )
    lines.push(`- Trend status: ${snapshot.trend.status} (findings: ${snapshot.trend.findingCount})`)
    lines.push(`- Deploy health: ${snapshot.deployHealth.status}`)
    lines.push(
        `- Conversion pulse: status=${snapshot.conversion.status}, rate=${snapshot.conversion.conversionRate}, critical=${snapshot.conversion.criticalAnomalyCount}, warning=${snapshot.conversion.warningAnomalyCount}`,
    )
    lines.push(
        `- Conversion runtime: mode=${snapshot.conversion.mode}, db=${snapshot.conversion.dbConnectivityStatus}, freshnessAge=${snapshot.conversion.dataFreshnessAge ?? 'n/a'}, amberReason=${snapshot.conversion.amberReasonCode ?? 'n/a'}`,
    )
    if (snapshot.trend.status === 'warmup') {
        lines.push(
            `- Warmup remaining: lighthouse=${snapshot.trend.warmupRemaining.lighthouse}, rendered=${snapshot.trend.warmupRemaining.rendered}`,
        )
    }
    if (snapshot.trend.topFinding?.metric) {
        lines.push(
            `- Top trend delta: ${snapshot.trend.topFinding.metric} drop=${snapshot.trend.topFinding.drop ?? 0} threshold=${snapshot.trend.topFinding.threshold ?? 0}`,
        )
    }
    lines.push('')
    return lines.join('\n')
}

async function main(): Promise<void> {
    const checkpointPath = toAbsolutePath(process.env.QUALITY_CHECKPOINT_FILE || 'docs/reports/artifacts/wave5-checkpoints/latest.json')
    const snapshotJsonPath = toAbsolutePath(
        process.env.QUALITY_SNAPSHOT_JSON ||
            path.join('docs/reports/artifacts/wave5-checkpoints', `snapshot-${new Date().toISOString().replace(/[:]/g, '-').replace(/\..+/, '')}.json`),
    )
    const snapshotReportPath = toAbsolutePath(
        process.env.QUALITY_SNAPSHOT_REPORT ||
            path.join('docs/reports', `WAVE5_QUALITY_SNAPSHOT_${new Date().toISOString().slice(0, 10)}.md`),
    )

    const checkpoint = (await readJsonIfExists<CheckpointSummary>(checkpointPath)) || {}

    const lighthouseSummaryPath = checkpoint.stages?.lighthouse?.summary
    const renderedSummaryPath = checkpoint.stages?.rendered?.summary
    const trendSummaryPath = checkpoint.stages?.trend?.summary
    const conversionSummaryPath = checkpoint.stages?.conversion?.summary

    const lighthouseSummary = await readJsonIfExists<LighthouseSummary>(lighthouseSummaryPath)
    const renderedSummary = await readJsonIfExists<RenderedSummary>(renderedSummaryPath)
    const trendSummary = await readJsonIfExists<TrendSummary>(trendSummaryPath)
    const conversionSummary = await readJsonIfExists<ConversionSummary>(conversionSummaryPath)

    const routeResults = lighthouseSummary?.routeResults || []
    const performanceScores = routeResults.map((route) => route.finalScores?.performance || 0)
    const accessibilityScores = routeResults.map((route) => route.finalScores?.accessibility || 0)
    const seoScores = routeResults.map((route) => route.finalScores?.seo || 0)

    const renderedRoutes = (renderedSummary?.targets || []).flatMap((target) => target.routeResults || [])
    const requiredTrustRoutes = renderedRoutes.filter((route) => route.expectedTrustExpectation === 'required')
    const requiredTrustVisible = requiredTrustRoutes.filter((route) => route.actualTrustVisible === true).length
    const requiredTrustTotal = requiredTrustRoutes.length
    const requiredTrustRate = requiredTrustTotal > 0 ? requiredTrustVisible / requiredTrustTotal : 0

    const trustSchemaPass = requiredTrustRoutes.every((route) => route.actualTrustVisible === true && routeSchemaPass(route))
    const legalLinksPass = requiredTrustRoutes.every((route) => routeLegalLinksPass(route))

    const trendStatus = trendSummary?.status || 'unknown'
    const trendFindings = trendSummary?.findings || []
    const topFinding = trendFindings.length > 0 ? trendFindings[0] : null

    const conversionStatus = conversionSummary?.status || 'unknown'
    const conversionMode = toConversionMode(conversionSummary?.mode || null)
    const dbConnectivityStatus = toConversionMode(conversionSummary?.connectivity?.status || conversionSummary?.mode || null)
    const dataFreshnessAgeRaw = conversionSummary?.freshness?.ageSeconds
    const dataFreshnessAge =
        typeof dataFreshnessAgeRaw === 'number' && Number.isFinite(dataFreshnessAgeRaw)
            ? Math.max(0, Math.round(dataFreshnessAgeRaw))
            : null
    const dataFreshnessStale = conversionSummary?.freshness?.stale === true
    const conversionReasonCode =
        typeof conversionSummary?.reasonCode === 'string' && conversionSummary.reasonCode.length > 0
            ? conversionSummary.reasonCode
            : typeof conversionSummary?.connectivity?.reasonCode === 'string' &&
                conversionSummary.connectivity.reasonCode.length > 0
              ? conversionSummary.connectivity.reasonCode
              : null
    const conversionGeneratedCount = conversionSummary?.totals?.generatedCount || 0
    const conversionPurchaseCount = conversionSummary?.totals?.purchaseCount || 0
    const conversionRate = conversionSummary?.totals?.conversionRate || 0
    const conversionCriticalAnomalyCount = (conversionSummary?.anomalies || []).filter(
        (anomaly) => anomaly.severity === 'critical',
    ).length
    const conversionWarningAnomalyCount = (conversionSummary?.anomalies || []).filter(
        (anomaly) => anomaly.severity === 'warning',
    ).length

    const renderedFailureCount = (renderedSummary?.failures || []).length
    const lighthouseFailureCount = (lighthouseSummary?.failures || []).length

    const renderedFlag: GateFlag = !isPassingStatus(checkpoint.stages?.rendered?.status)
        ? 'red'
        : renderedFailureCount > 0
          ? 'red'
          : 'green'

    const lighthouseFlag: GateFlag = !isPassingStatus(checkpoint.stages?.lighthouse?.status)
        ? 'red'
        : lighthouseFailureCount > 0
          ? 'red'
          : 'green'

    const trendFlag: GateFlag = !isPassingStatus(checkpoint.stages?.trend?.status)
        ? 'red'
        : trendStatus === 'pass'
          ? 'green'
          : trendStatus === 'warmup'
            ? 'amber'
            : trendStatus === 'fail'
              ? 'red'
              : 'amber'

    const deterministicRouteStrategy = lighthouseSummary?.productDetailResolution?.strategy || 'unknown'
    const deterministicRouteFlag: GateFlag = deterministicRouteStrategy === 'fixture'
        ? 'green'
        : deterministicRouteStrategy === 'fallback-discovery'
          ? 'amber'
          : 'red'

    const trustSchemaFlag: GateFlag = trustSchemaPass ? 'green' : 'red'
    const legalLinksFlag: GateFlag = legalLinksPass ? 'green' : 'red'
    const conversionStageStatus = checkpoint.stages?.conversion?.status
    const conversionFlag: GateFlag = conversionStageStatus === undefined
        ? 'amber'
        : !isPassingStatus(conversionStageStatus)
          ? 'red'
          : conversionStatus === 'unknown'
          ? 'amber'
          : conversionCriticalAnomalyCount > 0
              ? 'red'
              : conversionStatus === 'unavailable'
                ? 'amber'
                : conversionMode === 'stale_cached' || dataFreshnessStale
                  ? 'amber'
                  : conversionWarningAnomalyCount > 0
                    ? 'amber'
                    : 'green'

    let conversionAmberReasonCode: string | null = null
    if (conversionFlag === 'amber') {
        if (conversionStageStatus === undefined) {
            conversionAmberReasonCode = 'conversion_stage_missing'
        } else if (conversionReasonCode) {
            conversionAmberReasonCode = conversionReasonCode
        } else if (conversionStatus === 'unknown') {
            conversionAmberReasonCode = 'conversion_status_unknown'
        } else if (conversionStatus === 'unavailable') {
            conversionAmberReasonCode = 'conversion_unavailable'
        } else if (conversionMode === 'stale_cached') {
            conversionAmberReasonCode = 'conversion_cache_fallback'
        } else if (dataFreshnessStale) {
            conversionAmberReasonCode = 'conversion_data_stale'
        } else if (conversionWarningAnomalyCount > 0) {
            conversionAmberReasonCode = 'conversion_warning_anomaly'
        } else {
            conversionAmberReasonCode = 'conversion_amber'
        }
    }
    const deployHealthFlag: GateFlag = renderedFlag === 'red' || lighthouseFlag === 'red'
        ? 'red'
        : deterministicRouteFlag === 'amber' || trendFlag === 'amber'
          ? 'amber'
          : 'green'
    const deployHealthStatus: 'healthy' | 'watch' | 'degraded' = deployHealthFlag === 'green'
        ? 'healthy'
        : deployHealthFlag === 'amber'
          ? 'watch'
          : 'degraded'

    const overallFlag = deriveOverallFlag([
        renderedFlag,
        lighthouseFlag,
        trendFlag,
        deterministicRouteFlag,
        trustSchemaFlag,
        legalLinksFlag,
        conversionFlag,
        deployHealthFlag,
    ])

    const snapshot: Snapshot = {
        generatedAt: new Date().toISOString(),
        commitSha: checkpoint.commitSha || 'unknown',
        checkpointFile: toRelativePath(checkpointPath),
        overallFlag,
        flags: {
            rendered: renderedFlag,
            lighthouse: lighthouseFlag,
            trend: trendFlag,
            deterministicRoute: deterministicRouteFlag,
            trustSchema: trustSchemaFlag,
            legalLinks: legalLinksFlag,
            conversionPulse: conversionFlag,
            deployHealth: deployHealthFlag,
        },
        lighthouse: {
            routeCount: routeResults.length,
            failureCount: lighthouseFailureCount,
            averageScores: {
                performance: average(performanceScores),
                accessibility: average(accessibilityScores),
                seo: average(seoScores),
            },
            productDetailResolution: {
                strategy: deterministicRouteStrategy,
                resolvedPath: lighthouseSummary?.productDetailResolution?.resolvedPath || null,
                sourcePath: lighthouseSummary?.productDetailResolution?.sourcePath || null,
            },
        },
        rendered: {
            failureCount: renderedFailureCount,
            requiredTrustVisible,
            requiredTrustTotal,
            requiredTrustRate: Number(requiredTrustRate.toFixed(4)),
            trustSchemaPass,
            legalLinksPass,
        },
        trend: {
            status: trendStatus,
            findingCount: trendFindings.length,
            topFinding,
            warmupRemaining: {
                lighthouse: trendSummary?.warmup?.remaining?.lighthouse || 0,
                rendered: trendSummary?.warmup?.remaining?.rendered || 0,
            },
        },
        conversion: {
            status: conversionStatus,
            mode: conversionMode,
            dbConnectivityStatus,
            dataFreshnessAge,
            stale: dataFreshnessStale,
            reasonCode: conversionReasonCode,
            amberReasonCode: conversionAmberReasonCode,
            generatedCount: conversionGeneratedCount,
            purchaseCount: conversionPurchaseCount,
            conversionRate,
            warningAnomalyCount: conversionWarningAnomalyCount,
            criticalAnomalyCount: conversionCriticalAnomalyCount,
        },
        deployHealth: {
            status: deployHealthStatus,
            renderedStageStatus: checkpoint.stages?.rendered?.status ?? null,
            lighthouseStageStatus: checkpoint.stages?.lighthouse?.status ?? null,
        },
        releaseConfidenceCard: {
            renderedSemantics: {
                flag: renderedFlag,
                requiredTrustRate: Number(requiredTrustRate.toFixed(4)),
                failureCount: renderedFailureCount,
            },
            lighthouseDeterministicGate: {
                flag: deterministicRouteFlag,
                strategy: deterministicRouteStrategy,
                averageScores: {
                    performance: average(performanceScores),
                    accessibility: average(accessibilityScores),
                    seo: average(seoScores),
                },
            },
            trendStatus: {
                flag: trendFlag,
                status: trendStatus,
                findingCount: trendFindings.length,
            },
            deployHealth: {
                flag: deployHealthFlag,
                status: deployHealthStatus,
            },
            conversionPulse: {
                flag: conversionFlag,
                status: conversionStatus,
                conversionRate,
                criticalAnomalyCount: conversionCriticalAnomalyCount,
                warningAnomalyCount: conversionWarningAnomalyCount,
                db_connectivity_status: dbConnectivityStatus,
                conversion_pulse_mode: conversionMode,
                data_freshness_age: dataFreshnessAge,
                amber_reason_code: conversionAmberReasonCode,
            },
        },
        sources: {
            lighthouseSummary: lighthouseSummaryPath || null,
            renderedSummary: renderedSummaryPath || null,
            trendSummary: trendSummaryPath || null,
            conversionSummary: conversionSummaryPath || null,
        },
    }

    await mkdir(path.dirname(snapshotJsonPath), { recursive: true })
    await mkdir(path.dirname(snapshotReportPath), { recursive: true })

    await writeFile(snapshotJsonPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
    await writeFile(snapshotReportPath, `${buildMarkdown(snapshot, snapshotJsonPath)}\n`, 'utf8')

    console.log(`Quality snapshot JSON: ${toRelativePath(snapshotJsonPath)}`)
    console.log(`Quality snapshot report: ${toRelativePath(snapshotReportPath)}`)
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
})
