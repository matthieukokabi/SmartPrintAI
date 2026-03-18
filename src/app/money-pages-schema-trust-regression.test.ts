import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

type PageContract = {
    label: string
    filePath: string
    requiredSnippets: string[]
    minJsonLdScripts: number
}

const MONEY_PAGE_CONTRACTS: PageContract[] = [
    {
        label: 'default create',
        filePath: path.join(process.cwd(), 'src', 'app', 'create', 'page.tsx'),
        requiredSnippets: ['buildBreadcrumbList(['],
        minJsonLdScripts: 1,
    },
    {
        label: 'localized create',
        filePath: path.join(process.cwd(), 'src', 'app', '[locale]', 'create', 'page.tsx'),
        requiredSnippets: ['buildBreadcrumbList(['],
        minJsonLdScripts: 1,
    },
    {
        label: 'default products list',
        filePath: path.join(process.cwd(), 'src', 'app', 'products', 'page.tsx'),
        requiredSnippets: ['itemListSchema', 'buildBreadcrumbList(['],
        minJsonLdScripts: 2,
    },
    {
        label: 'localized products list',
        filePath: path.join(process.cwd(), 'src', 'app', '[locale]', 'products', 'page.tsx'),
        requiredSnippets: ['itemListSchema', 'buildBreadcrumbList([', 'buildLocalizedSchemaUrl(locale,'],
        minJsonLdScripts: 2,
    },
    {
        label: 'default product detail',
        filePath: path.join(process.cwd(), 'src', 'app', 'products', '[id]', 'page.tsx'),
        requiredSnippets: ['const productSchema = {', 'offers: buildProductOfferSchema({', 'buildBreadcrumbList(['],
        minJsonLdScripts: 2,
    },
    {
        label: 'localized product detail',
        filePath: path.join(process.cwd(), 'src', 'app', '[locale]', 'products', '[id]', 'page.tsx'),
        requiredSnippets: [
            'const productSchema = {',
            'offers: buildProductOfferSchema({',
            'buildBreadcrumbList([',
            'const productPath = buildLocaleCanonical(locale,',
        ],
        minJsonLdScripts: 2,
    },
]

const TRUST_STRIP_PATTERN = /<TrustSignalStrip locale=\{[^}]+\} className="mb-8" \/>/

function readSource(filePath: string): string {
    return fs.readFileSync(filePath, 'utf8')
}

function countOccurrences(haystack: string, needle: string): number {
    if (!needle) {
        return 0
    }
    return haystack.split(needle).length - 1
}

describe('Wave 4 money-page schema and trust regression', () => {
    it('keeps trust strip embedded across money page templates', () => {
        for (const contract of MONEY_PAGE_CONTRACTS) {
            const source = readSource(contract.filePath)
            expect(source, `${contract.label} should keep trust strip`).toMatch(TRUST_STRIP_PATTERN)
        }
    })

    it('keeps schema anchors embedded across money page templates', () => {
        for (const contract of MONEY_PAGE_CONTRACTS) {
            const source = readSource(contract.filePath)
            const jsonLdScripts = countOccurrences(source, 'type="application/ld+json"')
            expect(
                jsonLdScripts,
                `${contract.label} should keep at least ${contract.minJsonLdScripts} JSON-LD script blocks`,
            ).toBeGreaterThanOrEqual(contract.minJsonLdScripts)

            for (const snippet of contract.requiredSnippets) {
                expect(source, `${contract.label} should include schema anchor: ${snippet}`).toContain(snippet)
            }
        }
    })
})
