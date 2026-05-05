import { Suspense } from 'react'
import CreatePageClient from '@/components/create/CreatePageClient'
import TrustSignalStrip from '@/components/shared/TrustSignalStrip'
import { DEFAULT_LOCALE, getLocaleCopy } from '@/lib/i18n'

export default function CreatePage() {
    const locale = DEFAULT_LOCALE
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
                    <TrustSignalStrip locale={locale} className="mb-8" />
                </div>
            }
        >
            <CreatePageClient locale={locale} copy={copy} />
        </Suspense>
    )
}
