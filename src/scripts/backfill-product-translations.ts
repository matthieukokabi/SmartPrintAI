/**
 * One-shot backfill: translates Product.name and Product.description
 * into FR, DE, ES via Gemini Flash. Writes to nameTranslations and
 * descriptionTranslations JSONB columns (shape: { en, fr, de, es }).
 *
 * Usage:
 *   npx tsx --env-file=.env.local src/scripts/backfill-product-translations.ts
 *   npx tsx --env-file=.env.local src/scripts/backfill-product-translations.ts --dry-run
 *   npx tsx --env-file=.env.local src/scripts/backfill-product-translations.ts --limit 3
 *   npx tsx --env-file=.env.local src/scripts/backfill-product-translations.ts --force
 *
 * Idempotent: skips products that already have non-null translations
 * for all 3 target locales unless --force is passed.
 *
 * Cost: ~3 calls per product × ~125 active products = ~375 Gemini Flash
 * text calls. At ~50-100 output + ~200 input tokens each, total cost
 * is well under $0.05 USD.
 */
import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from '@/lib/prisma'

type TargetLocale = 'fr' | 'de' | 'es'
const TARGETS: TargetLocale[] = ['fr', 'de', 'es']
const LOCALE_NAME: Record<TargetLocale, string> = {
    fr: 'French',
    de: 'German',
    es: 'Spanish',
}

const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash'
const REQUEST_DELAY_MS = 200

const dryRun = process.argv.includes('--dry-run')
const force = process.argv.includes('--force')
const limitFlag = process.argv.indexOf('--limit')
const limit = limitFlag >= 0 ? Number(process.argv[limitFlag + 1]) : undefined

if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY missing in env')
    process.exit(1)
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: TEXT_MODEL })

interface TranslatedPair {
    name: string
    description: string
}

function buildPrompt(localeName: string, name: string, description: string): string {
    return `You are translating a product catalog entry from English to ${localeName}.
The translation will appear on a print-on-demand e-commerce site.
Keep technical terms (sizes, materials, units like "100% acrylic", "5 oz/yd²")
in their conventional ${localeName} form. Preserve the same number
of paragraphs / sentences. Do not add disclaimers or additional content.
Return ONLY a single JSON object with keys "name" and "description",
no markdown, no commentary.

English name: ${name}
English description:
${description}`
}

function extractJson(raw: string): unknown {
    // Strip code fences if Gemini added them despite the instruction.
    let s = raw.trim()
    if (s.startsWith('```')) {
        s = s.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim()
    }
    // Find the first { and last } to bound the JSON.
    const first = s.indexOf('{')
    const last = s.lastIndexOf('}')
    if (first === -1 || last === -1) throw new Error(`No JSON object found in: ${raw.slice(0, 120)}`)
    return JSON.parse(s.slice(first, last + 1))
}

async function translateOne(
    name: string,
    description: string,
    target: TargetLocale
): Promise<TranslatedPair> {
    const prompt = buildPrompt(LOCALE_NAME[target], name, description)
    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const parsed = extractJson(text) as { name?: unknown; description?: unknown }
    if (typeof parsed.name !== 'string' || typeof parsed.description !== 'string') {
        throw new Error(`Bad JSON shape from Gemini for ${target}: ${text.slice(0, 200)}`)
    }
    return { name: parsed.name.trim(), description: parsed.description.trim() }
}

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
    const products = await prisma.product.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
        ...(limit ? { take: limit } : {}),
    })

    console.log(`[backfill] ${products.length} active products${limit ? ` (limited)` : ''}, dryRun=${dryRun}, force=${force}`)
    console.log(`[backfill] model=${TEXT_MODEL}`)

    let success = 0
    let skipped = 0
    let failed = 0
    let perLocaleFail = 0
    const start = Date.now()

    for (const product of products) {
        const existingName = product.nameTranslations as Record<string, string> | null
        const existingDesc = product.descriptionTranslations as Record<string, string> | null
        const allTargetsCovered = TARGETS.every(
            (t) => existingName?.[t] && existingDesc?.[t]
        )
        if (allTargetsCovered && !force) {
            console.log(`[backfill] SKIP  ${product.id} (${product.name}) — already translated`)
            skipped += 1
            continue
        }

        const nameOut: Record<string, string> = { en: product.name, ...(existingName || {}) }
        const descOut: Record<string, string> = { en: product.description, ...(existingDesc || {}) }

        for (const target of TARGETS) {
            if (!force && nameOut[target] && descOut[target]) {
                continue
            }
            try {
                const pair = await translateOne(product.name, product.description, target)
                nameOut[target] = pair.name
                descOut[target] = pair.description
                console.log(`[backfill] OK    ${product.id} ${target} — name="${pair.name.slice(0, 60)}"`)
            } catch (err) {
                perLocaleFail += 1
                console.error(`[backfill] FAIL  ${product.id} ${target}: ${err instanceof Error ? err.message : err}`)
            }
            await sleep(REQUEST_DELAY_MS)
        }

        if (dryRun) {
            console.log(`[backfill] DRY   ${product.id} would write:`)
            console.log(`              nameTranslations=${JSON.stringify(nameOut)}`)
            console.log(`              descriptionTranslations=${JSON.stringify({
                en: descOut.en?.slice(0, 80),
                fr: descOut.fr?.slice(0, 80),
                de: descOut.de?.slice(0, 80),
                es: descOut.es?.slice(0, 80),
            })}`)
            success += 1
            continue
        }

        try {
            await prisma.product.update({
                where: { id: product.id },
                data: {
                    nameTranslations: nameOut,
                    descriptionTranslations: descOut,
                },
            })
            success += 1
        } catch (err) {
            failed += 1
            console.error(`[backfill] DBFAIL ${product.id}: ${err instanceof Error ? err.message : err}`)
        }
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    console.log('')
    console.log(`[backfill] DONE in ${elapsed}s — success=${success} skipped=${skipped} failed=${failed} perLocaleFail=${perLocaleFail}`)
}

main()
    .catch((e) => {
        console.error('[backfill] FATAL:', e instanceof Error ? `${e.message}\n${e.stack}` : e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
