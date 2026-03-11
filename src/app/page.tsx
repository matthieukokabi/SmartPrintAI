import type { Metadata } from 'next'
import HomeLanding from '@/components/home/HomeLanding'
import { DEFAULT_LOCALE, buildLocaleAlternates, getLocaleCopy } from '@/lib/i18n'

const copy = getLocaleCopy(DEFAULT_LOCALE).home

export const metadata: Metadata = {
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    alternates: {
        canonical: '/',
        languages: buildLocaleAlternates('/'),
    },
}

export const dynamic = 'force-dynamic'

export default function Home() {
    return <HomeLanding locale={DEFAULT_LOCALE} copy={copy} />
}
