import { describe, expect, it } from 'vitest'
import {
    extractJsonLdSchemaTypes,
    findJsonLdNodesByType,
    parseAnchorTags,
    parseJsonLdScripts,
    parseRenderedHead,
    parseTrustLinkIntegrity,
    parseTrustVisibility,
    resolveRenderedLocaleFromPath,
    toPathname,
} from './rendered-head'

describe('rendered head parser', () => {
    it('parses canonical, alternates, and og:url from server-rendered head html', () => {
        const html = `
            <head>
                <link rel="canonical" href="https://print.zuerifix.tech/fr/create" />
                <link rel="alternate" hrefLang="en" href="https://print.zuerifix.tech/create" />
                <link rel="alternate" hreflang="fr" href="https://print.zuerifix.tech/fr/create" />
                <link rel="alternate" hrefLang="x-default" href="https://print.zuerifix.tech/create" />
                <meta property="og:url" content="https://print.zuerifix.tech/fr/create" />
            </head>
        `

        const parsed = parseRenderedHead(html)

        expect(parsed.canonicalHref).toBe('https://print.zuerifix.tech/fr/create')
        expect(parsed.ogUrl).toBe('https://print.zuerifix.tech/fr/create')
        expect(parsed.alternates).toEqual({
            en: 'https://print.zuerifix.tech/create',
            fr: 'https://print.zuerifix.tech/fr/create',
            'x-default': 'https://print.zuerifix.tech/create',
        })
    })

    it('normalizes pathnames from absolute or relative urls', () => {
        expect(toPathname('https://print.zuerifix.tech/fr/create')).toBe('/fr/create')
        expect(toPathname('/create')).toBe('/create')
        expect(toPathname('https://print.zuerifix.tech/')).toBe('/')
    })

    it('resolves locale from rendered route path', () => {
        expect(resolveRenderedLocaleFromPath('/create')).toBe('en')
        expect(resolveRenderedLocaleFromPath('/fr/create')).toBe('fr')
        expect(resolveRenderedLocaleFromPath('/de/blog')).toBe('de')
        expect(resolveRenderedLocaleFromPath('/es/support')).toBe('es')
        expect(resolveRenderedLocaleFromPath('/unknown/path')).toBe('en')
    })

    it('detects trust marker visibility for a locale', () => {
        const html = `
            <div>
                <p>Delivery SLA</p>
                <p>Support Promise</p>
                <p>Returns Policy</p>
            </div>
        `

        const visibility = parseTrustVisibility(html, 'en')
        expect(visibility.requiredMarkers).toEqual(['Delivery SLA', 'Support Promise', 'Returns Policy'])
        expect(visibility.foundMarkers).toEqual(['Delivery SLA', 'Support Promise', 'Returns Policy'])
        expect(visibility.isVisible).toBe(true)
    })

    it('parses trust-strip anchors and validates support/terms link integrity', () => {
        const html = `
            <section>
                <a href="/fr/support">Contacter le support</a>
                <a href="/terms">Voir les conditions</a>
            </section>
        `

        const anchors = parseAnchorTags(html)
        const trustLinks = parseTrustLinkIntegrity(html, 'fr')

        expect(anchors.map((anchor) => anchor.pathname)).toEqual(['/fr/support', '/terms'])
        expect(trustLinks.expectedSupportPath).toBe('/fr/support')
        expect(trustLinks.expectedTermsPath).toBe('/terms')
        expect(trustLinks.supportPathFound).toBe(true)
        expect(trustLinks.supportLabelFound).toBe(true)
        expect(trustLinks.termsPathFound).toBe(true)
        expect(trustLinks.termsLabelFound).toBe(true)
    })

    it('parses JSON-LD scripts and finds required schema types', () => {
        const html = `
            <script type="application/ld+json">
                {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://print.zuerifix.tech/"}]}
            </script>
            <script type="application/ld+json">
                {"@context":"https://schema.org","@graph":[{"@type":"Product","name":"Sample Tee","offers":{"@type":"Offer","priceCurrency":"USD","availability":"https://schema.org/InStock","shippingDetails":{"@type":"OfferShippingDetails"},"hasMerchantReturnPolicy":{"@type":"MerchantReturnPolicy"}}}]}
            </script>
        `

        const scripts = parseJsonLdScripts(html)
        const types = extractJsonLdSchemaTypes(scripts)
        const breadcrumbs = findJsonLdNodesByType(scripts, 'BreadcrumbList')
        const products = findJsonLdNodesByType(scripts, 'Product')

        expect(scripts.length).toBe(2)
        expect(scripts.every((entry) => entry.parseError === null)).toBe(true)
        expect(types).toEqual(['BreadcrumbList', 'Product'])
        expect(breadcrumbs.length).toBe(1)
        expect(products.length).toBe(1)
    })
})
