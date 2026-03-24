import { appendFile, mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const MAX_RECENT_RECORDS = 250

export type SupportIntakeRecord = {
    requestId: string
    createdAt: string
    name: string
    email: string
    subject: string
    orderId: string | null
}

export function resolveSupportIntakeLogPath(): string {
    const configuredPath = process.env.SUPPORT_INTAKE_LOG_PATH
    if (configuredPath && configuredPath.trim().length > 0) {
        return path.resolve(configuredPath.trim())
    }
    return path.join(process.cwd(), 'data', 'support', 'requests.jsonl')
}

function safeParseRecord(line: string): SupportIntakeRecord | null {
    const trimmed = line.trim()
    if (!trimmed) return null

    try {
        const parsed = JSON.parse(trimmed) as Partial<SupportIntakeRecord>
        if (
            typeof parsed.requestId !== 'string'
            || typeof parsed.createdAt !== 'string'
            || typeof parsed.name !== 'string'
            || typeof parsed.email !== 'string'
            || typeof parsed.subject !== 'string'
            || (parsed.orderId !== null && typeof parsed.orderId !== 'string')
        ) {
            return null
        }

        return {
            requestId: parsed.requestId,
            createdAt: parsed.createdAt,
            name: parsed.name,
            email: parsed.email,
            subject: parsed.subject,
            orderId: parsed.orderId ?? null,
        }
    } catch {
        return null
    }
}

export async function appendSupportIntakeRecord(record: SupportIntakeRecord): Promise<void> {
    const filePath = resolveSupportIntakeLogPath()
    await mkdir(path.dirname(filePath), { recursive: true })
    await appendFile(filePath, `${JSON.stringify(record)}\n`, 'utf8')
}

export async function readRecentSupportIntakeRecords(limit = 25): Promise<SupportIntakeRecord[]> {
    const filePath = resolveSupportIntakeLogPath()
    try {
        const raw = await readFile(filePath, 'utf8')
        const parsed = raw
            .split('\n')
            .map((line) => safeParseRecord(line))
            .filter((record): record is SupportIntakeRecord => Boolean(record))

        const cappedLimit = Math.max(1, Math.min(limit, MAX_RECENT_RECORDS))
        return parsed.slice(-cappedLimit).reverse()
    } catch {
        return []
    }
}
