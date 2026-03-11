import type { Metadata } from 'next'
import { DEFAULT_LOCALE, buildLocaleAlternates, getLocaleCopy } from '@/lib/i18n'

const copy = getLocaleCopy(DEFAULT_LOCALE).cart

export const metadata: Metadata = {
    title: copy.metadataTitle,
    alternates: {
        canonical: '/cart',
        languages: buildLocaleAlternates('/cart'),
    },
    robots: {
        index: false,
        follow: false,
    },
}

export default function CartLayout({ children }: { children: React.ReactNode }) {
    return children
}
