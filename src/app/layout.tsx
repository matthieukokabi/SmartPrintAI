import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics'
import { getMetadataBase } from '@/lib/site'

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
    openGraph: {
        title: 'SmartPrintAI — AI-Powered Custom Print On Demand',
        description: 'Describe your vision, watch AI create it, and get it printed on premium products.',
        url: '/',
        siteName: 'SmartPrintAI',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'SmartPrintAI — AI-Powered Custom Print On Demand',
        description: 'Describe your vision, watch AI create it, and get it printed on premium products.',
    },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="dark">
            <body>
                <GoogleAnalytics />
                <Navbar />
                <main className="min-h-screen pt-16">{children}</main>
                <Footer />
            </body>
        </html>
    )
}
