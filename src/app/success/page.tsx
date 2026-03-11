import { Suspense } from 'react'
import SuccessPageClient from '@/components/order/SuccessPageClient'
import { DEFAULT_LOCALE, getLocaleCopy, getLocalizedPath, type SupportedLocale } from '@/lib/i18n'

export default function SuccessPage() {
    const locale = DEFAULT_LOCALE as SupportedLocale
    const copy = getLocaleCopy(locale).success

    return (
        <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-24" />}>
            <SuccessPageClient locale={locale} copy={copy} createPath={getLocalizedPath(locale, '/create')} />
        </Suspense>
    )
}
