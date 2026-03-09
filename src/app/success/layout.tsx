import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Order Success',
    robots: {
        index: false,
        follow: false,
    },
}

export default function SuccessLayout({ children }: { children: React.ReactNode }) {
    return children
}
