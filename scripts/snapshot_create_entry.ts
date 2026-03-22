import { appendFile, mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { buildCreateEntryFunnelReport } from '../src/lib/create-entry-funnel-report'
import {
    buildCreateEntrySnapshot,
    didCreateEntryBecomeReady,
    type CreateEntrySnapshot,
} from '../src/lib/create-entry-monitoring'

function toSnapshotPath(): string {
    const defaultPath = path.join(process.cwd(), 'data', 'analytics', 'create-entry-funnel-snapshots.jsonl')
    const raw = process.env.CREATE_ENTRY_FUNNEL_SNAPSHOT_PATH || defaultPath
    return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw)
}

async function readLatestSnapshot(snapshotPath: string): Promise<CreateEntrySnapshot | null> {
    try {
        const raw = await readFile(snapshotPath, 'utf8')
        const lines = raw
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0)

        for (let index = lines.length - 1; index >= 0; index -= 1) {
            const line = lines[index]
            try {
                const parsed = JSON.parse(line) as CreateEntrySnapshot
                if (parsed && typeof parsed.snapshotAt === 'string') {
                    return parsed
                }
            } catch {
                // continue scanning backwards for a valid row
            }
        }

        return null
    } catch {
        return null
    }
}

async function main() {
    const report = await buildCreateEntryFunnelReport()
    const snapshotPath = toSnapshotPath()
    const previousSnapshot = await readLatestSnapshot(snapshotPath)
    const snapshot = buildCreateEntrySnapshot(report)

    await mkdir(path.dirname(snapshotPath), { recursive: true })
    await appendFile(snapshotPath, `${JSON.stringify(snapshot)}\n`, 'utf8')

    console.log('SmartPrintAI Create Entry Snapshot')
    console.log(`Snapshot timestamp: ${snapshot.snapshotAt}`)
    console.log(`Snapshot date: ${snapshot.snapshotDate}`)
    console.log(`Source: ${snapshot.source}`)
    console.log(`Status: ${snapshot.status}`)
    console.log(`Decision: ${snapshot.decision}`)
    console.log(`Biggest early drop-off: ${snapshot.biggestEarlyDropoffStep}`)
    console.log(`First actionable friction point: ${snapshot.firstActionableFrictionPoint}`)
    console.log(`Readiness: ${snapshot.readiness.readyForOptimization ? 'ready_for_optimization' : 'not_ready'}`)
    if (snapshot.readiness.blockers.length > 0) {
        console.log('Remaining blockers:')
        for (const blocker of snapshot.readiness.blockers) {
            console.log(`- ${blocker}`)
        }
    }
    if (didCreateEntryBecomeReady(previousSnapshot, snapshot)) {
        console.log('ALERT: create entry funnel ready for measured optimization')
    }
    console.log(`Snapshot log: ${path.relative(process.cwd(), snapshotPath).split(path.sep).join('/')}`)
}

void main().catch((error) => {
    console.error('Failed to snapshot create entry funnel')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
})
