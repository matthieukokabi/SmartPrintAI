import { buildCreateEntryFunnelReport } from '../src/lib/create-entry-funnel-report'

function formatProgress(current: number, required: number): string {
    const remaining = Math.max(0, required - current)
    return `${current}/${required}${remaining > 0 ? ` (need ${remaining} more)` : ' (met)'}`
}

async function main() {
    const report = await buildCreateEntryFunnelReport()

    console.log('SmartPrintAI Create Entry Readiness')
    console.log(`Source: ${report.source}`)
    console.log(`Generated at: ${report.generatedAt}`)
    console.log(`Primary metric: ${report.primaryMetric}`)
    console.log(`Secondary metric: ${report.secondaryMetric}`)
    console.log(`Status: ${report.status}`)
    console.log(`Decision: ${report.decision}`)
    console.log(`First friction point: ${report.firstFrictionPoint}`)
    console.log(`First actionable friction point: ${report.firstActionableFrictionPoint}`)
    console.log(`Readiness message: ${report.readiness.readinessMessage}`)

    console.log('')
    console.log('Threshold progress')
    for (const item of report.readiness.progressItems) {
        console.log(`- ${item.label}: ${formatProgress(item.current, item.required)}`)
    }

    if (report.readiness.blockers.length > 0) {
        console.log('')
        console.log('Still missing')
        for (const blocker of report.readiness.blockers) {
            console.log(`- ${blocker}`)
        }
    }

    console.log('')
    console.log(`Next action: ${report.nextAction}`)
    if (report.status === 'friction_candidate' && report.decision === 'optimize_first_friction_point') {
        console.log(`ALERT: create entry ready to optimize ${report.firstActionableFrictionPoint}`)
    }
}

void main().catch((error) => {
    console.error('Failed to check create entry readiness')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
})
