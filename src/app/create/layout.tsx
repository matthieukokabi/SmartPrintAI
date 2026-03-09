import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Create Your Design',
    description: 'Describe your idea and generate custom AI artwork ready for print-on-demand products.',
    alternates: {
        canonical: '/create',
    },
}

export default function CreateLayout({ children }: { children: React.ReactNode }) {
    return children
}
