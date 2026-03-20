import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const PRODUCT_DETAIL_CLIENT_PATH = path.join(process.cwd(), 'src', 'components', 'products', 'ProductDetailClient.tsx')
const PRODUCT_DETAIL_DEFAULT_PAGE_PATH = path.join(process.cwd(), 'src', 'app', 'products', '[id]', 'page.tsx')
const PRODUCT_DETAIL_LOCALIZED_PAGE_PATH = path.join(process.cwd(), 'src', 'app', '[locale]', 'products', '[id]', 'page.tsx')

function readSource(filePath: string): string {
    return fs.readFileSync(filePath, 'utf8')
}

describe('ready-to-buy product detail CTA regression', () => {
    it('keeps ready-to-buy purchase CTAs in product detail client', () => {
        const source = readSource(PRODUCT_DETAIL_CLIENT_PATH)

        expect(source).toContain('handleReadyToBuyAddToCart')
        expect(source).toContain('readyToBuyAddToCartLabel')
        expect(source).toContain('readyToBuyGoToCartLabel')
        expect(source).toContain('href={cartPath}')
        expect(source).toContain('readyToBuyOnlyLabel')
    })

    it('wires cart path and localized ready-to-buy copy from product detail pages', () => {
        const defaultPageSource = readSource(PRODUCT_DETAIL_DEFAULT_PAGE_PATH)
        const localizedPageSource = readSource(PRODUCT_DETAIL_LOCALIZED_PAGE_PATH)

        expect(defaultPageSource).toContain('cartPath="/cart"')
        expect(defaultPageSource).toContain('readyToBuyAddToCartLabel: copy.readyToBuyAddToCartLabel')
        expect(defaultPageSource).toContain('readyToBuyGoToCartLabel: copy.readyToBuyGoToCartLabel')

        expect(localizedPageSource).toContain("const cartPath = buildLocaleCanonical(locale, '/cart')")
        expect(localizedPageSource).toContain('cartPath={cartPath}')
        expect(localizedPageSource).toContain('readyToBuyAddToCartLabel: detailCopy.readyToBuyAddToCartLabel')
        expect(localizedPageSource).toContain('readyToBuyGoToCartLabel: detailCopy.readyToBuyGoToCartLabel')
    })
})
