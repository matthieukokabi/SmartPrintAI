'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    DEFAULT_LOCALE,
    getLocaleCopy,
    isSupportedLocale,
    type SupportedLocale,
} from '@/lib/i18n'

function detectLocaleFromPathname(pathname: string | null): SupportedLocale {
    if (!pathname) return DEFAULT_LOCALE
    const seg = pathname.split('/').filter(Boolean)[0]
    if (seg && isSupportedLocale(seg)) {
        return seg
    }
    return DEFAULT_LOCALE
}

type ErrorPageProps = {
    error: Error & { digest?: string }
    reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
    const pathname = usePathname()
    const locale = detectLocaleFromPathname(pathname)
    const copy = getLocaleCopy(locale).errors.generic

    useEffect(() => {
        // Surface the boundary trip in the browser console so engineers
        // working in a dev tab still see it; production error tracking
        // (Telegram alert via Make.com on the server side) is unaffected.
        console.error('[error-boundary]', error)
    }, [error])

    const homeHref = locale === 'en' ? '/' : `/${locale}`
    const supportHref = locale === 'en' ? '/support' : `/${locale}/support`

    return (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{copy.title}</h1>
            <p className="mt-4 text-sm text-muted-foreground">{copy.body}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#2f6cf3] to-[#26d4b8] px-5 py-2.5 text-sm font-medium text-white"
                >
                    {copy.retry}
                </button>
                <Link
                    href={homeHref}
                    className="inline-flex items-center justify-center rounded-full border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-200"
                >
                    {copy.goHome}
                </Link>
                <Link
                    href={supportHref}
                    className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-purple-300 hover:text-purple-200"
                >
                    {copy.contactSupport}
                </Link>
            </div>
            {error.digest && (
                <p className="mt-6 text-xs text-muted-foreground">
                    {copy.referenceLabel}: <code className="font-mono">{error.digest}</code>
                </p>
            )}
        </div>
    )
}
