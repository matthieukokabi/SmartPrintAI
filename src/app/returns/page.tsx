import type { Metadata } from 'next'
import ReturnsPolicyContent from '@/components/legal/ReturnsPolicyContent'
import { buildLocaleAlternates } from '@/lib/i18n'

export const metadata: Metadata = {
    title: 'Returns & Refund Policy',
    description: 'How to return or refund a custom AI-designed product from SmartPrintAI, including eligibility, timelines, and contact details.',
    alternates: {
        canonical: '/returns',
        languages: buildLocaleAlternates('/returns'),
    },
}

export default function ReturnsPage() {
    return <ReturnsPolicyContent />
}
