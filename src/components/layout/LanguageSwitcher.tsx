import Link from 'next/link'
import { SUPPORTED_LOCALES, getLocaleCopy, getLocalizedPath, type SupportedLocale } from '@/lib/i18n'

interface LanguageSwitcherProps {
    currentLocale: SupportedLocale
    pagePath: string
}

export default function LanguageSwitcher({ currentLocale, pagePath }: LanguageSwitcherProps) {
    return (
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/65 px-2 py-1 shadow-[0_18px_40px_-32px_rgba(0,0,0,0.6)] backdrop-blur-xl">
            {SUPPORTED_LOCALES.map((locale) => {
                const isActive = locale === currentLocale
                const localeLabel = getLocaleCopy(locale).localeLabel

                return (
                    <Link
                        key={locale}
                        href={getLocalizedPath(locale, pagePath)}
                        className={`px-2.5 py-1 rounded-full text-xs transition-colors ${isActive
                                ? 'bg-foreground text-background'
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
