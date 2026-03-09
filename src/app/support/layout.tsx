import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Support',
    description: 'Contact SmartPrintAI support for order, shipping, and account help.',
    alternates: {
        canonical: '/support',
    },
}

export default function SupportLayout({ children }: { children: React.ReactNode }) {
    return children
}
