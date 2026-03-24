import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  appendSupportIntakeRecord,
  readRecentSupportIntakeRecords,
  resolveSupportIntakeLogPath,
} from '@/lib/support-intake-log'

const ORIGINAL_SUPPORT_LOG_PATH = process.env.SUPPORT_INTAKE_LOG_PATH

afterEach(() => {
  if (ORIGINAL_SUPPORT_LOG_PATH === undefined) {
    delete process.env.SUPPORT_INTAKE_LOG_PATH
  } else {
    process.env.SUPPORT_INTAKE_LOG_PATH = ORIGINAL_SUPPORT_LOG_PATH
  }
})

describe('support intake log', () => {
  it('resolves default and configured log paths', () => {
    delete process.env.SUPPORT_INTAKE_LOG_PATH
    expect(resolveSupportIntakeLogPath()).toContain(path.join('data', 'support', 'requests.jsonl'))

    process.env.SUPPORT_INTAKE_LOG_PATH = '/tmp/smartprintai/support.jsonl'
    expect(resolveSupportIntakeLogPath()).toBe('/tmp/smartprintai/support.jsonl')
  })

  it('appends and reads most recent support submissions', async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), 'spai-support-'))
    const logPath = path.join(tempDir, 'requests.jsonl')
    process.env.SUPPORT_INTAKE_LOG_PATH = logPath

    await appendSupportIntakeRecord({
      requestId: 'req-1',
      createdAt: '2026-03-24T10:00:00.000Z',
      name: 'Owner',
      email: 'owner@example.com',
      subject: 'first',
      orderId: null,
    })
    await appendSupportIntakeRecord({
      requestId: 'req-2',
      createdAt: '2026-03-24T10:01:00.000Z',
      name: 'Owner',
      email: 'owner@example.com',
      subject: 'second',
      orderId: 'ord_1',
    })

    const records = await readRecentSupportIntakeRecords(1)
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      requestId: 'req-2',
      subject: 'second',
      orderId: 'ord_1',
    })

    const raw = await readFile(logPath, 'utf8')
    expect(raw.split('\n').filter(Boolean)).toHaveLength(2)
  })

  it('ignores malformed rows when reading records', async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), 'spai-support-'))
    const logPath = path.join(tempDir, 'requests.jsonl')
    process.env.SUPPORT_INTAKE_LOG_PATH = logPath

    await writeFile(
      logPath,
      [
        JSON.stringify({
          requestId: 'req-good',
          createdAt: '2026-03-24T10:00:00.000Z',
          name: 'Owner',
          email: 'owner@example.com',
          subject: 'good',
          orderId: null,
        }),
        '{not-json',
        JSON.stringify({
          requestId: 'req-bad',
          createdAt: '2026-03-24T10:00:00.000Z',
          email: 'owner@example.com',
          subject: 'missing-name',
          orderId: null,
        }),
      ].join('\n'),
      'utf8'
    )

    const records = await readRecentSupportIntakeRecords(10)
    expect(records).toHaveLength(1)
    expect(records[0].requestId).toBe('req-good')
  })
})
