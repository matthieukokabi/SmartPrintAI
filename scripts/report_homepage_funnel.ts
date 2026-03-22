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
        console.log(`${row.pageVariant}: views=${row.homepageViews}, toCreate=${row.toCreateClicks}, ctr=${formatRate(row.homepageToCreateCtr)}`)
    }

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
