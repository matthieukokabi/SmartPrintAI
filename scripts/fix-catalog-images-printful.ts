/**
 * One-shot fix for 5 Printful catalog products whose imageUrl points at
 * the legacy /o/products/<id>/product_*.jpg (300x300) thumbnail. Pick
 * the first variant image that's >=500x500 and UPDATE the row.
 *
 * Run:
 *   node --env-file=.env.local --import tsx scripts/fix-catalog-images-printful.ts --dry-run
 *   node --env-file=.env.local --import tsx scripts/fix-catalog-images-printful.ts --apply
 *
 * Idempotent via WHERE imageUrl = <oldUrl> guard.
 */
import { prisma } from '../src/lib/prisma'
import * as https from 'https'
import { URL as NodeURL } from 'url'

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY
const PRINTFUL_STORE_ID = process.env.PRINTFUL_STORE_ID
if (!PRINTFUL_API_KEY) {
    console.error('PRINTFUL_API_KEY missing from env')
    process.exit(1)
}

const TARGETS: Array<{ dbId: string; printfulId: number }> = [
    { dbId: 'cmnvmcah8001raml2m5xtne1n', printfulId: 214 },
    { dbId: 'cmnvmcasb001saml2tys8wm9p', printfulId: 215 },
    { dbId: 'cmmhtq8y7000f43l2dvac3xqo', printfulId: 458 },
    { dbId: 'cmmhtq8cy000d43l21rnb6iph', printfulId: 83 },
    { dbId: 'cmmhtq8nq000e43l253jfkcrf', printfulId: 89 },
]

type Dim = { w: number; h: number }

function probeDims(url: string): Promise<Dim | null> {
    return new Promise((resolve) => {
        try {
            const u = new NodeURL(url)
            const req = https.get(
                {
                    host: u.hostname,
                    path: u.pathname + u.search,
                    headers: { Range: 'bytes=0-65535', 'User-Agent': 'spai-fix/1.0' },
                    timeout: 8000,
                },
                (res) => {
                    const chunks: Buffer[] = []
                    res.on('data', (c: Buffer) => chunks.push(c))
                    res.on('end', () => {
                        const data = Buffer.concat(chunks)
                        // PNG
                        if (data.length >= 24 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
                            const w = data.readUInt32BE(16)
                            const h = data.readUInt32BE(20)
                            resolve({ w, h })
                            return
                        }
                        // JPEG
                        if (data.length >= 4 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
                            let i = 2
                            while (i < data.length - 9) {
                                if (data[i] !== 0xff) { i++; continue }
                                const m = data[i + 1]
                                if (m === 0xc0 || m === 0xc2) {
                                    const h = data.readUInt16BE(i + 5)
                                    const w = data.readUInt16BE(i + 7)
                                    resolve({ w, h })
                                    return
                                }
                                if (m === 0xd8 || m === 0xd9) { i += 2; continue }
                                if (m >= 0xd0 && m <= 0xd7) { i += 2; continue }
                                if (i + 4 > data.length) break
                                const seglen = data.readUInt16BE(i + 2)
                                i += 2 + seglen
                            }
                        }
                        resolve(null)
                    })
                },
            )
            req.on('error', () => resolve(null))
            req.on('timeout', () => { req.destroy(); resolve(null) })
        } catch {
            resolve(null)
        }
    })
}

async function fetchVariants(printfulId: number): Promise<Array<Record<string, unknown>>> {
    const res = await fetch(
        `https://api.printful.com/v2/catalog-products/${printfulId}/catalog-variants?limit=10`,
        {
            headers: {
                Authorization: `Bearer ${PRINTFUL_API_KEY}`,
                ...(PRINTFUL_STORE_ID ? { 'X-PF-Store-Id': PRINTFUL_STORE_ID } : {}),
            },
        },
    )
    if (!res.ok) {
        throw new Error(`v2 catalog-variants ${printfulId}: ${res.status}`)
    }
    const json = (await res.json()) as { data?: Array<Record<string, unknown>> }
    return Array.isArray(json.data) ? json.data : []
}

async function pickVariantImage(printfulId: number): Promise<{ url: string; dim: Dim } | null> {
    const variants = await fetchVariants(printfulId)
    for (const variant of variants) {
        for (const key of ['image', 'preview_url', 'image_url']) {
            const url = (variant as Record<string, unknown>)[key]
            if (typeof url !== 'string' || !url) continue
            const dim = await probeDims(url)
            if (dim && Math.min(dim.w, dim.h) >= 500) {
                return { url, dim }
            }
        }
    }
    return null
}

async function main() {
    const apply = process.argv.includes('--apply')
    const dryRun = !apply

    console.log(`mode: ${dryRun ? 'DRY-RUN' : 'APPLY'}`)
    console.log('')

    const plan: Array<{
        dbId: string
        name: string
        oldUrl: string
        oldDim: Dim | null
        newUrl: string
        newDim: Dim
    }> = []
    const failures: Array<{ dbId: string; printfulId: number; reason: string }> = []

    for (const target of TARGETS) {
        const row = await prisma.product.findUnique({
            where: { id: target.dbId },
            select: { id: true, name: true, imageUrl: true },
        })
        if (!row) {
            failures.push({ ...target, reason: 'row_missing' })
            continue
        }
        const oldDim = await probeDims(row.imageUrl)
        const candidate = await pickVariantImage(target.printfulId)
        if (!candidate) {
            failures.push({ ...target, reason: 'no_variant_image_>=500' })
            continue
        }
        plan.push({
            dbId: row.id,
            name: row.name,
            oldUrl: row.imageUrl,
            oldDim,
            newUrl: candidate.url,
            newDim: candidate.dim,
        })
    }

    console.log('Plan:')
    for (const p of plan) {
        const od = p.oldDim ? `${p.oldDim.w}x${p.oldDim.h}` : '?'
        const nd = `${p.newDim.w}x${p.newDim.h}`
        console.log(`  ${p.dbId} ${p.name}`)
        console.log(`    OLD ${od.padEnd(9)} ${p.oldUrl}`)
        console.log(`    NEW ${nd.padEnd(9)} ${p.newUrl}`)
    }
    if (failures.length) {
        console.log('')
        console.log('Failures (NOT in plan):')
        for (const f of failures) {
            console.log(`  ${f.dbId} printfulId=${f.printfulId}: ${f.reason}`)
        }
    }

    if (dryRun) {
        console.log('')
        console.log(`(dry-run) would update ${plan.length} rows; ${failures.length} failures`)
        await prisma.$disconnect()
        return
    }

    if (failures.length) {
        console.error('Aborting --apply because some targets failed dim check.')
        await prisma.$disconnect()
        process.exit(1)
    }

    let updated = 0
    for (const p of plan) {
        const r = await prisma.product.updateMany({
            where: { id: p.dbId, imageUrl: p.oldUrl },
            data: { imageUrl: p.newUrl },
        })
        updated += r.count
        console.log(`  updated ${r.count} row for ${p.dbId}`)
    }
    console.log('')
    console.log(`applied: ${updated} rows`)
    await prisma.$disconnect()
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
