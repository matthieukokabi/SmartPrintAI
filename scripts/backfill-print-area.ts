/**
 * Backfill Product.printArea from Printful's printfiles endpoint.
 *
 * Run:
 *   tsx scripts/backfill-print-area.ts --dry-run
 *   tsx scripts/backfill-print-area.ts --apply
 *
 * Idempotent. Skips products whose printArea.source is already 'printful-api'
 * AND fetchedAt < 30 days old.
 *
 * Skips Gooten/Gelato products (printfulId not numeric).
 */
import { prisma } from '../src/lib/prisma'
import { printful } from '../src/lib/printful'

const STALE_AFTER_DAYS = 30

type ExistingPrintArea = {
    width?: number
    height?: number
    dpi?: number
    placement?: string
    source?: string
    fetchedAt?: string
}

function parseExisting(value: unknown): ExistingPrintArea {
    if (typeof value === 'object' && value !== null) {
        return value as ExistingPrintArea
    }
    return {}
}

function isFresh(existing: ExistingPrintArea): boolean {
    if (existing.source !== 'printful-api') return false
    if (!existing.fetchedAt) return false
    const fetched = Date.parse(existing.fetchedAt)
    if (!Number.isFinite(fetched)) return false
    const ageMs = Date.now() - fetched
    return ageMs < STALE_AFTER_DAYS * 24 * 60 * 60 * 1000
}

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms))
}

async function getDimsWithRetry(numericId: number, maxAttempts = 4) {
    let attempt = 0
    while (true) {
        try {
            return await printful.getPrintfileDimensions(numericId)
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            const m = /after\s+(\d+)\s+seconds/i.exec(msg)
            if (msg.includes('429') && m && attempt < maxAttempts) {
                const waitSec = Math.min(Number(m[1]) + 2, 90)
                console.log(`  ... rate-limited, waiting ${waitSec}s`)
                await sleep(waitSec * 1000)
                attempt += 1
                continue
            }
            throw err
        }
    }
}

async function main() {
    const apply = process.argv.includes('--apply')
    const dryRun = !apply
    const onlyArg = process.argv.find((a) => a.startsWith('--only='))
    const onlyName = onlyArg ? onlyArg.split('=')[1].toLowerCase() : null

    console.log(`mode: ${dryRun ? 'DRY-RUN' : 'APPLY'}${onlyName ? ` (only=${onlyName})` : ''}`)
    console.log('')

    const products = await prisma.product.findMany({
        where: { active: true },
        select: { id: true, name: true, printfulId: true, printArea: true },
        orderBy: { name: 'asc' },
    })

    let processed = 0
    let willUpdate = 0
    let skippedFresh = 0
    let skippedNonPrintful = 0
    let errored = 0

    for (const product of products) {
        if (onlyName && !product.name.toLowerCase().includes(onlyName)) continue

        const numericId = Number(product.printfulId)
        if (!Number.isFinite(numericId) || numericId <= 0) {
            skippedNonPrintful += 1
            continue
        }

        const existing = parseExisting(product.printArea)
        if (isFresh(existing)) {
            skippedFresh += 1
            continue
        }

        try {
            const dims = await getDimsWithRetry(numericId)
            processed += 1
            const newArea = {
                dpi: dims.dpi,
                width: dims.width,
                height: dims.height,
                placement: dims.placement,
                source: 'printful-api',
                fetchedAt: new Date().toISOString(),
            }

            const oldDims = `${existing.width ?? '?'}x${existing.height ?? '?'} @${existing.dpi ?? '?'}`
            const newDims = `${dims.width}x${dims.height} @${dims.dpi}`
            const sameDims = existing.width === dims.width && existing.height === dims.height

            if (sameDims) {
                console.log(`= ${product.name.padEnd(40)} ${newDims}  (no change)`)
            } else {
                console.log(`* ${product.name.padEnd(40)} ${oldDims}  ->  ${newDims}`)
                willUpdate += 1
            }

            if (apply) {
                await prisma.product.update({
                    where: { id: product.id },
                    data: { printArea: newArea },
                })
            }

            // Light throttling between calls so we don't hit Printful's burst limit.
            await sleep(400)
        } catch (err) {
            errored += 1
            const msg = err instanceof Error ? err.message : String(err)
            console.log(`! ${product.name.padEnd(40)} ERROR: ${msg.slice(0, 120)}`)
        }
    }

    console.log('')
    console.log(`processed: ${processed} (errored: ${errored})`)
    console.log(`skipped fresh (<${STALE_AFTER_DAYS}d, source=printful-api): ${skippedFresh}`)
    console.log(`skipped non-printful: ${skippedNonPrintful}`)
    console.log(`${apply ? 'updated (changed)' : 'would update (changed)'}: ${willUpdate}`)

    await prisma.$disconnect()
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
