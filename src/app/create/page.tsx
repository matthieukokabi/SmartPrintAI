import { Suspense } from 'react'
import CreatePageClient from '@/components/create/CreatePageClient'
import { DEFAULT_LOCALE, getLocaleCopy, type SupportedLocale } from '@/lib/i18n'

export default function CreatePage() {
    const locale = DEFAULT_LOCALE as SupportedLocale
    const copy = getLocaleCopy(locale).create

    return (
        <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-12" />}>
            <CreatePageClient locale={locale} copy={copy} />
        </Suspense>
    )
}
