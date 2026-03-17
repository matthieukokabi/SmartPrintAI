export type ProductColorPayload = {
    name: string
    hex: string
    printfulVariantId: number
    previewImageUrl?: string
}

type ColorGroup = {
    name: string
    patterns: RegExp[]
}

const CORE_COLOR_GROUPS: ColorGroup[] = [
    {
        name: 'black',
        patterns: [/\bblack\b/i, /\bjet\s*black\b/i, /\btrue\s*black\b/i],
    },
    {
        name: 'white',
        patterns: [/\bwhite\b/i, /\bivory\b/i, /\bcream\b/i],
    },
    {
        name: 'blue',
        patterns: [/\bblue\b/i, /\bnavy\b/i, /\broyal\b/i, /\bcobalt\b/i],
    },
    {
        name: 'grey',
        patterns: [/\bgrey\b/i, /\bgray\b/i, /\bheather\b/i, /\bcharcoal\b/i],
    },
]

const COLOR_HEX_FALLBACKS: Array<{ pattern: RegExp; hex: string }> = [
    { pattern: /\bblack\b/i, hex: '#111827' },
    { pattern: /\bwhite\b/i, hex: '#FFFFFF' },
    { pattern: /\bblue\b|\bnavy\b|\broyal\b/i, hex: '#1D4ED8' },
    { pattern: /\bgrey\b|\bgray\b|\bheather\b|\bcharcoal\b/i, hex: '#6B7280' },
]

function toTitleCase(value: string): string {
    return value
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .map((part) => {
            if (!part) return part
            return part[0].toUpperCase() + part.slice(1).toLowerCase()
        })
        .join(' ')
}

function normalizeNameKey(value: string): string {
    return value.trim().toLowerCase()
}

function dedupeByName<T extends { name: string }>(colors: T[]): T[] {
    const seen = new Set<string>()
    const output: T[] = []

    for (const color of colors) {
        const normalizedName = normalizeNameKey(color.name)
        if (!normalizedName || seen.has(normalizedName)) {
            continue
        }
        seen.add(normalizedName)
        output.push(color)
    }

    return output
}

export function resolveColorHexFromName(colorName: string): string {
    for (const candidate of COLOR_HEX_FALLBACKS) {
        if (candidate.pattern.test(colorName)) {
            return candidate.hex
        }
    }
    return '#FFFFFF'
}

export function pickCoreColorSubset<T extends { name: string }>(colors: T[], maxColors = 4): T[] {
    const deduped = dedupeByName(colors)
    if (deduped.length <= maxColors) {
        return deduped
    }

    const selected: T[] = []
    const usedIndexes = new Set<number>()

    for (const group of CORE_COLOR_GROUPS) {
        const index = deduped.findIndex((color, idx) => {
            if (usedIndexes.has(idx)) return false
            return group.patterns.some((pattern) => pattern.test(color.name))
        })

        if (index >= 0) {
            selected.push(deduped[index])
            usedIndexes.add(index)
        }
    }

    for (let idx = 0; idx < deduped.length && selected.length < maxColors; idx += 1) {
        if (usedIndexes.has(idx)) {
            continue
        }
        selected.push(deduped[idx])
        usedIndexes.add(idx)
    }

    return selected.slice(0, maxColors)
}

export function buildCuratedColorPayloads(
    colorNames: string[],
    options: { previewByName?: Record<string, string>; fallbackVariantId?: number; maxColors?: number } = {}
): ProductColorPayload[] {
    const fallbackVariantId = Number.isFinite(options.fallbackVariantId) ? Number(options.fallbackVariantId) : 0
    const maxColors = options.maxColors ?? 4
    const previewByName = options.previewByName || {}

    const inputNames = colorNames.length > 0 ? colorNames : ['White']
    const rawPayloads = inputNames
        .map((name) => toTitleCase(name))
        .filter(Boolean)
        .map((name) => {
            const normalizedKey = normalizeNameKey(name)
            const previewImageUrl = previewByName[normalizedKey]
            return {
                name,
                hex: resolveColorHexFromName(name),
                printfulVariantId: fallbackVariantId,
                ...(previewImageUrl ? { previewImageUrl } : {}),
            }
        })

    return pickCoreColorSubset(rawPayloads, maxColors)
}

