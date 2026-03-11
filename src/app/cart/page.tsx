import CartPageClient from '@/components/cart/CartPageClient'
import { DEFAULT_LOCALE, getLocaleCopy, getLocalizedPath, type SupportedLocale } from '@/lib/i18n'

export default function CartPage() {
    const locale = DEFAULT_LOCALE as SupportedLocale
    const copy = getLocaleCopy(locale).cart

    return <CartPageClient locale={locale} createPath={getLocalizedPath(locale, '/create')} copy={copy} />
}
