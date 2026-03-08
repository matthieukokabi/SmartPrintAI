import * as dotenv from 'dotenv'
dotenv.config({ path: ['.env.local', '.env'] })
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

type PrintfulProductSummary = {
  id: number
}

type PrintfulProduct = {
  id: number
  title: string
  description?: string | null
  type_name?: string | null
  image?: string | null
  is_discontinued?: boolean
}

type PrintfulVariant = {
  id: number
  name?: string | null
  size?: string | null
  color?: string | null
  color_code?: string | null
  price?: string | number | null
}

type PrintfulProductDetail = {
  product: PrintfulProduct
  variants: PrintfulVariant[]
}

type PrintfulEnvelope<T> = {
  result: T
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required')
}

const printfulApiKey = process.env.PRINTFUL_API_KEY
if (!printfulApiKey) {
  throw new Error('PRINTFUL_API_KEY is required')
}

const adapter = new PrismaPg({ connectionString: databaseUrl })
const prisma = new PrismaClient({ adapter })

const PAGE_LIMIT = Number(process.env.PRINTFUL_SYNC_PAGE_LIMIT || 20)
const MAX_PRODUCTS = Number(process.env.PRINTFUL_SYNC_MAX_PRODUCTS || 200)
const PRICE_MULTIPLIER = Number(process.env.PRINTFUL_SELL_PRICE_MULTIPLIER || 2.2)
const MIN_MARGIN = Number(process.env.PRINTFUL_MIN_MARGIN || 8)
const DEACTIVATE_MISSING = process.env.PRINTFUL_SYNC_DEACTIVATE_MISSING === '1'
const DRY_RUN = process.env.PRINTFUL_SYNC_DRY_RUN === '1'

function classifyCategory(text: string): string {
  const v = text.toLowerCase()
  if (/(shirt|hoodie|sweatshirt|tank|apparel|tee)/.test(v)) return 'apparel'
  if (/(mug|drink|bottle|cup)/.test(v)) return 'drinkware'
  if (/(canvas|poster|pillow|blanket|home|frame)/.test(v)) return 'home'
  return 'accessories'
}

function toHexOrDefault(value: string | null | undefined): string {
  if (!value) return '#FFFFFF'
  const cleaned = value.trim()
  if (/^#[0-9a-f]{6}$/i.test(cleaned)) return cleaned.toUpperCase()
  return '#FFFFFF'
}

function parseBasePrice(variants: PrintfulVariant[]): number {
  const prices = variants
    .map((v) => Number(v.price))
    .filter((n) => Number.isFinite(n) && n > 0)

  if (prices.length === 0) return 0
  return Math.min(...prices)
}

function calcSellPrice(basePrice: number): number {
  const raw = Math.max(basePrice * PRICE_MULTIPLIER, basePrice + MIN_MARGIN)
  return Math.round(raw * 100) / 100
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const trimmed = (value || '').trim()
    if (!trimmed) continue
    if (seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
  }
  return out
}

function normalizeColors(variants: PrintfulVariant[]) {
  const seen = new Set<string>()
  const colors: Array<{ name: string; hex: string; printfulVariantId: number }> = []

  for (const variant of variants) {
    const name = (variant.color || 'Default').trim() || 'Default'
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    colors.push({
      name,
      hex: toHexOrDefault(variant.color_code),
      printfulVariantId: variant.id,
    })
  }

  return colors
}

async function printfulGet<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.printful.com${path}`, {
    headers: {
      Authorization: `Bearer ${printfulApiKey}`,
      'Content-Type': 'application/json',
    },
  })

  const text = await res.text()
  let json: PrintfulEnvelope<T> | { error?: { message?: string } }
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`Printful API invalid JSON for ${path}`)
  }

  if (!res.ok) {
    const message = (json as { error?: { message?: string } })?.error?.message || text
    throw new Error(`Printful API error ${res.status} for ${path}: ${message}`)
  }

  return (json as PrintfulEnvelope<T>).result
}

async function fetchProductSummaries(): Promise<PrintfulProductSummary[]> {
  const all: PrintfulProductSummary[] = []
  let offset = 0

  while (all.length < MAX_PRODUCTS) {
    const remaining = MAX_PRODUCTS - all.length
    const limit = Math.min(PAGE_LIMIT, remaining)
    const batch = await printfulGet<PrintfulProductSummary[]>(`/products?limit=${limit}&offset=${offset}`)

    if (!Array.isArray(batch) || batch.length === 0) break

    all.push(...batch)
    offset += batch.length

    if (batch.length < limit) break
  }

  return all
}

async function main() {
  console.log('Starting Printful product sync...')
  console.log(`Config: PAGE_LIMIT=${PAGE_LIMIT} MAX_PRODUCTS=${MAX_PRODUCTS} DEACTIVATE_MISSING=${DEACTIVATE_MISSING} DRY_RUN=${DRY_RUN}`)

  const summaries = await fetchProductSummaries()
  if (summaries.length === 0) {
    console.log('No Printful products returned; nothing to sync.')
    return
  }

  let created = 0
  let updated = 0
  let skipped = 0

  const syncedPrintfulIds: string[] = []

  for (const summary of summaries) {
    const detail = await printfulGet<PrintfulProductDetail>(`/products/${summary.id}`)
    const product = detail.product
    const variants = Array.isArray(detail.variants) ? detail.variants : []

    const printfulId = String(product.id)
    syncedPrintfulIds.push(printfulId)

    const title = (product.title || '').trim()
    if (!title || variants.length === 0) {
      skipped += 1
      continue
    }

    const basePrice = parseBasePrice(variants)
    if (basePrice <= 0) {
      skipped += 1
      continue
    }

    const existing = await prisma.product.findUnique({ where: { printfulId } })

    const sizes = uniqueStrings(variants.map((v) => v.size))
    const colors = normalizeColors(variants)

    if (colors.length === 0) {
      skipped += 1
      continue
    }

    const computedSellPrice = calcSellPrice(basePrice)
    const sellPrice = existing?.sellPrice ?? computedSellPrice

    const categorySource = `${product.type_name || ''} ${title}`.trim()
    const category = classifyCategory(categorySource)

    const data = {
      name: title,
      printfulId,
      description: (product.description || '').trim() || title,
      category,
      basePrice,
      sellPrice,
      sizes: sizes.length > 0 ? sizes : ['One Size'],
      colors,
      imageUrl: product.image || existing?.imageUrl || '',
      printArea: existing?.printArea || { width: 4200, height: 4800, dpi: 300 },
      active: !product.is_discontinued,
    }

    if (DRY_RUN) {
      console.log(`[dry-run] ${existing ? 'update' : 'create'} printfulId=${printfulId} name=${title}`)
      continue
    }

    await prisma.product.upsert({
      where: { printfulId },
      update: data,
      create: data,
    })

    if (existing) updated += 1
    else created += 1

    console.log(`Synced printfulId=${printfulId} name=${title}`)
  }

  let deactivated = 0
  if (!DRY_RUN && DEACTIVATE_MISSING) {
    const result = await prisma.product.updateMany({
      where: {
        printfulId: { notIn: syncedPrintfulIds },
        active: true,
      },
      data: { active: false },
    })
    deactivated = result.count
  }

  console.log(`Sync completed. created=${created} updated=${updated} skipped=${skipped} deactivated=${deactivated} fetched=${summaries.length}`)
}

main()
  .catch((err) => {
    console.error('Printful sync failed:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
