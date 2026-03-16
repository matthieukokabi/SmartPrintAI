export type ProductProvider = 'printful' | 'gelato' | 'gooten' | 'unknown'

export function detectProductProvider(printfulId?: string | null): ProductProvider {
    const normalized = (printfulId || '').trim().toLowerCase()
    if (normalized.startsWith('gelato:')) return 'gelato'
    if (normalized.startsWith('gooten:')) return 'gooten'
    if (/^\d+$/.test(normalized)) return 'printful'
    return 'unknown'
}

export function isGelatoProduct(printfulId?: string | null): boolean {
    return detectProductProvider(printfulId) === 'gelato'
}
