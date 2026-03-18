import type { Metadata } from 'next'
import { DEFAULT_LOCALE, buildLocaleAlternates, getLocaleCopy } from '@/lib/i18n'
import { buildLocalizedSocialMetadata } from '@/lib/metadata'

const copy = getLocaleCopy(DEFAULT_LOCALE).create

export const metadata: Metadata = {
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    alternates: {
        canonical: '/create',
        languages: buildLocaleAlternates('/create'),
    },
    ...buildLocalizedSocialMetadata({
        locale: DEFAULT_LOCALE,
        path: '/create',
        title: copy.metadataTitle,
        description: copy.metadataDescription,
    }),
}

export default function CreateLayout({ children }: { children: React.ReactNode }) {
    return children
}
