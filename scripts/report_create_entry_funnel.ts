import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { buildCreateEntryFunnelReport } from '../src/lib/create-entry-funnel-report'

function formatRate(value: number): string {
    return `${value.toFixed(2)}%`
}

function printSection(title: string) {
    console.log('')
    console.log(title)
    console.log('-'.repeat(title.length))
}

async function main() {
    const report = await buildCreateEntryFunnelReport()

    console.log('SmartPrintAI Create Entry Funnel Report')
    console.log(`Source: ${report.source}`)
    console.log(`Generated at: ${report.generatedAt}`)
    console.log(`Recorded events (all funnel): ${report.recordCount}`)
    console.log(`Recorded events (create entry): ${report.createRecordCount}`)

    if (!report.hasData) {
        console.log('Note: no create-entry funnel events found yet in the real event log.')
    }

    printSection('Create Entry Decision')
    console.log(`Primary metric: ${report.primaryMetric}`)
    console.log(`Secondary metric: ${report.secondaryMetric}`)
    console.log(`Status: ${report.status}`)
    console.log(`Decision: ${report.decision}`)
    console.log(`First friction point: ${report.firstFrictionPoint}`)
    console.log(`First actionable friction point: ${report.firstActionableFrictionPoint}`)
    console.log(`Reason: ${report.reason}`)
    console.log(`Readiness message: ${report.readiness.readinessMessage}`)
    console.log(`Next action: ${report.nextAction}`)

    printSection('Create Entry Thresholds')
    console.log(`minCreatePageViewed: ${report.thresholds.minCreatePageViewed} (met=${report.thresholdChecks.minCreatePageViewed})`)
    console.log(`minPromptInputFocused: ${report.thresholds.minPromptInputFocused} (met=${report.thresholdChecks.minPromptInputFocused})`)
    console.log(`minPromptStarted: ${report.thresholds.minPromptStarted} (met=${report.thresholdChecks.minPromptStarted})`)
    console.log(`minGenerationStarted: ${report.thresholds.minGenerationStarted} (met=${report.thresholdChecks.minGenerationStarted})`)
    console.log(`allThresholdsMet: ${report.thresholdChecks.all}`)
    console.log(`minActionableDropoffRatePct: ${report.thresholds.minActionableDropoffRatePct}`)

    printSection('Create Entry Threshold Progress')
    for (const item of report.readiness.progressItems) {
        const suffix = item.met ? 'met' : `need ${item.remaining} more`
        console.log(`${item.label}: ${item.current}/${item.required} (${suffix})`)
    }
    if (report.readiness.blockers.length > 0) {
        console.log('Readiness blockers:')
        for (const blocker of report.readiness.blockers) {
            console.log(`- ${blocker}`)
        }
    }

    printSection('Create Entry Stages')
    console.log(`Create page viewed: ${report.totals.createPageViews}`)
    console.log(`Entrypoint resolved: ${report.totals.entrypointResolved}`)
    console.log(`Prompt input focused: ${report.totals.promptInputFocused} (${formatRate(report.rates.promptInteractionRate)})`)
    console.log(`Prompt started: ${report.totals.promptStarted} (${formatRate(report.rates.promptStartRateFromCreateView)} from create views)`)
    console.log(`Generation started: ${report.totals.generationStarted} (${formatRate(report.rates.generationStartRateFromCreateView)} from create views, ${formatRate(report.rates.generationStartRateFromPromptStart)} from prompt starts)`)
    console.log(`Template selected: ${report.totals.templateSelected} (${formatRate(report.rates.templateSelectionRate)})`)
    console.log(`Product selected: ${report.totals.productSelected} (${formatRate(report.rates.productSelectionRateFromGeneration)} from generation starts)`)
    console.log(`Early abandoned: ${report.totals.abandonedEarly} (${formatRate(report.rates.earlyAbandonmentRate)})`)

    printSection('Early Drop-off')
    for (const row of report.dropoff.stageRows) {
        console.log(
            `${row.step}: from=${row.fromCount}, to=${row.toCount}, dropoff=${row.dropoffCount} (${formatRate(row.dropoffRate)})`
        )
    }
    console.log(`Biggest early drop-off: ${report.dropoff.biggestEarlyDropoffStep}`)

    printSection('Entrypoint Breakdown')
    for (const row of report.entrypointBreakdown) {
        console.log(`${row.value}: ${row.count} (${formatRate(row.share)})`)
    }

    printSection('Homepage Variant Breakdown (on /create)')
    for (const row of report.homepageVariantBreakdown) {
        console.log(`${row.value}: ${row.count} (${formatRate(row.share)})`)
    }

    printSection('Prompt Length Breakdown')
    for (const row of report.promptLengthBreakdown) {
        console.log(`${row.value}: ${row.count} (${formatRate(row.share)})`)
    }

    printSection('Create Attribution Breakdown: utm_source')
    for (const row of report.attributionBreakdown.utmSource) {
        console.log(
            `${row.value}: createViews=${row.createPageViews}, promptStarted=${row.promptStarted}, generationStarted=${row.generationStarted}, promptStartRate=${formatRate(row.promptStartRateFromCreateView)}, generationStartRate=${formatRate(row.generationStartRateFromCreateView)}`
        )
    }

    printSection('Create Attribution Breakdown: utm_campaign')
    for (const row of report.attributionBreakdown.utmCampaign) {
        console.log(
            `${row.value}: createViews=${row.createPageViews}, promptStarted=${row.promptStarted}, generationStarted=${row.generationStarted}, promptStartRate=${formatRate(row.promptStartRateFromCreateView)}, generationStartRate=${formatRate(row.generationStartRateFromCreateView)}`
        )
    }

    printSection('Create Attribution Breakdown: referrer_domain')
    for (const row of report.attributionBreakdown.referrerDomain) {
        console.log(
            `${row.value}: createViews=${row.createPageViews}, promptStarted=${row.promptStarted}, generationStarted=${row.generationStarted}, promptStartRate=${formatRate(row.promptStartRateFromCreateView)}, generationStartRate=${formatRate(row.generationStartRateFromCreateView)}`
        )
    }

    printSection('Create Attribution Breakdown: device_type')
    for (const row of report.attributionBreakdown.deviceType) {
        console.log(
            `${row.value}: createViews=${row.createPageViews}, promptStarted=${row.promptStarted}, generationStarted=${row.generationStarted}, promptStartRate=${formatRate(row.promptStartRateFromCreateView)}, generationStartRate=${formatRate(row.generationStartRateFromCreateView)}`
        )
    }

    const artifactDir = path.join(process.cwd(), 'docs', 'reports', 'artifacts', 'create-entry-funnel')
    await mkdir(artifactDir, { recursive: true })
    const artifactPath = path.join(artifactDir, 'latest.json')
    await writeFile(artifactPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    console.log('')
    console.log(`Saved artifact: ${path.relative(process.cwd(), artifactPath).split(path.sep).join('/')}`)
}

void main().catch((error) => {
    console.error('Failed to build create entry funnel report')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
})
