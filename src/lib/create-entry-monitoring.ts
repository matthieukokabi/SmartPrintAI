import type { CreateEntryFunnelReport, CreateEntryDropoffStep } from '@/lib/create-entry-funnel-report'

export type CreateEntrySnapshot = {
    snapshotAt: string
    snapshotDate: string
    source: CreateEntryFunnelReport['source']
    totals: {
        createPageViews: number
        promptInputFocused: number
        promptStarted: number
        generationStarted: number
    }
    rates: {
        promptStartRateFromCreateView: number
        generationStartRateFromPromptStart: number
    }
    biggestEarlyDropoffStep: CreateEntryDropoffStep
    firstActionableFrictionPoint: CreateEntryDropoffStep
    status: CreateEntryFunnelReport['status']
    decision: CreateEntryFunnelReport['decision']
    readiness: {
        readyForOptimization: boolean
        readinessMessage: string
        blockers: string[]
    }
}

function toSnapshotDate(snapshotAt: string): string {
    return snapshotAt.slice(0, 10)
}

export function buildCreateEntrySnapshot(
    report: CreateEntryFunnelReport,
    snapshotAt: string = new Date().toISOString()
): CreateEntrySnapshot {
    return {
        snapshotAt,
        snapshotDate: toSnapshotDate(snapshotAt),
        source: report.source,
        totals: {
            createPageViews: report.totals.createPageViews,
            promptInputFocused: report.totals.promptInputFocused,
            promptStarted: report.totals.promptStarted,
            generationStarted: report.totals.generationStarted,
        },
        rates: {
            promptStartRateFromCreateView: report.rates.promptStartRateFromCreateView,
            generationStartRateFromPromptStart: report.rates.generationStartRateFromPromptStart,
        },
        biggestEarlyDropoffStep: report.dropoff.biggestEarlyDropoffStep,
        firstActionableFrictionPoint: report.firstActionableFrictionPoint,
        status: report.status,
        decision: report.decision,
        readiness: {
            readyForOptimization: report.readiness.readyForOptimization,
            readinessMessage: report.readiness.readinessMessage,
            blockers: report.readiness.blockers,
        },
    }
}

export function didCreateEntryBecomeReady(
    previousSnapshot: CreateEntrySnapshot | null | undefined,
    currentSnapshot: CreateEntrySnapshot
): boolean {
    return !previousSnapshot?.readiness.readyForOptimization && currentSnapshot.readiness.readyForOptimization
}
