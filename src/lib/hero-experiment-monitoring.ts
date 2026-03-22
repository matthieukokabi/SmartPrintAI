import type { HomepageFunnelReport, HeroExperimentVariantKey } from '@/lib/homepage-funnel-report'

export type HeroExperimentSnapshotVariant = {
    pageVariant: HeroExperimentVariantKey
    homepageViews: number
    toCreateClicks: number
    createStarts: number
    homepageToCreateCtr: number
    createStartRate: number
    clickToCreateStartRate: number
}

export type HeroExperimentSnapshot = {
    snapshotAt: string
    snapshotDate: string
    source: HomepageFunnelReport['source']
    totalHomepageViews: number
    totalHomepageToCreateClicks: number
    totalCreateFlowStarts: number
    variants: HeroExperimentSnapshotVariant[]
    status: HomepageFunnelReport['heroExperiment']['status']
    decision: HomepageFunnelReport['heroExperiment']['decision']
    winnerCandidate: HomepageFunnelReport['heroExperiment']['winnerCandidate']
    readiness: {
        readyForComparison: boolean
        readinessMessage: string
        blockers: string[]
    }
}

function toSnapshotDate(snapshotAt: string): string {
    return snapshotAt.slice(0, 10)
}

export function buildHeroExperimentSnapshot(
    report: HomepageFunnelReport,
    snapshotAt: string = new Date().toISOString()
): HeroExperimentSnapshot {
    const variants = report.heroExperiment.variants.map((variant) => ({
        pageVariant: variant.pageVariant,
        homepageViews: variant.homepageViews,
        toCreateClicks: variant.toCreateClicks,
        createStarts: variant.createStarts,
        homepageToCreateCtr: variant.homepageToCreateCtr,
        createStartRate: variant.createStartRate,
        clickToCreateStartRate: variant.clickToCreateStartRate,
    }))

    return {
        snapshotAt,
        snapshotDate: toSnapshotDate(snapshotAt),
        source: report.source,
        totalHomepageViews: report.totals.homepageViews,
        totalHomepageToCreateClicks: report.totals.homepageToCreateClicks,
        totalCreateFlowStarts: report.totals.createFlowStarts,
        variants,
        status: report.heroExperiment.status,
        decision: report.heroExperiment.decision,
        winnerCandidate: report.heroExperiment.winnerCandidate,
        readiness: {
            readyForComparison: report.heroExperiment.readiness.readyForComparison,
            readinessMessage: report.heroExperiment.readiness.readinessMessage,
            blockers: report.heroExperiment.readiness.blockers,
        },
    }
}

export function didHeroExperimentBecomeReady(
    previousSnapshot: HeroExperimentSnapshot | null | undefined,
    currentSnapshot: HeroExperimentSnapshot
): boolean {
    return !previousSnapshot?.readiness.readyForComparison && currentSnapshot.readiness.readyForComparison
}
