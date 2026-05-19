import Link from 'next/link'
import { headers } from 'next/headers'
import {
    DEFAULT_LOCALE,
    getLocaleCopy,
    isSupportedLocale,
    type SupportedLocale,
} from '@/lib/i18n'

function detectLocaleFromPathname(pathname: string): SupportedLocale {
    const seg = pathname.split('/').filter(Boolean)[0]
    if (seg && isSupportedLocale(seg)) {
        return seg
    }
    return DEFAULT_LOCALE
}

export default function NotFoundPage() {
    const pathname = headers().get('x-pathname') || '/'
    const locale = detectLocaleFromPathname(pathname)
    const copy = getLocaleCopy(locale).errors.notFound

    const homeHref = locale === 'en' ? '/' : `/${locale}`
    const createHref = locale === 'en' ? '/create' : `/${locale}/create`

    return (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
            <p className="text-sm uppercase tracking-widest text-muted-foreground">{copy.eyebrow}</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{copy.title}</h1>
            <p className="mt-4 text-sm text-muted-foreground">{copy.body}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                    href={homeHref}
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#2f6cf3] to-[#26d4b8] px-5 py-2.5 text-sm font-medium text-white"
                >
                    {copy.goHome}
                </Link>
                <Link
                    href={createHref}
                    className="inline-flex items-center justify-center rounded-full border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-200"
                >
                    {copy.startCreating}
                </Link>
            </div>
        </div>
    )
}
