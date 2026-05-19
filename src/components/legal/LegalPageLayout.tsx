import Link from 'next/link'
import type { ReactNode } from 'react'

// Shared chrome for /privacy + /terms (and any future legal page).
// All copy comes from the page's locale bundle; this component is
// purely structural.
type LegalPageLayoutProps = {
    title: string
    effectiveDate: string
    lastUpdated: string
    sections: Array<{ id: string; label: string }>
    children: ReactNode
}

export default function LegalPageLayout({
    title,
    effectiveDate,
    lastUpdated,
    sections,
    children,
}: LegalPageLayoutProps) {
    return (
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
            <p className="mt-3 text-sm text-muted-foreground">{effectiveDate}</p>
            <p className="text-sm text-muted-foreground">{lastUpdated}</p>

            <nav aria-label={title} className="glass mt-6 rounded-2xl p-4">
                <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                    {sections.map((s) => (
                        <li key={s.id}>
                            <Link href={`#${s.id}`} className="text-purple-300 hover:text-purple-200">
                                {s.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="mt-8 space-y-6">{children}</div>
        </div>
    )
}
