import Link from 'next/link'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, getLocaleCopy, type SupportedLocale } from '@/lib/i18n'

interface LanguageSwitcherProps {
    currentLocale: SupportedLocale
    pagePath: '/' | '/careers'
}

function localePath(locale: SupportedLocale, path: '/' | '/careers'): string {
    if (locale === DEFAULT_LOCALE && path === '/') {
        return '/'
    }
    if (locale === DEFAULT_LOCALE) {
        return path
    }
    if (path === '/') {
        return `/${locale}`
    }
    return `/${locale}${path}`
}

export default function LanguageSwitcher({ currentLocale, pagePath }: LanguageSwitcherProps) {
    return (
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-2 py-1">
            {SUPPORTED_LOCALES.map((locale) => {
                const isActive = locale === currentLocale
                const localeLabel = getLocaleCopy(locale).localeLabel

                return (
                    <Link
                        key={locale}
                        href={localePath(locale, pagePath)}
                        className={`px-2.5 py-1 rounded-full text-xs transition-colors ${isActive
                                ? 'bg-purple-600 text-white'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        {localeLabel}
                    </Link>
                )
            })}
        </div>
    )
}
