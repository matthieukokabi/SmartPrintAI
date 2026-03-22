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

    printSection('Create Entry Stages')
    console.log(`Create page viewed: ${report.totals.createPageViews}`)
    console.log(`Entrypoint resolved: ${report.totals.entrypointResolved}`)
    console.log(`Prompt input focused: ${report.totals.promptInputFocused} (${formatRate(report.rates.promptInteractionRate)})`)
    console.log(`Prompt started: ${report.totals.promptStarted} (${formatRate(report.rates.promptStartedRate)})`)
    console.log(`Generation started: ${report.totals.generationStarted} (${formatRate(report.rates.generationStartRate)})`)
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
    console.log(`Next action: ${report.nextAction}`)

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
