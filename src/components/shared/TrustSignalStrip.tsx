import Link from 'next/link'
import type { SupportedLocale } from '@/lib/i18n'
import { getTrustSignalModel } from '@/lib/trust'

type TrustSignalStripProps = {
    locale: SupportedLocale
    className?: string
}

export default function TrustSignalStrip({ locale, className }: TrustSignalStripProps) {
    const trust = getTrustSignalModel(locale)
    const wrapperClassName = className ? className : ''

    return (
        <section className={`rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 ${wrapperClassName}`}>
            <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-purple-200">{trust.deliveryLabel}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{trust.deliveryValue}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-purple-200">{trust.supportLabel}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{trust.supportValue}</p>
                    <Link href={trust.supportPath} className="mt-2 inline-block text-xs font-medium text-purple-300 hover:text-purple-200">
                        {trust.supportLinkLabel}
                    </Link>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-purple-200">{trust.returnsLabel}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{trust.returnsValue}</p>
                    <Link href={trust.termsPath} className="mt-2 inline-block text-xs font-medium text-purple-300 hover:text-purple-200">
                        {trust.termsLinkLabel}
                    </Link>
                </div>
            </div>
        </section>
    )
}
