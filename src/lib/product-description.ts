const NAMED_ENTITY_MAP: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    '#39': "'",
}

function decodeHtmlEntities(input: string): string {
    return input
        .replace(/&#(\d+);/g, (_, rawCode: string) => {
            const code = Number.parseInt(rawCode, 10)
            if (!Number.isFinite(code) || code <= 0) {
                return ''
            }
            return String.fromCodePoint(code)
        })
        .replace(/&#x([0-9a-f]+);/gi, (_, rawHex: string) => {
            const code = Number.parseInt(rawHex, 16)
            if (!Number.isFinite(code) || code <= 0) {
                return ''
            }
            return String.fromCodePoint(code)
        })
        .replace(/&([a-z0-9#]+);/gi, (match: string, entity: string) => {
            const mapped = NAMED_ENTITY_MAP[entity.toLowerCase()]
            return mapped ?? match
        })
}

function stripHtmlTags(input: string): string {
    return input
        .replace(/<\s*br\s*\/?>/gi, '\n')
        .replace(/<\/\s*(p|div|li|tr|td|th|table|ul|ol|h[1-6])\s*>/gi, '\n')
        .replace(/<[^>]*>/g, ' ')
}

function trimToSentenceBoundary(input: string, maxLength: number): string {
    if (input.length <= maxLength) {
        return input
    }

    const truncated = input.slice(0, maxLength)
    const lastSentenceBoundary = Math.max(
        truncated.lastIndexOf('. '),
        truncated.lastIndexOf('! '),
        truncated.lastIndexOf('? ')
    )

    if (lastSentenceBoundary > maxLength * 0.45) {
        return truncated.slice(0, lastSentenceBoundary + 1).trim()
    }

    return `${truncated.trimEnd()}…`
}

export function normalizeProductDescription(
    value: string | null | undefined,
    fallback: string,
    maxMarkupLength = 420
): string {
    const raw = (value || '').trim()
    if (!raw) {
        return fallback
    }

    const hasMarkupSignals = /<[^>]+>|&lt;|&gt;|&amp;|&#\d+;|&#x[a-f0-9]+;/i.test(raw)
    let normalized = raw

    if (hasMarkupSignals) {
        // Decode twice to handle single and nested-encoded HTML entities.
        normalized = decodeHtmlEntities(decodeHtmlEntities(normalized))
        normalized = stripHtmlTags(normalized)
    }

    normalized = normalized
        .replace(/\s+([,.!?;:])/g, '$1')
        .replace(/\s+/g, ' ')
        .trim()

    if (!normalized) {
        return fallback
    }

    if (hasMarkupSignals) {
        return trimToSentenceBoundary(normalized, maxMarkupLength)
    }

    return normalized
}
