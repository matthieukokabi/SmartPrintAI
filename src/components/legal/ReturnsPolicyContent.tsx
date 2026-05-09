import { Fragment } from 'react'
import Link from 'next/link'
import type { LocaleCopy } from '@/lib/i18n'

const SUPPORT_EMAIL = 'help@smartprintai.com'

type Props = {
    copy: LocaleCopy['returns']
}

// Render text that may contain the literal token "{email}" (substituted
// with a mailto: anchor) and "\n" (rendered as <br />). Tokens may
// appear anywhere in the string; both are safe to combine.
function renderText(text: string): React.ReactNode[] {
    const lines = text.split('\n')
    const out: React.ReactNode[] = []
    lines.forEach((line, lineIdx) => {
        if (lineIdx > 0) out.push(<br key={`br-${lineIdx}`} />)
        const parts = line.split('{email}')
        parts.forEach((part, partIdx) => {
            if (part) out.push(<Fragment key={`l${lineIdx}-p${partIdx}`}>{part}</Fragment>)
            if (partIdx < parts.length - 1) {
                out.push(
                    <a
                        key={`l${lineIdx}-email-${partIdx}`}
                        href={`mailto:${SUPPORT_EMAIL}`}
                        className="text-purple-300 hover:text-purple-200"
                    >
                        {SUPPORT_EMAIL}
                    </a>,
                )
            }
        })
    })
    return out
}

export default function ReturnsPolicyContent({ copy }: Props) {
    return (
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{copy.title}</h1>
            <p className="mt-3 text-sm text-muted-foreground">{copy.effectiveDate}</p>

            <div className="mt-8 space-y-6">
                {copy.sections.map((section) => (
                    <section key={section.id} className="glass rounded-2xl p-6">
                        <h2 className="text-xl font-semibold">{section.heading}</h2>
                        {section.body.map((block, blockIdx) => {
                            if (block.type === 'paragraph') {
                                return (
                                    <p
                                        key={blockIdx}
                                        className={`${blockIdx === 0 ? 'mt-2' : 'mt-3'} text-sm text-muted-foreground`}
                                    >
                                        {renderText(block.text)}
                                    </p>
                                )
                            }
                            return (
                                <ul
                                    key={blockIdx}
                                    className={`${blockIdx === 0 ? 'mt-2' : 'mt-3'} list-disc space-y-1 pl-6 text-sm text-muted-foreground`}
                                >
                                    {block.items.map((item, itemIdx) => (
                                        <li key={itemIdx}>{renderText(item)}</li>
                                    ))}
                                </ul>
                            )
                        })}
                        {section.id === 'contact' && (
                            <Link
                                href="/support"
                                className="mt-3 inline-flex text-sm text-purple-300 hover:text-purple-200"
                            >
                                {copy.supportLinkLabel}
                            </Link>
                        )}
                    </section>
                ))}
            </div>
        </div>
    )
}
