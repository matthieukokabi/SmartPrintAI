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
        expect(source).toContain('id="why-smartprintai"')
        expect(source).toContain('id="featured-products"')
        expect(source).toContain('TRUST_STACK')
        expect(source).toContain('FEATURED_PRODUCT_PREVIEWS')
        expect(source).toContain('<HomeFunnelAnalytics />')
        expect(source).toContain('data-analytics-page="homepage"')
        expect(source).toContain('data-home-section="hero"')
        expect(source).toContain('data-home-section="trust"')
        expect(source).toContain('data-home-cta="hero_primary_create"')
        expect(source).toContain('data-home-cta="hero_secondary_products"')
        expect(source).toContain('heroAssurances')
        expect(source).toContain('trustSubtitle')
        expect(source).toContain('midCtaTitle')
        expect(source).toContain('faqItems')
        expect(source).toContain('finalCtaTitle')
        expect(source).toContain('heroSupportLine')
        expect(source).toContain('text.heroSecondaryCta')
    })

    it('keeps shared BrandMark usage in nav and footer', () => {
        const navbar = readSource(NAVBAR_PATH)
        const footer = readSource(FOOTER_PATH)

        expect(navbar).toContain("import BrandMark from '@/components/brand/BrandMark'")
        expect(navbar).toContain('<BrandMark size={18} />')
        expect(navbar).toContain('data-home-cta="navbar_primary_create"')
        expect(navbar).toContain('<span className="sm:hidden">Create Product</span>')

        expect(footer).toContain("import BrandMark from '@/components/brand/BrandMark'")
        expect(footer).toContain('<BrandMark size={18} />')
        expect(footer).toContain('data-home-cta="footer_primary_create"')
    })
})
