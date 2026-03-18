import { execSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

type AlertSeverity = 'warning' | 'critical'

type TrendSummary = {
    status?: 'pass' | 'warmup' | 'fail'
    findings?: unknown[]
}

type ConversionAnomaly = {
    id?: string
    severity?: AlertSeverity
    message?: string
    reasonHint?: string
}

type ConversionSummary = {
    anomalies?: ConversionAnomaly[]
}

type AlertCandidate = {
    id: string
    source: 'trend' | 'conversion'
    severity: AlertSeverity
    message: string
    reasonHint: string
}

type AlertStateEntry = {
    lastEmittedAt: string
    severity: AlertSeverity
    source: 'trend' | 'conversion'
    message: string
}

type AlertState = {
    version: 1
    alerts: Record<string, AlertStateEntry>
}

type EmittedAlert = {
    id: string
    source: 'trend' | 'conversion'
    severity: AlertSeverity
    message: string
    reasonHint: string
    mode: 'critical_immediate' | 'cooldown_elapsed'
}

type SuppressedAlert = {
    id: string
    source: 'trend' | 'conversion'
    severity: AlertSeverity
    message: string
    reasonHint: string
    mode: 'cooldown_active'
    nextEligibleAt: string
    remainingMinutes: number
}

type AlertSummary = {
    generatedAt: string
    commitSha: string
    cooldownHours: number
    sources: {
        trendSummary: string | null
        conversionSummary: string | null
        stateFile: string
    }
    totals: {
        candidateCount: number
        emittedCount: number
        suppressedCount: number
    }
    emitted: EmittedAlert[]
    suppressed: SuppressedAlert[]
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

function readCommitSha(): string {
    const explicit = process.env.QUALITY_ALERT_COMMIT_SHA?.trim()
    if (explicit) {
        return explicit
    }

    try {
        return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim() || 'unknown'
    } catch {
        return 'unknown'
    }
}

function formatTimestampForPath(date: Date): string {
    return date
        .toISOString()
        .replace('T', '_')
        .replaceAll(':', '-')
        .replace(/\..+/, '')
}

function readCooldownHours(): number {
    const rawValue = process.env.QUALITY_ALERT_COOLDOWN_HOURS?.trim()
    if (!rawValue) {
        return 24
    }

    const parsed = Number(rawValue)
    if (!Number.isFinite(parsed)) {
        return 24
    }

    return Math.max(1, Math.min(168, Math.round(parsed)))
}

function readNow(): Date {
    const raw = process.env.QUALITY_ALERT_NOW?.trim()
    if (!raw) {
        return new Date()
    }

    const parsed = new Date(raw)
    if (Number.isNaN(parsed.getTime())) {
        return new Date()
    }

    return parsed
}

function parseAlertId(value: string | undefined, fallback: string): string {
    if (!value || value.trim().length === 0) {
        return fallback
    }
    const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_')
    return normalized.length > 0 ? normalized : fallback
}

function severityRank(severity: AlertSeverity): number {
    return severity === 'critical' ? 2 : 1
}

function mergeCandidates(candidates: AlertCandidate[]): AlertCandidate[] {
    const merged = new Map<string, AlertCandidate>()

    for (const candidate of candidates) {
        const existing = merged.get(candidate.id)
        if (!existing) {
            merged.set(candidate.id, candidate)
            continue
        }

        if (severityRank(candidate.severity) > severityRank(existing.severity)) {
            merged.set(candidate.id, candidate)
        }
    }

    return Array.from(merged.values()).sort((a, b) => {
        const rankDiff = severityRank(b.severity) - severityRank(a.severity)
        if (rankDiff !== 0) {
            return rankDiff
        }
        return a.id.localeCompare(b.id)
    })
}

function buildCandidates(trendSummary: TrendSummary | null, conversionSummary: ConversionSummary | null): AlertCandidate[] {
    const candidates: AlertCandidate[] = []

    if (trendSummary?.status === 'fail') {
        const findingCount = Array.isArray(trendSummary.findings) ? trendSummary.findings.length : 0
        candidates.push({
            id: 'trend_gate_fail',
            source: 'trend',
            severity: 'critical',
            message: `Trend gate status is FAIL (${findingCount} findings).`,
            reasonHint: 'Critical SEO/performance regressions are active. Prioritize immediate rollback or hotfix.',
        })
    } else if (trendSummary?.status === 'warmup') {
        candidates.push({
            id: 'trend_gate_warmup',
            source: 'trend',
            severity: 'warning',
            message: 'Trend gate remains in warmup mode.',
            reasonHint: 'Baseline depth is still growing; keep monitoring and avoid overreacting to single-run noise.',
        })
    }

    for (const anomaly of conversionSummary?.anomalies || []) {
        const severity: AlertSeverity = anomaly.severity === 'critical' ? 'critical' : 'warning'
        const anomalyId = parseAlertId(anomaly.id, 'unknown_conversion_anomaly')
        candidates.push({
            id: `conversion_${anomalyId}`,
            source: 'conversion',
            severity,
            message: anomaly.message || `Conversion anomaly detected (${anomalyId}).`,
            reasonHint: anomaly.reasonHint || 'Investigate conversion funnel telemetry and checkout reliability for this period.',
        })
    }

    return mergeCandidates(candidates)
}

async function loadState(filePath: string): Promise<AlertState> {
    const parsed = await readJsonIfExists<AlertState>(filePath)
    if (!parsed || parsed.version !== 1 || typeof parsed.alerts !== 'object' || parsed.alerts === null) {
        return { version: 1, alerts: {} }
    }
    return parsed
}

function formatAlertSeverity(severity: AlertSeverity): string {
    return severity === 'critical' ? 'CRITICAL' : 'WARNING'
}

function buildMarkdown(summary: AlertSummary, summaryPath: string): string {
    const lines: string[] = []
    lines.push('# Wave 6 Ops Alert Tuning Summary')
    lines.push('')
    lines.push(`Generated: ${summary.generatedAt}`)
    lines.push(`Commit: \`${summary.commitSha}\``)
    lines.push(`Cooldown: ${summary.cooldownHours}h`)
    lines.push(`Summary JSON: \`${toRelativePath(summaryPath)}\``)
    lines.push('')
    lines.push('## Totals')
    lines.push(`- Candidates: ${summary.totals.candidateCount}`)
    lines.push(`- Emitted: ${summary.totals.emittedCount}`)
    lines.push(`- Suppressed: ${summary.totals.suppressedCount}`)
    lines.push('')

    lines.push('## Emitted Alerts')
    if (summary.emitted.length === 0) {
        lines.push('- None')
    } else {
        for (const alert of summary.emitted) {
            lines.push(`- [${formatAlertSeverity(alert.severity)}] ${alert.id}: ${alert.message}`)
            lines.push(`  Reason hint: ${alert.reasonHint}`)
            lines.push(`  Mode: ${alert.mode}`)
        }
    }
    lines.push('')

    lines.push('## Suppressed Alerts')
    if (summary.suppressed.length === 0) {
        lines.push('- None')
    } else {
        for (const alert of summary.suppressed) {
            lines.push(`- [${formatAlertSeverity(alert.severity)}] ${alert.id}: ${alert.message}`)
            lines.push(`  Mode: ${alert.mode}, nextEligibleAt=${alert.nextEligibleAt}, remainingMinutes=${alert.remainingMinutes}`)
        }
    }

    return lines.join('\n')
}

async function main(): Promise<void> {
    const now = readNow()
    const commitSha = readCommitSha()
    const cooldownHours = readCooldownHours()
    const cooldownMs = cooldownHours * 60 * 60 * 1000
    const timestamp = formatTimestampForPath(now)

    const trendSummaryPath = process.env.QUALITY_ALERT_TREND_SUMMARY?.trim() || null
    const conversionSummaryPath = process.env.QUALITY_ALERT_CONVERSION_SUMMARY?.trim() || null
    const statePath = toAbsolutePath(
        process.env.QUALITY_ALERT_STATE_FILE || 'docs/reports/artifacts/wave6-alert-state/state.json',
    )
    const artifactDir = toAbsolutePath(
        process.env.QUALITY_ALERT_ARTIFACT_DIR || `docs/reports/artifacts/wave6-alerts-${timestamp}-${commitSha}`,
    )
    const summaryPath = path.join(artifactDir, 'summary.json')
    const reportPath = toAbsolutePath(
        process.env.QUALITY_ALERT_REPORT_FILE || `docs/reports/WAVE6_ALERTS_${timestamp}_${commitSha}.md`,
    )

    const trendSummary = await readJsonIfExists<TrendSummary>(trendSummaryPath || undefined)
    const conversionSummary = await readJsonIfExists<ConversionSummary>(conversionSummaryPath || undefined)
    const candidates = buildCandidates(trendSummary, conversionSummary)
    const state = await loadState(statePath)

    const emitted: EmittedAlert[] = []
    const suppressed: SuppressedAlert[] = []

    for (const candidate of candidates) {
        const stateEntry = state.alerts[candidate.id]

        if (candidate.severity === 'critical') {
            emitted.push({
                id: candidate.id,
                source: candidate.source,
                severity: candidate.severity,
                message: candidate.message,
                reasonHint: candidate.reasonHint,
                mode: 'critical_immediate',
            })
            state.alerts[candidate.id] = {
                lastEmittedAt: now.toISOString(),
                severity: candidate.severity,
                source: candidate.source,
                message: candidate.message,
            }
            continue
        }

        if (stateEntry) {
            const lastEmittedAt = new Date(stateEntry.lastEmittedAt)
            if (!Number.isNaN(lastEmittedAt.getTime())) {
                const elapsedMs = now.getTime() - lastEmittedAt.getTime()
                if (elapsedMs < cooldownMs) {
                    const remainingMs = Math.max(cooldownMs - elapsedMs, 0)
                    suppressed.push({
                        id: candidate.id,
                        source: candidate.source,
                        severity: candidate.severity,
                        message: candidate.message,
                        reasonHint: candidate.reasonHint,
                        mode: 'cooldown_active',
                        nextEligibleAt: new Date(lastEmittedAt.getTime() + cooldownMs).toISOString(),
                        remainingMinutes: Math.ceil(remainingMs / (60 * 1000)),
                    })
                    continue
                }
            }
        }

        emitted.push({
            id: candidate.id,
            source: candidate.source,
            severity: candidate.severity,
            message: candidate.message,
            reasonHint: candidate.reasonHint,
            mode: 'cooldown_elapsed',
        })
        state.alerts[candidate.id] = {
            lastEmittedAt: now.toISOString(),
            severity: candidate.severity,
            source: candidate.source,
            message: candidate.message,
        }
    }

    const summary: AlertSummary = {
        generatedAt: now.toISOString(),
        commitSha,
        cooldownHours,
        sources: {
            trendSummary: trendSummaryPath,
            conversionSummary: conversionSummaryPath,
            stateFile: toRelativePath(statePath),
        },
        totals: {
            candidateCount: candidates.length,
            emittedCount: emitted.length,
            suppressedCount: suppressed.length,
        },
        emitted,
        suppressed,
    }

    await mkdir(path.dirname(statePath), { recursive: true })
    await mkdir(path.dirname(summaryPath), { recursive: true })
    await mkdir(path.dirname(reportPath), { recursive: true })

    await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
    await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
    await writeFile(reportPath, `${buildMarkdown(summary, summaryPath)}\n`, 'utf8')

    console.log(`Ops alert summary: ${toRelativePath(summaryPath)}`)
    console.log(`Ops alert report: ${toRelativePath(reportPath)}`)
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
})
