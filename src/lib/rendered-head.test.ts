import { describe, expect, it } from 'vitest'
import { parseRenderedHead, toPathname } from './rendered-head'

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
})
