import Hero from '@/components/home/Hero'
import HowItWorks from '@/components/home/HowItWorks'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import SampleDesigns from '@/components/home/SampleDesigns'
import FirstOrderDiscountPopup from '@/components/marketing/FirstOrderDiscountPopup'
import { Sparkles } from 'lucide-react'
import Link from 'next/link'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import type { LocaleCopy, SupportedLocale } from '@/lib/i18n'
import HomeThemeScope from '@/components/home/HomeThemeScope'

interface HomeLandingProps {
    locale: SupportedLocale
    copy: LocaleCopy['home']
}

export default function HomeLanding({ locale, copy }: HomeLandingProps) {
    return (
        <>
            <HomeThemeScope />
            <div className="premium-home-shell">
                <section className="relative pt-6">
                    <div className="mx-auto flex max-w-7xl justify-end px-4 sm:px-6 lg:px-8">
                        <LanguageSwitcher currentLocale={locale} pagePath="/" />
                    </div>
                </section>

                <Hero copy={copy.hero} />
                <HowItWorks copy={copy.howItWorks} />
                <FeaturedProducts copy={copy.featuredProducts} />
                <SampleDesigns copy={copy.sampleDesigns} />
            </div>
            <FirstOrderDiscountPopup locale={locale} />

            <section className="premium-home-shell py-24 sm:py-28">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                    <div className="premium-panel relative overflow-hidden rounded-[2.5rem] p-8 text-center sm:p-12">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--premium-line-strong))] to-transparent" />
                        <div className="absolute -left-10 top-8 h-40 w-40 rounded-full bg-[radial-gradient(circle,hsl(var(--premium-spot)/0.2),transparent_70%)] blur-2xl" />
                        <div className="absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,hsl(var(--premium-spot-alt)/0.18),transparent_72%)] blur-3xl" />
                        <div className="relative z-10">
                            <div className="premium-chip inline-flex rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em]">
                                {copy.cta.buttonLabel}
                            </div>
                            <h2 className="mt-6 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                                {copy.cta.titleLead} <span className="font-editorial text-gradient">{copy.cta.titleAccent}</span>{copy.cta.titleTail}
                            </h2>
                            <p className="premium-muted mx-auto mb-8 mt-5 max-w-2xl text-base leading-7 sm:text-lg">
                                {copy.cta.subtitle}
                            </p>
                            <Link
                                href="/create"
                                className="premium-primaryButton inline-flex items-center gap-2 rounded-full px-8 py-3 text-lg font-medium transition-transform duration-300 hover:opacity-95"
                            >
                                <Sparkles className="w-5 h-5" />
                                {copy.cta.buttonLabel}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}
