import type { Metadata } from 'next'
import HomeLanding from '@/components/home/HomeLanding'
import { DEFAULT_LOCALE, buildLocaleAlternates, getLocaleCopy } from '@/lib/i18n'
import { buildLocalizedSocialMetadata } from '@/lib/metadata'

const SITE_URL = 'https://smartprintai.com'
const copy = getLocaleCopy(DEFAULT_LOCALE).home

export const metadata: Metadata = {
        title: copy.metadataTitle,
        description: copy.metadataDescription,
        alternates: {
                    canonical: SITE_URL,
                    languages: buildLocaleAlternates('/'),
        },
        ...buildLocalizedSocialMetadata({
                    locale: DEFAULT_LOCALE,
                    path: '/',
                    title: copy.metadataTitle,
                    description: copy.metadataDescription,
        }),
}

export default function Home() {
        return <HomeLanding locale={DEFAULT_LOCALE} copy={copy} />
}
