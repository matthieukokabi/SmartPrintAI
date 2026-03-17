import { Suspense } from 'react'
import CreatePageClient from '@/components/create/CreatePageClient'
import { DEFAULT_LOCALE, getLocaleCopy, type SupportedLocale } from '@/lib/i18n'

export default function CreatePage() {
    const locale = DEFAULT_LOCALE as SupportedLocale
    const copy = getLocaleCopy(locale).create

    return (
        <Suspense
            fallback={
                <div className="max-w-7xl mx-auto px-4 py-12">
                    <div className="text-center mb-12">
                        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                            {copy.titleLead} <span className="text-gradient">{copy.titleAccent}</span>
                        </h1>
                        <p className="text-muted-foreground">{copy.subtitle}</p>
                    </div>
                </div>
            }
        >
            <CreatePageClient locale={locale} copy={copy} />
        </Suspense>
    )
}
