import { buildHomepageFunnelReport } from '../src/lib/homepage-funnel-report'

function formatProgress(current: number, required: number): string {
    const remaining = Math.max(0, required - current)
    return `${current}/${required}${remaining > 0 ? ` (need ${remaining} more)` : ' (met)'}`
}

async function main() {
    const report = await buildHomepageFunnelReport()
    const hero = report.heroExperiment

    console.log('SmartPrintAI Hero Experiment Readiness')
    console.log(`Source: ${report.source}`)
    console.log(`Generated at: ${report.generatedAt}`)
    console.log(`Status: ${hero.status}`)
    console.log(`Decision: ${hero.decision}`)
    console.log(`Winner candidate: ${hero.winnerCandidate || 'none'}`)
    console.log(`Ready for comparison: ${hero.readiness.readyForComparison ? 'yes' : 'no'}`)
    console.log(`Readiness message: ${hero.readiness.readinessMessage}`)

    console.log('')
    console.log('Threshold progress')
    for (const item of hero.readiness.progressItems) {
        console.log(`- ${item.label}: ${formatProgress(item.current, item.required)}`)
    }

    if (hero.readiness.blockers.length > 0) {
        console.log('')
        console.log('Still missing')
        for (const blocker of hero.readiness.blockers) {
            console.log(`- ${blocker}`)
        }
    }

    console.log('')
    console.log(`Next action: ${hero.nextAction}`)
    if (hero.readiness.readyForComparison) {
        console.log('ALERT: hero experiment ready for comparison')
    }
}

void main().catch((error) => {
    console.error('Failed to check hero experiment readiness')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
})
