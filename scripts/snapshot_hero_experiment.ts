import { appendFile, mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { buildHomepageFunnelReport } from '../src/lib/homepage-funnel-report'
import {
    buildHeroExperimentSnapshot,
    didHeroExperimentBecomeReady,
    type HeroExperimentSnapshot,
} from '../src/lib/hero-experiment-monitoring'

function toSnapshotPath(): string {
    const defaultPath = path.join(process.cwd(), 'data', 'analytics', 'homepage-hero-experiment-snapshots.jsonl')
    const raw = process.env.HOMEPAGE_HERO_EXPERIMENT_SNAPSHOT_PATH || defaultPath
    return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw)
}

async function readLatestSnapshot(snapshotPath: string): Promise<HeroExperimentSnapshot | null> {
    try {
        const raw = await readFile(snapshotPath, 'utf8')
        const lines = raw
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0)

        for (let index = lines.length - 1; index >= 0; index -= 1) {
            const line = lines[index]
            try {
                const parsed = JSON.parse(line) as HeroExperimentSnapshot
                if (parsed && typeof parsed.snapshotAt === 'string') {
                    return parsed
                }
            } catch {
                // keep scanning backward for the last valid row
            }
        }
        return null
    } catch {
        return null
    }
}

async function main() {
    const report = await buildHomepageFunnelReport()
    const snapshotPath = toSnapshotPath()
    const previousSnapshot = await readLatestSnapshot(snapshotPath)
    const snapshot = buildHeroExperimentSnapshot(report)

    await mkdir(path.dirname(snapshotPath), { recursive: true })
    await appendFile(snapshotPath, `${JSON.stringify(snapshot)}\n`, 'utf8')

    console.log('SmartPrintAI Hero Experiment Snapshot')
    console.log(`Snapshot timestamp: ${snapshot.snapshotAt}`)
    console.log(`Snapshot date: ${snapshot.snapshotDate}`)
    console.log(`Source: ${snapshot.source}`)
    console.log(`Status: ${snapshot.status}`)
    console.log(`Decision: ${snapshot.decision}`)
    console.log(`Winner candidate: ${snapshot.winnerCandidate || 'none'}`)
    console.log(`Readiness: ${snapshot.readiness.readyForComparison ? 'ready_for_comparison' : 'not_ready'}`)
    if (snapshot.readiness.blockers.length > 0) {
        console.log('Remaining blockers:')
        for (const blocker of snapshot.readiness.blockers) {
            console.log(`- ${blocker}`)
        }
    }
    if (didHeroExperimentBecomeReady(previousSnapshot, snapshot)) {
        console.log('ALERT: hero experiment ready for comparison')
    }
    console.log(`Snapshot log: ${path.relative(process.cwd(), snapshotPath).split(path.sep).join('/')}`)
}

void main().catch((error) => {
    console.error('Failed to snapshot hero experiment')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
})
