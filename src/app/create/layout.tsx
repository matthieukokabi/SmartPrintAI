import type { Metadata } from 'next'
import { DEFAULT_LOCALE, buildLocaleAlternates, getLocaleCopy } from '@/lib/i18n'

const copy = getLocaleCopy(DEFAULT_LOCALE).create

export const metadata: Metadata = {
    title: copy.metadataTitle,
    description: copy.metadataDescription,
    alternates: {
        canonical: '/create',
        languages: buildLocaleAlternates('/create'),
    },
}

export default function CreateLayout({ children }: { children: React.ReactNode }) {
    return children
}
