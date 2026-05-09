import type { Metadata } from 'next'
import ReturnsPolicyContent from '@/components/legal/ReturnsPolicyContent'
import { DEFAULT_LOCALE, buildLocaleAlternates, getLocaleCopy } from '@/lib/i18n'

const copy = getLocaleCopy(DEFAULT_LOCALE).returns

export const metadata: Metadata = {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: {
        canonical: '/returns',
        languages: buildLocaleAlternates('/returns'),
    },
}

export default function ReturnsPage() {
    return <ReturnsPolicyContent copy={copy} />
}
