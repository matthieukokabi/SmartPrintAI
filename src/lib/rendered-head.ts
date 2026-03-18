import { getTrustSignalModel } from './trust'

type ParsedHead = {
    canonicalHref: string | null
    alternates: Record<string, string>
    ogUrl: string | null
}

export type RenderedLocale = 'en' | 'fr' | 'de' | 'es'

type TrustVisibility = {
    requiredMarkers: string[]
    foundMarkers: string[]
    isVisible: boolean
}

type ParsedAnchor = {
    href: string
    pathname: string
    text: string
}

type TrustLinkIntegrity = {
    expectedSupportPath: string
    expectedTermsPath: string
    expectedSupportLabel: string
    expectedTermsLabel: string
    supportPathFound: boolean
    termsPathFound: boolean
    supportLabelFound: boolean
    termsLabelFound: boolean
}

type JsonLdScript = {
    content: string
    value: unknown | null
    parseError: string | null
}

const RENDERED_LOCALES: RenderedLocale[] = ['en', 'fr', 'de', 'es']

const TRUST_MARKERS_BY_LOCALE: Record<RenderedLocale, string[]> = {
    en: ['Delivery SLA', 'Support Promise', 'Returns Policy'],
    fr: ['Delai de livraison', 'Promesse support', 'Politique de retour'],
    de: ['Lieferzeit', 'Support-Versprechen', 'Rueckgabe'],
    es: ['Plazo de entrega', 'Compromiso de soporte', 'Politica de devolucion'],
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

export function resolveRenderedLocaleFromPath(pathname: string): RenderedLocale {
    const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`
    for (const locale of RENDERED_LOCALES) {
        if (normalized === `/${locale}` || normalized.startsWith(`/${locale}/`)) {
            return locale
        }
    }
    return 'en'
}

export function parseTrustVisibility(html: string, locale: RenderedLocale): TrustVisibility {
    const requiredMarkers = TRUST_MARKERS_BY_LOCALE[locale]
    const foundMarkers = requiredMarkers.filter((marker) => html.includes(marker))
    return {
        requiredMarkers,
        foundMarkers,
        isVisible: foundMarkers.length === requiredMarkers.length,
    }
}

function normalizeAnchorText(value: string): string {
    return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function collectJsonLdNodes(value: unknown, collector: Array<Record<string, unknown>>): void {
    if (Array.isArray(value)) {
        for (const entry of value) {
            collectJsonLdNodes(entry, collector)
        }
        return
    }

    if (typeof value !== 'object' || value === null) {
        return
    }

    const record = value as Record<string, unknown>
    collector.push(record)

    const graph = record['@graph']
    if (Array.isArray(graph)) {
        for (const entry of graph) {
            collectJsonLdNodes(entry, collector)
        }
    }
}

function hasSchemaType(node: Record<string, unknown>, expectedType: string): boolean {
    const nodeType = node['@type']
    if (typeof nodeType === 'string') {
        return nodeType === expectedType
    }
    if (Array.isArray(nodeType)) {
        return nodeType.includes(expectedType)
    }
    return false
}

export function parseAnchorTags(html: string): ParsedAnchor[] {
    const anchors: ParsedAnchor[] = []
    const pattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi

    let match = pattern.exec(html)
    while (match) {
        const attributesRaw = match[1] || ''
        const innerHtml = match[2] || ''
        const attributes = parseAttributes(`<a ${attributesRaw}>`)
        const href = attributes.href

        if (href) {
            anchors.push({
                href,
                pathname: toPathname(href),
                text: innerHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
            })
        }

        match = pattern.exec(html)
    }

    return anchors
}

export function parseTrustLinkIntegrity(html: string, locale: RenderedLocale): TrustLinkIntegrity {
    const trust = getTrustSignalModel(locale)
    const anchors = parseAnchorTags(html)
    const normalizedSupportLabel = normalizeAnchorText(trust.supportLinkLabel)
    const normalizedTermsLabel = normalizeAnchorText(trust.termsLinkLabel)

    const supportAnchors = anchors.filter((anchor) => anchor.pathname === trust.supportPath)
    const termsAnchors = anchors.filter((anchor) => anchor.pathname === trust.termsPath)

    return {
        expectedSupportPath: trust.supportPath,
        expectedTermsPath: trust.termsPath,
        expectedSupportLabel: trust.supportLinkLabel,
        expectedTermsLabel: trust.termsLinkLabel,
        supportPathFound: supportAnchors.length > 0,
        termsPathFound: termsAnchors.length > 0,
        supportLabelFound: supportAnchors.some((anchor) =>
            normalizeAnchorText(anchor.text).includes(normalizedSupportLabel)
        ),
        termsLabelFound: termsAnchors.some((anchor) =>
            normalizeAnchorText(anchor.text).includes(normalizedTermsLabel)
        ),
    }
}

export function parseJsonLdScripts(html: string): JsonLdScript[] {
    const scripts: JsonLdScript[] = []
    const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi

    let match = pattern.exec(html)
    while (match) {
        const attributesRaw = match[1] || ''
        const content = (match[2] || '').trim()
        const attributes = parseAttributes(`<script ${attributesRaw}>`)
        const type = (attributes.type || '').toLowerCase()
        if (type !== 'application/ld+json') {
            match = pattern.exec(html)
            continue
        }

        if (!content) {
            scripts.push({
                content,
                value: null,
                parseError: 'empty_json_ld_script',
            })
            match = pattern.exec(html)
            continue
        }

        try {
            scripts.push({
                content,
                value: JSON.parse(content) as unknown,
                parseError: null,
            })
        } catch (error) {
            scripts.push({
                content,
                value: null,
                parseError: error instanceof Error ? error.message : String(error),
            })
        }

        match = pattern.exec(html)
    }

    return scripts
}

export function findJsonLdNodesByType(scripts: JsonLdScript[], schemaType: string): Array<Record<string, unknown>> {
    const nodes: Array<Record<string, unknown>> = []
    for (const script of scripts) {
        if (!script.value) {
            continue
        }
        collectJsonLdNodes(script.value, nodes)
    }
    return nodes.filter((node) => hasSchemaType(node, schemaType))
}

export function extractJsonLdSchemaTypes(scripts: JsonLdScript[]): string[] {
    const nodes: Array<Record<string, unknown>> = []
    for (const script of scripts) {
        if (!script.value) {
            continue
        }
        collectJsonLdNodes(script.value, nodes)
    }

    const types = new Set<string>()
    for (const node of nodes) {
        const nodeType = node['@type']
        if (typeof nodeType === 'string') {
            types.add(nodeType)
        } else if (Array.isArray(nodeType)) {
            for (const entry of nodeType) {
                if (typeof entry === 'string') {
                    types.add(entry)
                }
            }
        }
    }

    return Array.from(types).sort((left, right) => left.localeCompare(right))
}
