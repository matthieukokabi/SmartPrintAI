/**
 * Read a localized field from a Product row that may have per-locale
 * `nameTranslations` / `descriptionTranslations` JSONB columns
 * (shape: { en, fr, de, es }). Falls back to the canonical English
 * `name` / `description` column when a translation is missing or
 * empty — so EN PDPs stay byte-equivalent and non-EN PDPs degrade
 * gracefully instead of breaking.
 */
type LocalizedJson = Record<string, string | undefined>

export function localized<
    T extends {
        name: string
        description: string
        nameTranslations?: unknown
        descriptionTranslations?: unknown
    },
>(
    product: T,
    locale: string,
    field: 'name' | 'description',
): string {
    const translations = (
        field === 'name' ? product.nameTranslations : product.descriptionTranslations
    ) as LocalizedJson | null | undefined
    const t = translations?.[locale]
    if (typeof t === 'string' && t.trim().length > 0) return t
    return product[field]
}
