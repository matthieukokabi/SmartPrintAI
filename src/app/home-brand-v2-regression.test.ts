import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const HOME_LANDING_PATH = path.join(process.cwd(), 'src', 'components', 'home', 'HomeLanding.tsx')
const NAVBAR_PATH = path.join(process.cwd(), 'src', 'components', 'layout', 'Navbar.tsx')
const FOOTER_PATH = path.join(process.cwd(), 'src', 'components', 'layout', 'Footer.tsx')

function readSource(filePath: string): string {
    return fs.readFileSync(filePath, 'utf8')
}

describe('homepage brand v2 regression', () => {
    it('keeps premium conversion section structure in homepage component', () => {
        const source = readSource(HOME_LANDING_PATH)

        expect(source).toContain('id="how-it-works"')
        expect(source).toContain('TRUST_STACK')
        expect(source).toContain('FEATURED_PRODUCT_PREVIEWS')
        expect(source).toContain('faqItems')
        expect(source).toContain('finalCtaTitle')
        expect(source).toContain('Talk to Support')
    })

    it('keeps shared BrandMark usage in nav and footer', () => {
        const navbar = readSource(NAVBAR_PATH)
        const footer = readSource(FOOTER_PATH)

        expect(navbar).toContain("import BrandMark from '@/components/brand/BrandMark'")
        expect(navbar).toContain('<BrandMark size={18} />')

        expect(footer).toContain("import BrandMark from '@/components/brand/BrandMark'")
        expect(footer).toContain('<BrandMark size={18} />')
    })
})
