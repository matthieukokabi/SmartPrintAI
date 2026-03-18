import type { Metadata } from 'next'
import { DEFAULT_LOCALE, buildLocaleAlternates, getLocaleCopy } from '@/lib/i18n'
import { buildLocalizedSocialMetadata } from '@/lib/metadata'

const copy = getLocaleCopy(DEFAULT_LOCALE).support

export const metadata: Metadata = {
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    alternates: {
        canonical: '/support',
        languages: buildLocaleAlternates('/support'),
    },
    ...buildLocalizedSocialMetadata({
        locale: DEFAULT_LOCALE,
        path: '/support',
        title: copy.metadataTitle,
        description: copy.metadataDescription,
    }),
}

export default function SupportLayout({ children }: { children: React.ReactNode }) {
    return children
}
