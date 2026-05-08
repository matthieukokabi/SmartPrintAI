/**
 * One-shot fix for 2 Gooten products whose imageUrl points at the
 * /temp/ mockup-generator output (~395x500 / 442x500). Replace with
 * the catalog-feed preview URL (612x612, validated >=500x500).
 *
 * Run:
 *   node --env-file=.env.local --import tsx scripts/fix-catalog-images-gooten.ts --dry-run
 *   node --env-file=.env.local --import tsx scripts/fix-catalog-images-gooten.ts --apply
 *
 * Idempotent via WHERE imageUrl = <oldUrl> guard.
 */
import { prisma } from '../src/lib/prisma'
import * as https from 'https'
import { URL as NodeURL } from 'url'

const FEED_URL = 'https://gtnadminassets.blob.core.windows.net/productdatav3/catalog.json'

const TARGETS: Array<{ dbId: string; gootenProductId: number }> = [
    { dbId: 'cmmtjnpmj0007qwl2x9er74zl', gootenProductId: 244 }, // Hoodies (Zip-up)
    { dbId: 'cmmtjn6ue0005qwl2h2dp3vae', gootenProductId: 85 },  // Hoodies (No-Zip/Pullover)
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
                        if (data.length >= 24 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
                            resolve({ w: data.readUInt32BE(16), h: data.readUInt32BE(20) })
                            return
                        }
                        if (data.length >= 4 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
                            let i = 2
                            while (i < data.length - 9) {
                                if (data[i] !== 0xff) { i++; continue }
                                const m = data[i + 1]
                                if (m === 0xc0 || m === 0xc2) {
                                    resolve({ w: data.readUInt16BE(i + 7), h: data.readUInt16BE(i + 5) })
                                    return
                                }
                                if (m === 0xd8 || m === 0xd9 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue }
                                if (i + 4 > data.length) break
                                i += 2 + data.readUInt16BE(i + 2)
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

function flat(items: unknown[]): unknown[] {
    const out: unknown[] = []
    for (const item of items) {
        if (item && typeof item === 'object') {
            out.push(item)
            for (const v of Object.values(item as Record<string, unknown>)) {
                if (Array.isArray(v)) out.push(...flat(v))
            }
        }
    }
    return out
}

async function fetchCatalogUrl(productId: number): Promise<string | null> {
    const res = await fetch(FEED_URL)
    if (!res.ok) throw new Error(`feed ${res.status}`)
    const json = await res.json() as Record<string, unknown>
    const seed: unknown[] = Array.isArray(json['product-catalog'])
        ? json['product-catalog'] as unknown[]
        : Object.values(json)
    const products = flat(seed)
    for (const p of products) {
        if (!p || typeof p !== 'object') continue
        const o = p as Record<string, unknown>
        if (Number(o.product_id) !== productId) continue
        const url = o.url
        if (typeof url === 'string' && url.startsWith('http')) return url
    }
    return null
}

async function main() {
    const apply = process.argv.includes('--apply')
    const dryRun = !apply

    console.log(`mode: ${dryRun ? 'DRY-RUN' : 'APPLY'}`)
    console.log('')

    const plan: Array<{ dbId: string; name: string; oldUrl: string; oldDim: Dim | null; newUrl: string; newDim: Dim }> = []
    const failures: Array<{ dbId: string; reason: string }> = []

    for (const target of TARGETS) {
        const row = await prisma.product.findUnique({
            where: { id: target.dbId },
            select: { id: true, name: true, imageUrl: true, active: true },
        })
        if (!row) {
            failures.push({ dbId: target.dbId, reason: 'row_missing' }); continue
        }
        const oldDim = await probeDims(row.imageUrl)
        const candidateUrl = await fetchCatalogUrl(target.gootenProductId)
        if (!candidateUrl) {
            failures.push({ dbId: target.dbId, reason: 'no_catalog_url' }); continue
        }
        const newDim = await probeDims(candidateUrl)
        if (!newDim || Math.min(newDim.w, newDim.h) < 500) {
            failures.push({ dbId: target.dbId, reason: `candidate_dims_${newDim ? newDim.w + 'x' + newDim.h : 'unknown'}` }); continue
        }
        plan.push({ dbId: row.id, name: row.name, oldUrl: row.imageUrl, oldDim, newUrl: candidateUrl, newDim })
    }

    console.log('Plan:')
    for (const p of plan) {
        const od = p.oldDim ? `${p.oldDim.w}x${p.oldDim.h}` : '?'
        console.log(`  ${p.dbId} ${p.name}`)
        console.log(`    OLD ${od.padEnd(9)} ${p.oldUrl}`)
        console.log(`    NEW ${p.newDim.w}x${p.newDim.h}     ${p.newUrl}`)
    }
    if (failures.length) {
        console.log('')
        console.log('Failures (NOT in plan):')
        for (const f of failures) console.log(`  ${f.dbId}: ${f.reason}`)
    }

    if (dryRun) {
        console.log('')
        console.log(`(dry-run) would update ${plan.length} rows; ${failures.length} failures`)
        await prisma.$disconnect()
        return
    }

    if (failures.length) {
        console.error('Aborting --apply because some targets failed.')
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

main().catch((err) => { console.error(err); process.exit(1) })
