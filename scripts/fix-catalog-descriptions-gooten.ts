/**
 * Backfill 26 Gooten product descriptions to clear MC's >=150 char
 * threshold. Hybrid strategy:
 *   1. Pull Gooten's catalog feed and read each product's
 *      meta_description (rich product-specific marketing copy).
 *   2. If meta_description >= 150 chars, append a 30-day return
 *      note (so the policy promise lands in the description) and
 *      use that.
 *   3. Else fall back to a category-keyed template that always
 *      clears the threshold.
 *
 * Run:
 *   node --env-file=.env.local --import tsx scripts/fix-catalog-descriptions-gooten.ts --dry-run
 *   node --env-file=.env.local --import tsx scripts/fix-catalog-descriptions-gooten.ts --apply
 *
 * Idempotent: WHERE LENGTH(description) < 150 prevents overwriting
 * any row another process has since populated.
 */
import { prisma } from '../src/lib/prisma'

const FEED_URL = 'https://gtnadminassets.blob.core.windows.net/productdatav3/catalog.json'

const RETURN_NOTE = ' Custom-printed in the US, ships in 3–10 business days. 30-day return guarantee for damaged or defective items per our Returns Policy.'

const APPAREL_TEMPLATE = (name: string) =>
    `These ${name} are made to order with your custom AI-generated design printed full-color on premium fabric. Built for everyday wear.${RETURN_NOTE}`

const DRINKWARE_TEMPLATE = (name: string) =>
    `Custom-printed ${name} featuring your AI-generated design wrapped around the surface. Premium construction (ceramic or stainless steel depending on the model), dishwasher-safe top rack.${RETURN_NOTE}`

const HEADWEAR_TEMPLATE = (name: string) =>
    `Premium ${name} custom-printed with your AI-generated design. Structured construction with adjustable fit. One size fits most.${RETURN_NOTE}`

function pickTemplate(name: string): (n: string) => string {
    const n = name.toLowerCase()
    // Headwear first (caps, beanies, hats)
    if (/cap|beanie|hat|richardson/.test(n)) return HEADWEAR_TEMPLATE
    // Drinkware
    if (/mug|tumbler|bottle|kanteen|flask|can holder/.test(n)) return DRINKWARE_TEMPLATE
    // Default: apparel (hoodies, sweatshirts, polo, t-shirt)
    return APPAREL_TEMPLATE
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

async function fetchGootenDescriptions(): Promise<Map<number, string>> {
    const res = await fetch(FEED_URL)
    if (!res.ok) throw new Error(`feed ${res.status}`)
    const json = await res.json() as Record<string, unknown>
    const seed: unknown[] = Array.isArray(json['product-catalog'])
        ? json['product-catalog'] as unknown[]
        : Object.values(json)
    const products = flat(seed)
    const out = new Map<number, string>()
    for (const p of products) {
        if (!p || typeof p !== 'object') continue
        const o = p as Record<string, unknown>
        const pid = Number(o.product_id)
        if (!Number.isFinite(pid)) continue
        const md = o.meta_description
        if (typeof md === 'string' && md.trim() && !out.has(pid)) {
            out.set(pid, md.trim())
        }
    }
    return out
}

async function main() {
    const apply = process.argv.includes('--apply')
    const dryRun = !apply

    console.log(`mode: ${dryRun ? 'DRY-RUN' : 'APPLY'}`)
    console.log('')

    const targets = await prisma.product.findMany({
        where: {
            active: true,
            printfulId: { startsWith: 'gooten:' },
        },
        select: {
            id: true,
            name: true,
            printfulId: true,
            description: true,
        },
        orderBy: { id: 'asc' },
    })
    const short = targets.filter((t) => (t.description ?? '').length < 150)
    console.log(`Gooten active products: ${targets.length}`)
    console.log(`with description < 150 chars: ${short.length}`)
    console.log('')

    const gootenDescs = await fetchGootenDescriptions()
    console.log(`Gooten catalog feed: ${gootenDescs.size} products with meta_description`)
    console.log('')

    type Plan = {
        dbId: string
        name: string
        oldLen: number
        oldPreview: string
        source: 'gooten_meta' | 'template'
        newDesc: string
        newLen: number
    }
    const plan: Plan[] = []

    for (const row of short) {
        const gootenId = Number((row.printfulId || '').replace(/^gooten:/, ''))
        const gootenMd = Number.isFinite(gootenId) ? gootenDescs.get(gootenId) : undefined

        let newDesc: string
        let source: Plan['source']
        if (gootenMd && gootenMd.length >= 150) {
            // Append the return-policy note unless it's already present
            newDesc = /30-day return/.test(gootenMd)
                ? gootenMd
                : gootenMd + RETURN_NOTE
            source = 'gooten_meta'
        } else {
            newDesc = pickTemplate(row.name)(row.name)
            source = 'template'
        }

        if (newDesc.length < 150) {
            console.log(`  WARN: ${row.id} ${row.name} new desc only ${newDesc.length} chars — extending`)
            newDesc = APPAREL_TEMPLATE(row.name)
        }

        plan.push({
            dbId: row.id,
            name: row.name,
            oldLen: (row.description ?? '').length,
            oldPreview: (row.description ?? '').slice(0, 60),
            source,
            newDesc,
            newLen: newDesc.length,
        })
    }

    console.log('Plan:')
    console.log('  ' + 'id'.padEnd(28) + 'old chars  src           new chars  name')
    for (const p of plan) {
        console.log(
            '  ' +
            p.dbId.padEnd(28) +
            String(p.oldLen).padStart(5) + '       ' +
            p.source.padEnd(13) + ' ' +
            String(p.newLen).padStart(5) + '       ' +
            p.name,
        )
    }
    console.log('')
    console.log('Sample new descriptions (first 5):')
    for (const p of plan.slice(0, 5)) {
        console.log(`  --- ${p.name} (${p.source}, ${p.newLen} chars) ---`)
        console.log(`  ${p.newDesc.slice(0, 220)}${p.newDesc.length > 220 ? '…' : ''}`)
    }

    if (dryRun) {
        console.log('')
        console.log(`(dry-run) would update ${plan.length} rows`)
        await prisma.$disconnect()
        return
    }

    // Idempotency guard: re-read each row immediately before update
    // and skip if length(description) >= 150. Prisma 7's WHERE doesn't
    // expose LENGTH(); doing the check in JS is the cleanest path.
    let updated = 0
    let skipped = 0
    for (const p of plan) {
        const fresh = await prisma.product.findUnique({
            where: { id: p.dbId },
            select: { description: true },
        })
        if (!fresh) {
            console.log(`  skipped ${p.dbId} — row missing`)
            continue
        }
        if ((fresh.description ?? '').length >= 150) {
            console.log(`  skipped ${p.dbId} — desc no longer short`)
            skipped += 1
            continue
        }
        await prisma.product.update({
            where: { id: p.dbId },
            data: { description: p.newDesc },
        })
        updated += 1
    }
    console.log('')
    console.log(`applied: ${updated} rows; skipped: ${skipped}`)
    await prisma.$disconnect()
}

main().catch((err) => { console.error(err); process.exit(1) })
