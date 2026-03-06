import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata: Metadata = {
    title: 'SmartPrintAI — AI-Powered Custom Products',
    description:
        'Describe your design, watch AI create it, and receive it printed on premium products. T-shirts, mugs, hoodies, and more — shipped to your door.',
    keywords: 'AI design, custom products, print on demand, AI art, custom t-shirt, personalized gifts',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                <Navbar />
                <main style={{ minHeight: 'calc(100vh - 72px - 200px)' }}>{children}</main>
                <Footer />
            </body>
        </html>
    )
}
