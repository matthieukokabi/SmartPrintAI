import SupportPageClient from '@/components/support/SupportPageClient'
import { DEFAULT_LOCALE, getLocaleCopy, type SupportedLocale } from '@/lib/i18n'

export default function SupportPage() {
    const locale = DEFAULT_LOCALE as SupportedLocale
    const copy = getLocaleCopy(locale).support

    return <SupportPageClient locale={locale} copy={copy} />
}
