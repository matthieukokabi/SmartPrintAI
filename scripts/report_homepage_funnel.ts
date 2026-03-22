import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { buildHomepageFunnelReport } from '../src/lib/homepage-funnel-report'

function formatRate(value: number): string {
    return `${value.toFixed(2)}%`
}

function printSection(title: string) {
    console.log('')
    console.log(title)
    console.log('-'.repeat(title.length))
}

async function main() {
    const report = await buildHomepageFunnelReport()

    console.log('SmartPrintAI Homepage Funnel Report')
    console.log(`Source: ${report.source}`)
    console.log(`Generated at: ${report.generatedAt}`)
    console.log(`Recorded events: ${report.recordCount}`)

    if (!report.hasData) {
        console.log('Note: no homepage funnel events found yet in the real event log.')
    }

    printSection('Core Funnel')
    console.log(`Homepage views: ${report.totals.homepageViews}`)
    console.log(`Homepage -> create clicks: ${report.totals.homepageToCreateClicks}`)
    console.log(`Create flow starts: ${report.totals.createFlowStarts}`)
    console.log(`Homepage -> create CTR: ${formatRate(report.rates.homepageToCreateCtr)}`)
    console.log(`Create start rate (from view): ${formatRate(report.rates.createStartRate)}`)
    console.log(`Click -> create start rate: ${formatRate(report.rates.clickToCreateStartRate)}`)

    printSection('Drop-off')
    console.log(`Before CTA click: ${report.dropoff.beforeCtaClickCount} (${formatRate(report.dropoff.beforeCtaClickRate)})`)
    console.log(`After CTA click (before create start): ${report.dropoff.afterCtaClickCount} (${formatRate(report.dropoff.afterCtaClickRate)})`)
    console.log(`Biggest drop-off step: ${report.dropoff.biggestDropoffStep}`)

    printSection('CTA Performance (to-create clicks)')
    for (const row of report.ctaBreakdown) {
        console.log(`${row.ctaLocation}: ${row.clicks} (${formatRate(row.shareOfToCreateClicks)})`)
    }
    console.log(`Underperforming primary CTA location: ${report.underperformingPrimaryCtaLocation || 'none'}`)

    printSection('Device Breakdown')
    for (const row of report.deviceBreakdown) {
        console.log(
            `${row.deviceType}: views=${row.homepageViews}, toCreate=${row.toCreateClicks}, createStarts=${row.createStarts}, ctr=${formatRate(row.homepageToCreateCtr)}`
        )
    }

    printSection('Page Variant Breakdown')
    for (const row of report.pageVariantBreakdown) {
        console.log(
            `${row.pageVariant}: views=${row.homepageViews}, toCreate=${row.toCreateClicks}, createStarts=${row.createStarts}, ctr=${formatRate(row.homepageToCreateCtr)}, createStartRate=${formatRate(row.createStartRate)}, clickToCreateStartRate=${formatRate(row.clickToCreateStartRate)}, biggestDropoff=${row.biggestDropoffStep}`
        )
    }

    printSection('Attribution Breakdown: utm_source')
    for (const row of report.attributionBreakdown.utmSource) {
        console.log(
            `${row.value}: views=${row.homepageViews}, toCreate=${row.toCreateClicks}, createStarts=${row.createStarts}, ctr=${formatRate(row.homepageToCreateCtr)}, createStartRate=${formatRate(row.createStartRate)}`
        )
    }

    printSection('Attribution Breakdown: utm_campaign')
    for (const row of report.attributionBreakdown.utmCampaign) {
        console.log(
            `${row.value}: views=${row.homepageViews}, toCreate=${row.toCreateClicks}, createStarts=${row.createStarts}, ctr=${formatRate(row.homepageToCreateCtr)}, createStartRate=${formatRate(row.createStartRate)}`
        )
    }

    printSection('Attribution Breakdown: referrer_domain')
    for (const row of report.attributionBreakdown.referrerDomain) {
        console.log(
            `${row.value}: views=${row.homepageViews}, toCreate=${row.toCreateClicks}, createStarts=${row.createStarts}, ctr=${formatRate(row.homepageToCreateCtr)}, createStartRate=${formatRate(row.createStartRate)}`
        )
    }

    printSection('Attribution Breakdown: device_type')
    for (const row of report.attributionBreakdown.deviceType) {
        console.log(
            `${row.value}: views=${row.homepageViews}, toCreate=${row.toCreateClicks}, createStarts=${row.createStarts}, ctr=${formatRate(row.homepageToCreateCtr)}, createStartRate=${formatRate(row.createStartRate)}`
        )
    }

    printSection('Hero Variant Performance by utm_source')
    for (const row of report.attributionBreakdown.heroVariantByUtmSource) {
        console.log(`${row.utmSource}:`)
        for (const variant of row.variants) {
            console.log(
                `  ${variant.pageVariant}: views=${variant.homepageViews}, toCreate=${variant.toCreateClicks}, createStarts=${variant.createStarts}, ctr=${formatRate(variant.homepageToCreateCtr)}, createStartRate=${formatRate(variant.createStartRate)}`
            )
        }
    }

    printSection('Product Proof Exposure Analysis')
    console.log(`Tracked users (with visitor_id): ${report.productProofExposure.linkage.trackedUsers}`)
    console.log(`Exposed users: ${report.productProofExposure.linkage.exposedUsers}`)
    console.log(`Not exposed users: ${report.productProofExposure.linkage.notExposedUsers}`)
    console.log(`Relevant events missing visitor_id: ${report.productProofExposure.linkage.missingVisitorIdEvents}`)

    const exposed = report.productProofExposure.groups.productProofExposed
    const notExposed = report.productProofExposure.groups.productProofNotExposed

    printSection('Product Proof Group: Exposed')
    console.log(`Users: ${exposed.totalUsers}`)
    console.log(`CTA clicks: ${exposed.ctaClicks}`)
    console.log(`Create starts: ${exposed.createStarts}`)
    console.log(`Homepage -> create CTR (user): ${formatRate(exposed.homepageToCreateCtr)}`)
    console.log(`Create start rate (user): ${formatRate(exposed.createStartRate)}`)
    console.log(`Click -> create-start rate (user): ${formatRate(exposed.clickToCreateStartRate)}`)

    printSection('Product Proof Group: Not Exposed')
    console.log(`Users: ${notExposed.totalUsers}`)
    console.log(`CTA clicks: ${notExposed.ctaClicks}`)
    console.log(`Create starts: ${notExposed.createStarts}`)
    console.log(`Homepage -> create CTR (user): ${formatRate(notExposed.homepageToCreateCtr)}`)
    console.log(`Create start rate (user): ${formatRate(notExposed.createStartRate)}`)
    console.log(`Click -> create-start rate (user): ${formatRate(notExposed.clickToCreateStartRate)}`)

    printSection('Product Proof Conversion Delta (Exposed - Not Exposed)')
    console.log(`CTR delta: ${formatRate(report.productProofExposure.delta.homepageToCreateCtrPctPoints)}`)
    console.log(`Create-start rate delta: ${formatRate(report.productProofExposure.delta.createStartRatePctPoints)}`)
    console.log(`Click->create-start delta: ${formatRate(report.productProofExposure.delta.clickToCreateStartRatePctPoints)}`)

    printSection('Product Proof Interpretation')
    console.log(`Status: ${report.productProofExposure.interpretation.status}`)
    console.log(`Summary: ${report.productProofExposure.interpretation.summary}`)

    printSection('Hero Experiment Readout')
    console.log(`Primary metric: ${report.heroExperiment.primaryMetric}`)
    console.log(`Secondary metric: ${report.heroExperiment.secondaryMetric}`)
    console.log(`Status: ${report.heroExperiment.status}`)
    console.log(`Decision: ${report.heroExperiment.decision}`)
    console.log(`Winner candidate: ${report.heroExperiment.winnerCandidate || 'none'}`)
    console.log(`Reason: ${report.heroExperiment.reason}`)
    console.log(`Next action: ${report.heroExperiment.nextAction}`)
    console.log(`Readiness message: ${report.heroExperiment.readiness.readinessMessage}`)

    printSection('Hero Experiment Thresholds')
    console.log(`minTotalHomepageViews: ${report.heroExperiment.thresholds.minTotalHomepageViews} (met=${report.heroExperiment.thresholdChecks.minTotalHomepageViews})`)
    console.log(`minHomepageViewsPerVariant: ${report.heroExperiment.thresholds.minHomepageViewsPerVariant} (met=${report.heroExperiment.thresholdChecks.minHomepageViewsPerVariant})`)
    console.log(`minToCreateClicksPerVariant: ${report.heroExperiment.thresholds.minToCreateClicksPerVariant} (met=${report.heroExperiment.thresholdChecks.minToCreateClicksPerVariant})`)
    console.log(`allThresholdsMet: ${report.heroExperiment.thresholdChecks.all}`)

    printSection('Hero Experiment Threshold Progress')
    for (const item of report.heroExperiment.readiness.progressItems) {
        const suffix = item.met ? 'met' : `need ${item.remaining} more`
        console.log(`${item.label}: ${item.current}/${item.required} (${suffix})`)
    }
    if (report.heroExperiment.readiness.blockers.length > 0) {
        console.log('Readiness blockers:')
        for (const blocker of report.heroExperiment.readiness.blockers) {
            console.log(`- ${blocker}`)
        }
    }

    printSection('Hero Experiment Sample')
    console.log(`Overall homepage views: ${report.heroExperiment.totals.homepageViewsOverall}`)
    console.log(`Experiment-eligible views (variant_a + variant_b): ${report.heroExperiment.totals.homepageViewsExperimentEligible}`)
    console.log(`Legacy/unknown variant views: ${report.heroExperiment.totals.legacyOrUnknownVariantViews}`)
    console.log(`Experiment-eligible to-create clicks: ${report.heroExperiment.totals.homepageToCreateClicksExperimentEligible}`)
    console.log(`Experiment-eligible create starts: ${report.heroExperiment.totals.createFlowStartsExperimentEligible}`)

    printSection('Hero Experiment Variant Metrics')
    for (const row of report.heroExperiment.variants) {
        console.log(
            `${row.pageVariant}: views=${row.homepageViews}, clicks=${row.toCreateClicks}, createStarts=${row.createStarts}, ctr=${formatRate(row.homepageToCreateCtr)}, createStartRate=${formatRate(row.createStartRate)}, clickToCreateStartRate=${formatRate(row.clickToCreateStartRate)}`
        )
    }

    printSection('Hero Experiment Comparison')
    console.log(`Leading variant (primary metric): ${report.heroExperiment.comparison.leadingVariant || 'none'}`)
    console.log(`Trailing variant (primary metric): ${report.heroExperiment.comparison.trailingVariant || 'none'}`)
    console.log(`CTR delta (variant_a - variant_b): ${formatRate(report.heroExperiment.comparison.ctrDeltaPctPoints)}`)
    console.log(`Create-start rate delta (variant_a - variant_b): ${formatRate(report.heroExperiment.comparison.createStartRateDeltaPctPoints)}`)
    console.log(`Click->create-start delta (variant_a - variant_b): ${formatRate(report.heroExperiment.comparison.clickToCreateStartRateDeltaPctPoints)}`)

    const artifactDir = path.join(process.cwd(), 'docs', 'reports', 'artifacts', 'homepage-funnel')
    await mkdir(artifactDir, { recursive: true })
    const artifactPath = path.join(artifactDir, 'latest.json')
    await writeFile(artifactPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    console.log('')
    console.log(`Saved artifact: ${path.relative(process.cwd(), artifactPath).split(path.sep).join('/')}`)
}

void main().catch((error) => {
    console.error('Failed to build homepage funnel report')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
})
