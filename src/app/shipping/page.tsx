import type { Metadata } from 'next'
import ReturnsPolicyContent from '@/components/legal/ReturnsPolicyContent'
import { DEFAULT_LOCALE, buildLocaleAlternates, getLocaleCopy } from '@/lib/i18n'

const copy = getLocaleCopy(DEFAULT_LOCALE).shipping

export const metadata: Metadata = {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: {
        canonical: '/shipping',
        languages: buildLocaleAlternates('/shipping'),
    },
}

export default function ShippingPage() {
    return <ReturnsPolicyContent copy={copy} />
}
