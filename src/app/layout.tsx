import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Script from 'next/script'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics'
import CookieConsentBanner from '@/components/consent/CookieConsentBanner'
import { getMetadataBase } from '@/lib/site'
import { DEFAULT_LOCALE, isSupportedLocale, type SupportedLocale } from '@/lib/i18n'

function detectLocaleFromPathname(pathname: string): SupportedLocale {
    const seg = pathname.split('/').filter(Boolean)[0]
    if (seg && isSupportedLocale(seg)) {
        return seg
    }
    return DEFAULT_LOCALE
}

export const metadata: Metadata = {
    metadataBase: getMetadataBase(),
    title: {
        default: 'SmartPrintAI — AI-Powered Custom Print On Demand',
        template: '%s | SmartPrintAI',
    },
    description: 'Describe your vision, watch AI create it, and get it printed on premium products. T-shirts, hoodies, mugs, canvas — all custom designed by AI in seconds.',
    keywords: 'custom ai art, print on demand, ai design, custom t-shirt, personalized gifts',
    alternates: {
        canonical: '/',
    },
    manifest: '/manifest.webmanifest',
    icons: {
        icon: [
            { url: '/favicon.ico' },
            { url: '/icon?size=32', sizes: '32x32', type: 'image/png' },
            { url: '/icon?size=192', sizes: '192x192', type: 'image/png' },
            { url: '/icon?size=512', sizes: '512x512', type: 'image/png' },
        ],
        apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
        shortcut: ['/favicon.ico'],
    },
    openGraph: {
        title: 'SmartPrintAI — AI-Powered Custom Print On Demand',
        description: 'Describe your vision, watch AI create it, and get it printed on premium products.',
        url: '/',
        siteName: 'SmartPrintAI',
        type: 'website',
        images: [
            {
                url: '/opengraph-image.png',
                width: 1200,
                height: 630,
                alt: 'SmartPrintAI — AI-powered custom print-on-demand designs',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'SmartPrintAI — AI-Powered Custom Print On Demand',
        description: 'Describe your vision, watch AI create it, and get it printed on premium products.',
        images: ['/twitter-image.png'],
    },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    const pathname = headers().get('x-pathname') || '/'
    const locale = detectLocaleFromPathname(pathname)

    return (
        <html lang={locale} suppressHydrationWarning>
            <body className="overflow-x-hidden">
                <Script id="theme-init" src="/theme-init.js" strategy="beforeInteractive" />
                <GoogleAnalytics />
                <Navbar />
                <main className="min-h-screen pt-20">{children}</main>
                <Footer />
                <CookieConsentBanner locale={locale} />
            </body>
        </html>
    )
}
