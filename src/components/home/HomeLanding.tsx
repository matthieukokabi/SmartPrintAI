import Hero from '@/components/home/Hero'
import HowItWorks from '@/components/home/HowItWorks'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import SampleDesigns from '@/components/home/SampleDesigns'
import FirstOrderDiscountPopup from '@/components/marketing/FirstOrderDiscountPopup'
import { Sparkles } from 'lucide-react'
import Link from 'next/link'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import type { LocaleCopy, SupportedLocale } from '@/lib/i18n'

interface HomeLandingProps {
    locale: SupportedLocale
    copy: LocaleCopy['home']
}

export default function HomeLanding({ locale, copy }: HomeLandingProps) {
    return (
        <>
            <section className="pt-6 pb-2">
                <div className="max-w-7xl mx-auto px-4 flex justify-end">
                    <LanguageSwitcher currentLocale={locale} pagePath="/" />
                </div>
            </section>
            <Hero copy={copy.hero} />
            <HowItWorks copy={copy.howItWorks} />
            <FeaturedProducts copy={copy.featuredProducts} />
            <SampleDesigns copy={copy.sampleDesigns} />
            <FirstOrderDiscountPopup locale={locale} />

            <section className="py-24">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <div className="glass rounded-3xl p-12 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10" />
                        <div className="relative z-10">
                            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                                {copy.cta.titleLead} <span className="text-gradient">{copy.cta.titleAccent}</span>{copy.cta.titleTail}
                            </h2>
                            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                                {copy.cta.subtitle}
                            </p>
                            <Link
                                href="/create"
                                className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity text-lg"
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
