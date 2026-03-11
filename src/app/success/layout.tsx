import type { Metadata } from 'next'
import { DEFAULT_LOCALE, buildLocaleAlternates, getLocaleCopy } from '@/lib/i18n'

const copy = getLocaleCopy(DEFAULT_LOCALE).success

export const metadata: Metadata = {
    title: copy.metadataTitle,
    alternates: {
        canonical: '/success',
        languages: buildLocaleAlternates('/success'),
    },
    robots: {
        index: false,
        follow: false,
    },
}

export default function SuccessLayout({ children }: { children: React.ReactNode }) {
    return children
}
