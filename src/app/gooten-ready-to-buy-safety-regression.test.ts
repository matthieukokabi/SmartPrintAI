import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function readSource(relativePath: string): string {
    return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

describe('gooten ready-to-buy safety regression', () => {
    it('filters blocked gooten ready-to-buy products from products listings', () => {
        const defaultProductsSource = readSource('src/app/products/page.tsx')
        const localizedProductsSource = readSource('src/app/[locale]/products/page.tsx')
        const apiProductsSource = readSource('src/app/api/products/route.ts')

        expect(defaultProductsSource).toContain('splitBlockedGootenReadyToBuyProducts')
        expect(localizedProductsSource).toContain('splitBlockedGootenReadyToBuyProducts')
        expect(apiProductsSource).toContain('splitBlockedGootenReadyToBuyProducts')
        expect(apiProductsSource).toContain('gooten_ready_to_buy_hidden')
    })

    it('blocks direct product detail access and checkout for unsafe gooten ready-to-buy products', () => {
        const defaultProductDetailSource = readSource('src/app/products/[id]/page.tsx')
        const localizedProductDetailSource = readSource('src/app/[locale]/products/[id]/page.tsx')
        const checkoutSource = readSource('src/app/api/checkout/route.ts')

        expect(defaultProductDetailSource).toContain('isBlockedGootenReadyToBuyProduct')
        expect(localizedProductDetailSource).toContain('isBlockedGootenReadyToBuyProduct')
        expect(defaultProductDetailSource).toContain('notFound()')
        expect(localizedProductDetailSource).toContain('notFound()')
        expect(checkoutSource).toContain('blocked_unsafe_gooten_ready_to_buy_checkout')
        expect(checkoutSource).toContain('temporarily unavailable while we update print production settings')
    })
})
