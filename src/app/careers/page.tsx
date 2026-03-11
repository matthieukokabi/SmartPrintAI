import type { Metadata } from 'next'
import CareersLanding from '@/components/careers/CareersLanding'
import { DEFAULT_LOCALE, buildLocaleAlternates, getLocaleCopy } from '@/lib/i18n'

const copy = getLocaleCopy(DEFAULT_LOCALE).careers

export const metadata: Metadata = {
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    alternates: {
        canonical: '/careers',
        languages: buildLocaleAlternates('/careers'),
    },
}

export default function CareersPage() {
    return <CareersLanding locale={DEFAULT_LOCALE} copy={copy} />
}
