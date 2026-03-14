import * as dotenv from 'dotenv'
dotenv.config({ path: ['.env.local', '.env'] })

import { spawnSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { isMockupEligibleProduct } from '../src/lib/mockup-eligibility'
import { detectProductProvider, type ProductProvider } from '../src/lib/product-provider'

type CatalogSummary = {
  total: number
  aiCustomizable: number
  readyToBuy: number
}

function runSyncScript(scriptName: string) {
  const result = spawnSync('npm', ['run', scriptName], {
    stdio: 'inherit',
    env: process.env,
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(`npm run ${scriptName} failed with exit code ${result.status}`)
  }
}

function hasEnv(name: string): boolean {
  return Boolean((process.env[name] || '').trim())
}

function buildSummaryBuckets(): Record<ProductProvider, CatalogSummary> {
  return {
    printful: { total: 0, aiCustomizable: 0, readyToBuy: 0 },
    gelato: { total: 0, aiCustomizable: 0, readyToBuy: 0 },
    unknown: { total: 0, aiCustomizable: 0, readyToBuy: 0 },
  }
}

async function printCatalogSummary() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.log('Catalog summary skipped: DATABASE_URL not configured.')
    return
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl })
  const prisma = new PrismaClient({ adapter })

  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      select: { name: true, printfulId: true },
    })

    const buckets = buildSummaryBuckets()
    let totalAiCustomizable = 0

    for (const product of products) {
      const provider = detectProductProvider(product.printfulId)
      const aiCustomizable = isMockupEligibleProduct({
        name: product.name,
        printfulId: product.printfulId,
      })

      buckets[provider].total += 1
      if (aiCustomizable) {
        buckets[provider].aiCustomizable += 1
        totalAiCustomizable += 1
      } else {
        buckets[provider].readyToBuy += 1
      }
    }

    const totalReadyToBuy = products.length - totalAiCustomizable

    console.log('Catalog isolation summary:')
    console.log(
      `- active=${products.length} aiCustomizable=${totalAiCustomizable} readyToBuy=${totalReadyToBuy}`
    )
    console.log(
      `- printful: total=${buckets.printful.total} aiCustomizable=${buckets.printful.aiCustomizable} readyToBuy=${buckets.printful.readyToBuy}`
    )
    console.log(
      `- gelato: total=${buckets.gelato.total} aiCustomizable=${buckets.gelato.aiCustomizable} readyToBuy=${buckets.gelato.readyToBuy}`
    )
    if (buckets.unknown.total > 0) {
      console.log(
        `- unknown: total=${buckets.unknown.total} aiCustomizable=${buckets.unknown.aiCustomizable} readyToBuy=${buckets.unknown.readyToBuy}`
      )
    }
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  console.log('Starting unified product sync...')
  runSyncScript('sync:products:printful')

  const gelatoSyncMode = (process.env.GELATO_SYNC_MODE || 'catalog').trim().toLowerCase()
  const hasGelatoApiKey = hasEnv('GELATO_API_KEY')
  const hasGelatoConfig =
    gelatoSyncMode === 'store-templates'
      ? hasGelatoApiKey
      : hasGelatoApiKey && hasEnv('GELATO_CATALOG_UIDS')

  if (hasGelatoConfig) {
    runSyncScript('sync:products:gelato')
  } else {
    if (gelatoSyncMode === 'store-templates') {
      console.log('Skipping Gelato sync: GELATO_API_KEY is not configured for store-templates mode.')
    } else {
      console.log('Skipping Gelato sync: GELATO_API_KEY or GELATO_CATALOG_UIDS is not configured.')
    }
  }

  await printCatalogSummary()
  console.log('Unified product sync completed.')
}

main().catch((error) => {
  console.error('Unified product sync failed:', error)
  process.exitCode = 1
})
