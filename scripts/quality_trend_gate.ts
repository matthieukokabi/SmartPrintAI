import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

type Scores = {
    performance: number
    accessibility: number
    seo: number
}

type LighthouseRouteSummary = {
    key: string
    path: string
    finalScores: Scores
}

type LighthouseSummary = {
    generatedAt: string
    generatedDate: string
    artifactRoot: string
    routeResults: LighthouseRouteSummary[]
    failures: string[]
}

type RenderedRouteSummary = {
    expectedTrustExpectation?: 'required' | 'optional' | 'absent'
    actualTrustVisible?: boolean
}

type RenderedTargetSummary = {
    routeResults: RenderedRouteSummary[]
}

type RenderedSummary = {
    generatedAt: string
    generatedDate: string
    commitSha?: string
    artifactRoot: string
    targets: RenderedTargetSummary[]
    failures: string[]
}

type LighthouseHistoryRecord = {
    generatedAt: string
    commitSha: string
    summaryPath: string
    overall: Scores
    routes: Record<string, Scores>
}

type RenderedHistoryRecord = {
    generatedAt: string
    commitSha: string
    summaryPath: string
    failureCount: number
    requiredTrustVisible: number
    requiredTrustTotal: number
    requiredTrustRate: number
}

type TrendFinding = {
    metric: string
    current: number
    baselineMean: number
    baselineStdDev: number
    drop: number
    threshold: number
}

const CATEGORY_KEYS: Array<keyof Scores> = ['performance', 'accessibility', 'seo']

function nowTimestamp() {
    const now = new Date()
    const yyyy = String(now.getFullYear())
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const hh = String(now.getHours()).padStart(2, '0')
    const min = String(now.getMinutes()).padStart(2, '0')
    const sec = String(now.getSeconds()).padStart(2, '0')
    return {
        iso: now.toISOString(),
        date: `${yyyy}-${mm}-${dd}`,
        compact: `${yyyy}-${mm}-${dd}_${hh}-${min}-${sec}`,
    }
}

function toRelativePath(filePath: string): string {
    return path.relative(process.cwd(), filePath).split(path.sep).join('/')
}

function normalizeScore(value: number): number {
    return Number(value.toFixed(3))
}

function mean(values: number[]): number {
    if (values.length === 0) {
        return 0
    }
    return values.reduce((sum, value) => sum + value, 0) / values.length
}

function stdDev(values: number[]): number {
    if (values.length <= 1) {
        return 0
    }
    const avg = mean(values)
    const variance = mean(values.map((value) => (value - avg) ** 2))
    return Math.sqrt(variance)
}

async function readJsonFile<T>(filePath: string): Promise<T> {
    const raw = await readFile(filePath, 'utf8')
    return JSON.parse(raw) as T
}

function toAbsolutePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
        return filePath
    }
    return path.join(process.cwd(), filePath)
}

async function findLatestSummaryPath(prefix: string): Promise<string> {
    const artifactRoot = path.join(process.cwd(), 'docs', 'reports', 'artifacts')
    const entries = await readdir(artifactRoot, { withFileTypes: true })

    const candidates: Array<{ summaryPath: string; mtimeMs: number }> = []

    for (const entry of entries) {
        if (!entry.isDirectory()) {
            continue
        }
        if (!entry.name.startsWith(prefix)) {
            continue
        }

        const summaryPath = path.join(artifactRoot, entry.name, 'summary.json')
        if (!existsSync(summaryPath)) {
            continue
        }

        const fileStat = await stat(summaryPath)
        candidates.push({ summaryPath, mtimeMs: fileStat.mtimeMs })
    }

    if (candidates.length === 0) {
        throw new Error(`No summary artifacts found for prefix '${prefix}' in ${toRelativePath(artifactRoot)}`)
    }

    candidates.sort((a, b) => b.mtimeMs - a.mtimeMs)
    return candidates[0].summaryPath
}

function sortByGeneratedAt<T extends { generatedAt: string; summaryPath: string }>(records: T[]): T[] {
    return [...records].sort((left, right) => {
        const leftTime = Date.parse(left.generatedAt)
        const rightTime = Date.parse(right.generatedAt)
        if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) {
            return left.summaryPath.localeCompare(right.summaryPath)
        }
        if (Number.isNaN(leftTime)) {
            return -1
        }
        if (Number.isNaN(rightTime)) {
            return 1
        }
        if (leftTime === rightTime) {
            return left.summaryPath.localeCompare(right.summaryPath)
        }
        return leftTime - rightTime
    })
}

function readGitCommitSha(): string {
    const result = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
        cwd: process.cwd(),
        encoding: 'utf8',
    })
    if (result.status !== 0) {
        return 'unknown'
    }
    const value = (result.stdout || '').trim()
    return value.length > 0 ? value : 'unknown'
}

function summarizeLighthouse(summaryPath: string, summary: LighthouseSummary, commitSha: string): LighthouseHistoryRecord {
    const routes: Record<string, Scores> = {}

    for (const route of summary.routeResults) {
        routes[route.key] = {
            performance: normalizeScore(route.finalScores.performance),
            accessibility: normalizeScore(route.finalScores.accessibility),
            seo: normalizeScore(route.finalScores.seo),
        }
    }

    const routeValues = Object.values(routes)
    const overall: Scores = {
        performance: normalizeScore(mean(routeValues.map((route) => route.performance))),
        accessibility: normalizeScore(mean(routeValues.map((route) => route.accessibility))),
        seo: normalizeScore(mean(routeValues.map((route) => route.seo))),
    }

    return {
        generatedAt: summary.generatedAt,
        commitSha,
        summaryPath: toRelativePath(summaryPath),
        overall,
        routes,
    }
}

function summarizeRendered(summaryPath: string, summary: RenderedSummary, commitSha: string): RenderedHistoryRecord {
    const requiredRoutes = summary.targets
        .flatMap((target) => target.routeResults)
        .filter((route) => route.expectedTrustExpectation === 'required')

    const requiredTrustVisible = requiredRoutes.filter((route) => route.actualTrustVisible).length
    const requiredTrustTotal = requiredRoutes.length
    const requiredTrustRate = requiredTrustTotal > 0 ? requiredTrustVisible / requiredTrustTotal : 1

    return {
        generatedAt: summary.generatedAt,
        commitSha,
        summaryPath: toRelativePath(summaryPath),
        failureCount: summary.failures.length,
        requiredTrustVisible,
        requiredTrustTotal,
        requiredTrustRate: normalizeScore(requiredTrustRate),
    }
}

async function readHistory<T>(filePath: string): Promise<T[]> {
    if (!existsSync(filePath)) {
        return []
    }
    return readJsonFile<T[]>(filePath)
}

async function writeHistory<T>(filePath: string, entries: T[]): Promise<void> {
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, `${JSON.stringify(entries, null, 2)}\n`, 'utf8')
}

function upsertHistoryRecord<T extends { generatedAt: string; summaryPath: string }>(history: T[], current: T): T[] {
    const existingIndex = history.findIndex((entry) => entry.summaryPath === current.summaryPath)
    const nextHistory = [...history]
    if (existingIndex >= 0) {
        nextHistory[existingIndex] = current
        return sortByGeneratedAt(nextHistory)
    }
    return sortByGeneratedAt([...nextHistory, current])
}

function evaluateLighthouseTrend(history: LighthouseHistoryRecord[], current: LighthouseHistoryRecord): TrendFinding[] {
    const findings: TrendFinding[] = []
    const windowSize = Number(process.env.QUALITY_TREND_WINDOW || '5')
    const minBaseline = Number(process.env.QUALITY_TREND_MIN_BASELINE || '3')

    const baseline = history
        .filter((entry) => entry.summaryPath !== current.summaryPath)
        .slice(-windowSize)

    if (baseline.length < minBaseline) {
        return findings
    }

    for (const [routeKey, currentScores] of Object.entries(current.routes)) {
        for (const category of CATEGORY_KEYS) {
            const baselineValues = baseline
                .map((entry) => entry.routes[routeKey]?.[category])
                .filter((value): value is number => typeof value === 'number')

            if (baselineValues.length < minBaseline) {
                continue
            }

            const baselineMean = mean(baselineValues)
            const baselineStdDev = stdDev(baselineValues)
            const currentScore = currentScores[category]
            const drop = baselineMean - currentScore
            const threshold = Math.max(0.05, baselineStdDev * 2.5)
            const previousValue = baselineValues[baselineValues.length - 1]

            if (drop >= threshold && currentScore < previousValue) {
                findings.push({
                    metric: `${routeKey}.${category}`,
                    current: normalizeScore(currentScore),
                    baselineMean: normalizeScore(baselineMean),
                    baselineStdDev: normalizeScore(baselineStdDev),
                    drop: normalizeScore(drop),
                    threshold: normalizeScore(threshold),
                })
            }
        }
    }

    return findings
}

function evaluateRenderedTrend(history: RenderedHistoryRecord[], current: RenderedHistoryRecord): TrendFinding[] {
    const findings: TrendFinding[] = []
    const windowSize = Number(process.env.QUALITY_TREND_WINDOW || '5')
    const minBaseline = Number(process.env.QUALITY_TREND_MIN_BASELINE || '3')

    if (current.failureCount > 0) {
        findings.push({
            metric: 'rendered.failures',
            current: current.failureCount,
            baselineMean: 0,
            baselineStdDev: 0,
            drop: current.failureCount,
            threshold: 0,
        })
        return findings
    }

    const baseline = history
        .filter((entry) => entry.summaryPath !== current.summaryPath)
        .slice(-windowSize)

    if (baseline.length < minBaseline) {
        return findings
    }

    const baselineRates = baseline.map((entry) => entry.requiredTrustRate)
    const baselineMean = mean(baselineRates)
    const baselineStdDev = stdDev(baselineRates)
    const drop = baselineMean - current.requiredTrustRate
    const threshold = Math.max(0.02, baselineStdDev * 2.5)
    const previousValue = baselineRates[baselineRates.length - 1]

    if (drop >= threshold && current.requiredTrustRate < previousValue) {
        findings.push({
            metric: 'rendered.requiredTrustRate',
            current: current.requiredTrustRate,
            baselineMean: normalizeScore(baselineMean),
            baselineStdDev: normalizeScore(baselineStdDev),
            drop: normalizeScore(drop),
            threshold: normalizeScore(threshold),
        })
    }

    return findings
}

function buildTrendReport(
    generatedAt: string,
    commitSha: string,
    lighthouseSummaryPath: string,
    renderedSummaryPath: string,
    trendSummaryPath: string,
    lighthouseHistorySize: number,
    renderedHistorySize: number,
    lighthouseRecord: LighthouseHistoryRecord,
    renderedRecord: RenderedHistoryRecord,
    findings: TrendFinding[],
): string {
    const lines: string[] = []
    lines.push('# Wave 4 Quality Trend Gate')
    lines.push('')
    lines.push(`Generated: ${generatedAt}`)
    lines.push(`Commit: \`${commitSha}\``)
    lines.push(`Lighthouse summary: \`${lighthouseSummaryPath}\``)
    lines.push(`Rendered-head summary: \`${renderedSummaryPath}\``)
    lines.push(`Trend summary JSON: \`${trendSummaryPath}\``)
    lines.push('')
    lines.push('## History Window')
    lines.push(`- Lighthouse history size: ${lighthouseHistorySize}`)
    lines.push(`- Rendered-head history size: ${renderedHistorySize}`)
    lines.push(`- Rolling window: ${process.env.QUALITY_TREND_WINDOW || '5'}`)
    lines.push('')
    lines.push('## Quality Trend Snapshot')
    lines.push(
        `- Lighthouse overall (perf/a11y/seo): ${lighthouseRecord.overall.performance.toFixed(3)} / ${lighthouseRecord.overall.accessibility.toFixed(3)} / ${lighthouseRecord.overall.seo.toFixed(3)}`
    )
    lines.push(
        `- Rendered trust visibility: ${renderedRecord.requiredTrustVisible}/${renderedRecord.requiredTrustTotal} (${(renderedRecord.requiredTrustRate * 100).toFixed(1)}%)`
    )
    lines.push(`- Rendered verification failures: ${renderedRecord.failureCount}`)
    lines.push('')
    lines.push('## Result')
    if (findings.length === 0) {
        lines.push('- PASS: no statistically significant regressions detected in rolling-window trend analysis.')
    } else {
        lines.push('- FAIL: trend gate detected regressions.')
        for (const finding of findings) {
            lines.push(
                `- ${finding.metric}: current=${finding.current}, mean=${finding.baselineMean}, stddev=${finding.baselineStdDev}, drop=${finding.drop}, threshold=${finding.threshold}`
            )
        }
    }
    lines.push('')
    return lines.join('\n')
}

async function main(): Promise<void> {
    const timestamp = nowTimestamp()
    const commitSha = readGitCommitSha()

    const lighthouseSummaryPath =
        (process.env.QUALITY_TREND_LIGHTHOUSE_SUMMARY || '').trim().length > 0
            ? toAbsolutePath((process.env.QUALITY_TREND_LIGHTHOUSE_SUMMARY || '').trim())
            : await findLatestSummaryPath('lighthouse-')
    const renderedSummaryPath =
        (process.env.QUALITY_TREND_RENDERED_SUMMARY || '').trim().length > 0
            ? toAbsolutePath((process.env.QUALITY_TREND_RENDERED_SUMMARY || '').trim())
            : await findLatestSummaryPath('wave4-rendered-head-')

    const lighthouseSummary = await readJsonFile<LighthouseSummary>(lighthouseSummaryPath)
    const renderedSummary = await readJsonFile<RenderedSummary>(renderedSummaryPath)

    const lighthouseRecord = summarizeLighthouse(lighthouseSummaryPath, lighthouseSummary, commitSha)
    const renderedRecord = summarizeRendered(renderedSummaryPath, renderedSummary, commitSha)

    const historyRoot = toAbsolutePath(
        (process.env.QUALITY_TREND_HISTORY_DIR || 'docs/reports/artifacts/wave4-trend-history').trim(),
    )
    const lighthouseHistoryPath = path.join(historyRoot, 'lighthouse_history.json')
    const renderedHistoryPath = path.join(historyRoot, 'rendered_head_history.json')

    const lighthouseHistory = upsertHistoryRecord(await readHistory<LighthouseHistoryRecord>(lighthouseHistoryPath), lighthouseRecord)
    const renderedHistory = upsertHistoryRecord(await readHistory<RenderedHistoryRecord>(renderedHistoryPath), renderedRecord)

    const shouldWriteHistory = (process.env.QUALITY_TREND_WRITE_HISTORY || '1').trim() !== '0'
    if (shouldWriteHistory) {
        await writeHistory(lighthouseHistoryPath, lighthouseHistory)
        await writeHistory(renderedHistoryPath, renderedHistory)
    }

    const lighthouseFindings = evaluateLighthouseTrend(lighthouseHistory, lighthouseRecord)
    const renderedFindings = evaluateRenderedTrend(renderedHistory, renderedRecord)
    const findings = [...lighthouseFindings, ...renderedFindings]

    const artifactRoot = path.join(
        process.cwd(),
        'docs',
        'reports',
        'artifacts',
        `wave4-lighthouse-trend-${timestamp.compact}-${commitSha}`,
    )
    const resolvedArtifactRoot = toAbsolutePath(
        (process.env.QUALITY_TREND_ARTIFACT_DIR || artifactRoot).trim(),
    )
    const trendSummaryPath = path.join(resolvedArtifactRoot, 'summary.json')
    const reportPath = toAbsolutePath(
        (process.env.QUALITY_TREND_REPORT_FILE ||
            path.join('docs/reports', `WAVE4_TREND_GATE_${timestamp.compact}_${commitSha}.md`)).trim(),
    )

    await mkdir(resolvedArtifactRoot, { recursive: true })

    const trendSummary = {
        generatedAt: timestamp.iso,
        generatedDate: timestamp.date,
        commitSha,
        lighthouseSummaryPath: toRelativePath(lighthouseSummaryPath),
        renderedSummaryPath: toRelativePath(renderedSummaryPath),
        lighthouseHistoryPath: toRelativePath(lighthouseHistoryPath),
        renderedHistoryPath: toRelativePath(renderedHistoryPath),
        lighthouseHistorySize: lighthouseHistory.length,
        renderedHistorySize: renderedHistory.length,
        findings,
    }

    await writeFile(trendSummaryPath, `${JSON.stringify(trendSummary, null, 2)}\n`, 'utf8')
    await writeFile(
        reportPath,
        buildTrendReport(
            timestamp.iso,
            commitSha,
            trendSummary.lighthouseSummaryPath,
            trendSummary.renderedSummaryPath,
            toRelativePath(trendSummaryPath),
            lighthouseHistory.length,
            renderedHistory.length,
            lighthouseRecord,
            renderedRecord,
            findings,
        ),
        'utf8',
    )

    console.log(`Quality trend report: ${toRelativePath(reportPath)}`)
    console.log(`Quality trend artifacts: ${toRelativePath(resolvedArtifactRoot)}`)

    if (findings.length > 0) {
        for (const finding of findings) {
            console.error(
                `- ${finding.metric}: current=${finding.current} mean=${finding.baselineMean} stddev=${finding.baselineStdDev} drop=${finding.drop} threshold=${finding.threshold}`
            )
        }
        process.exit(1)
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
})
