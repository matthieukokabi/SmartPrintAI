type ParsedHead = {
    canonicalHref: string | null
    alternates: Record<string, string>
    ogUrl: string | null
}

function normalizeRel(value: string | undefined): string[] {
    if (!value) {
        return []
    }
    return value
        .toLowerCase()
        .split(/\s+/)
        .map((entry) => entry.trim())
        .filter(Boolean)
}

function parseAttributes(tag: string): Record<string, string> {
    const attributes: Record<string, string> = {}
    const pattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g

    let match = pattern.exec(tag)
    while (match) {
        const name = (match[1] || '').toLowerCase()
        const value = match[2] ?? match[3] ?? ''
        if (!name) {
            match = pattern.exec(tag)
            continue
        }
        attributes[name] = value
        match = pattern.exec(tag)
    }

    return attributes
}

export function parseRenderedHead(html: string): ParsedHead {
    const alternates: Record<string, string> = {}
    let canonicalHref: string | null = null
    let ogUrl: string | null = null

    const linkPattern = /<link\b[^>]*>/gi
    let linkMatch = linkPattern.exec(html)
    while (linkMatch) {
        const tag = linkMatch[0]
        const attributes = parseAttributes(tag)
        const relTokens = normalizeRel(attributes.rel)
        const href = attributes.href
        if (!href) {
            linkMatch = linkPattern.exec(html)
            continue
        }

        if (relTokens.includes('canonical')) {
            canonicalHref = href
        }

        if (relTokens.includes('alternate')) {
            const lang = (attributes.hreflang || attributes['href-lang'] || '').toLowerCase()
            if (lang) {
                alternates[lang] = href
            }
        }
        linkMatch = linkPattern.exec(html)
    }

    const metaPattern = /<meta\b[^>]*>/gi
    let metaMatch = metaPattern.exec(html)
    while (metaMatch) {
        const attributes = parseAttributes(metaMatch[0])
        const property = (attributes.property || attributes.name || '').toLowerCase()
        if (property === 'og:url') {
            ogUrl = attributes.content || null
        }
        metaMatch = metaPattern.exec(html)
    }

    return {
        canonicalHref,
        alternates,
        ogUrl,
    }
}

export function toPathname(href: string): string {
    const parsed = new URL(href, 'https://smartprintai.com')
    const normalized = parsed.pathname.replace(/\/+$/, '')
    return normalized.length > 0 ? normalized : '/'
}
