import type { Metadata } from 'next'
import { DEFAULT_LOCALE, buildLocaleAlternates, getLocaleCopy } from '@/lib/i18n'

const copy = getLocaleCopy(DEFAULT_LOCALE).support

export const metadata: Metadata = {
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    alternates: {
        canonical: '/support',
        languages: buildLocaleAlternates('/support'),
    },
}

export default function SupportLayout({ children }: { children: React.ReactNode }) {
    return children
}
