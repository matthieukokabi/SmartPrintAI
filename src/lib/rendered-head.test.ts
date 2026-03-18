import { describe, expect, it } from 'vitest'
import { parseRenderedHead, parseTrustVisibility, resolveRenderedLocaleFromPath, toPathname } from './rendered-head'

describe('rendered head parser', () => {
    it('parses canonical, alternates, and og:url from server-rendered head html', () => {
        const html = `
            <head>
                <link rel="canonical" href="https://smartprintai.com/fr/create" />
                <link rel="alternate" hrefLang="en" href="https://smartprintai.com/create" />
                <link rel="alternate" hreflang="fr" href="https://smartprintai.com/fr/create" />
                <link rel="alternate" hrefLang="x-default" href="https://smartprintai.com/create" />
                <meta property="og:url" content="https://smartprintai.com/fr/create" />
            </head>
        `

        const parsed = parseRenderedHead(html)

        expect(parsed.canonicalHref).toBe('https://smartprintai.com/fr/create')
        expect(parsed.ogUrl).toBe('https://smartprintai.com/fr/create')
        expect(parsed.alternates).toEqual({
            en: 'https://smartprintai.com/create',
            fr: 'https://smartprintai.com/fr/create',
            'x-default': 'https://smartprintai.com/create',
        })
    })

    it('normalizes pathnames from absolute or relative urls', () => {
        expect(toPathname('https://smartprintai.com/fr/create')).toBe('/fr/create')
        expect(toPathname('/create')).toBe('/create')
        expect(toPathname('https://smartprintai.com/')).toBe('/')
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
})
