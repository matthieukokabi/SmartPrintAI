import Link from 'next/link'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import FirstOrderDiscountPopup from '@/components/marketing/FirstOrderDiscountPopup'
import HomeThemeScope from '@/components/home/HomeThemeScope'
import type { LocaleCopy, SupportedLocale } from '@/lib/i18n'
import BrandMark from '@/components/brand/BrandMark'

interface HomeLandingProps {
    locale: SupportedLocale
    copy: LocaleCopy['home']
}

type LandingLocaleCopy = {
    heroLabel: string
    heroTitle: string
    heroSubtitle: string
    heroPrimaryCta: string
    heroSecondaryCta: string
    trustTitle: string
    howItWorksTitle: string
    howItWorksSubtitle: string
    howItWorksSteps: { title: string; description: string }[]
    featuredTitle: string
    whyTitle: string
    whyItems: { title: string; description: string }[]
    faqTitle: string
    faqItems: { question: string; answer: string }[]
    finalCtaTitle: string
    finalCtaSubtitle: string
}

const LANDING_COPY: Record<SupportedLocale, LandingLocaleCopy> = {
    en: {
        heroLabel: 'AI Commerce Engine',
        heroTitle: 'Build premium products from one prompt. Sell with confidence.',
        heroSubtitle:
            'SmartPrintAI turns your idea into production-ready artwork, maps it to curated products, and ships through trusted providers without quality compromise.',
        heroPrimaryCta: 'Launch Your First Design',
        heroSecondaryCta: 'Explore Products',
        trustTitle: 'Trusted infrastructure for real revenue',
        howItWorksTitle: 'From prompt to paid order in minutes',
        howItWorksSubtitle: 'A conversion-first flow designed to remove friction at every stage.',
        howItWorksSteps: [
            {
                title: 'Define the concept',
                description: 'Write one focused prompt with style + output constraints to produce clean, print-ready artwork.',
            },
            {
                title: 'Preview on curated products',
                description: 'Instantly map artwork to launch-safe products with pricing, color controls, and trust guarantees.',
            },
            {
                title: 'Checkout and fulfillment',
                description: 'Route paid orders to production partners with tracking, support SLAs, and operational safeguards.',
            },
        ],
        featuredTitle: 'Launch-ready catalog picks',
        whyTitle: 'Why SmartPrintAI converts better',
        whyItems: [
            {
                title: 'Prompt quality guardrails',
                description: 'Built-in guidance keeps outputs clean, centered, and optimized for physical products.',
            },
            {
                title: 'Revenue-safe product curation',
                description: 'Problematic SKUs are filtered out so buyers only see reliable, high-confidence options.',
            },
            {
                title: 'Trust embedded in the journey',
                description: 'Delivery SLA, support promise, and policy links are visible where purchase decisions happen.',
            },
        ],
        faqTitle: 'Frequently asked questions',
        faqItems: [
            {
                question: 'How fast can I go from idea to checkout?',
                answer: 'Most users can generate a design, preview products, and start checkout in under three minutes.',
            },
            {
                question: 'Do I need design experience?',
                answer: 'No. Prompt guidance and style presets are built to help non-designers generate high-quality outputs quickly.',
            },
            {
                question: 'What happens after payment?',
                answer: 'Your order is routed to the correct provider, then tracked through processing and shipping with support coverage.',
            },
        ],
        finalCtaTitle: 'Design less. Sell faster. Scale cleaner.',
        finalCtaSubtitle: 'Start with one product, validate demand, then expand with confidence.',
    },
    fr: {
        heroLabel: 'Moteur IA Commerce',
        heroTitle: 'Créez des produits premium depuis un seul prompt.',
        heroSubtitle:
            "SmartPrintAI transforme votre idée en visuel prêt à imprimer, l'applique à un catalogue curé, puis lance une exécution fiable.",
        heroPrimaryCta: 'Lancer mon premier design',
        heroSecondaryCta: 'Voir les produits',
        trustTitle: 'Infrastructure fiable pour des ventes réelles',
        howItWorksTitle: 'Du prompt à la commande payée en quelques minutes',
        howItWorksSubtitle: 'Un parcours orienté conversion pour réduire chaque friction.',
        howItWorksSteps: [
            {
                title: 'Définir le concept',
                description: 'Rédigez un prompt clair avec style et contraintes pour générer un visuel imprimable.',
            },
            {
                title: 'Prévisualiser sur des produits curés',
                description: 'Appliquez instantanément le visuel à des produits fiables avec contrôle prix/couleur.',
            },
            {
                title: 'Paiement et fulfillment',
                description: "La commande est routée au bon partenaire avec suivi, support et garde-fous opérationnels.",
            },
        ],
        featuredTitle: 'Sélection catalogue prête au lancement',
        whyTitle: 'Pourquoi SmartPrintAI convertit mieux',
        whyItems: [
            {
                title: 'Guidage prompt orienté qualité',
                description: 'Des garde-fous intégrés produisent des designs propres et centrés pour impression réelle.',
            },
            {
                title: 'Curation produit orientée revenus',
                description: 'Les SKUs risqués sont filtrés pour afficher uniquement des options fiables.',
            },
            {
                title: 'Confiance visible au bon moment',
                description: 'SLA, support et politiques restent visibles pendant la décision d’achat.',
            },
        ],
        faqTitle: 'Questions fréquentes',
        faqItems: [
            {
                question: "Combien de temps entre l'idée et le paiement ?",
                answer: 'Généralement moins de trois minutes pour générer, prévisualiser et lancer le checkout.',
            },
            {
                question: 'Faut-il être designer ?',
                answer: 'Non. Les presets et guides de prompt sont conçus pour des utilisateurs non-designers.',
            },
            {
                question: 'Que se passe-t-il après le paiement ?',
                answer: 'La commande passe en production avec suivi expédition et support selon SLA.',
            },
        ],
        finalCtaTitle: 'Moins de friction créative. Plus de ventes.',
        finalCtaSubtitle: 'Validez rapidement un produit, puis étendez le catalogue avec méthode.',
    },
    de: {
        heroLabel: 'AI Commerce Engine',
        heroTitle: 'Premium-Produkte aus einem Prompt.',
        heroSubtitle:
            'SmartPrintAI erzeugt druckfertige Motive, mappt sie auf kuratierte Produkte und skaliert Fulfillment ohne Qualitätsverlust.',
        heroPrimaryCta: 'Erstes Design starten',
        heroSecondaryCta: 'Produkte ansehen',
        trustTitle: 'Verlässliche Infrastruktur für Umsatz',
        howItWorksTitle: 'Vom Prompt zur bezahlten Bestellung in Minuten',
        howItWorksSubtitle: 'Ein conversion-orientierter Flow mit minimaler Reibung.',
        howItWorksSteps: [
            {
                title: 'Konzept definieren',
                description: 'Ein präziser Prompt mit Stil und Druckvorgaben erzeugt ein sauberes, druckbares Motiv.',
            },
            {
                title: 'Auf kuratierten Produkten prüfen',
                description: 'Direkte Vorschau auf launch-sicheren Produkten mit Preis- und Farbkontrolle.',
            },
            {
                title: 'Checkout und Fulfillment',
                description: 'Bezahlte Orders werden an den richtigen Partner mit Tracking und Support-SLA übergeben.',
            },
        ],
        featuredTitle: 'Launch-fähige Produktauswahl',
        whyTitle: 'Warum SmartPrintAI besser konvertiert',
        whyItems: [
            {
                title: 'Prompt-Leitplanken für Qualität',
                description: 'Guidance verhindert unsaubere Outputs und verbessert Druckresultate deutlich.',
            },
            {
                title: 'Umsatzsichere Produktkurierung',
                description: 'Unzuverlässige SKUs werden entfernt, nur stabile Optionen bleiben sichtbar.',
            },
            {
                title: 'Vertrauen im Kaufmoment',
                description: 'SLA, Support und Richtlinien sind sichtbar, wenn die Kaufentscheidung fällt.',
            },
        ],
        faqTitle: 'Häufige Fragen',
        faqItems: [
            {
                question: 'Wie schnell geht es von Idee zu Checkout?',
                answer: 'In der Regel unter drei Minuten vom Prompt bis zur fertigen Checkout-Session.',
            },
            {
                question: 'Brauche ich Design-Erfahrung?',
                answer: 'Nein. Presets und Prompt-Hinweise sind für schnelle Ergebnisse ohne Design-Background gebaut.',
            },
            {
                question: 'Was passiert nach der Zahlung?',
                answer: 'Die Bestellung geht in Produktion, dann in Versand mit Status-Tracking und Support.',
            },
        ],
        finalCtaTitle: 'Weniger Design-Reibung. Mehr saubere Conversion.',
        finalCtaSubtitle: 'Mit einem Produkt starten, Nachfrage validieren, dann kontrolliert skalieren.',
    },
    es: {
        heroLabel: 'Motor IA Commerce',
        heroTitle: 'Convierte un prompt en producto premium.',
        heroSubtitle:
            'SmartPrintAI genera arte listo para impresión, lo conecta con un catálogo curado y ejecuta fulfillment confiable.',
        heroPrimaryCta: 'Crear mi primer diseño',
        heroSecondaryCta: 'Ver productos',
        trustTitle: 'Infraestructura confiable para ingresos reales',
        howItWorksTitle: 'Del prompt al pedido pagado en minutos',
        howItWorksSubtitle: 'Un flujo orientado a conversión, sin fricción innecesaria.',
        howItWorksSteps: [
            {
                title: 'Definir el concepto',
                description: 'Un prompt claro con estilo y restricciones produce arte limpio listo para impresión.',
            },
            {
                title: 'Previsualizar en productos curados',
                description: 'Vista inmediata en productos confiables con control de color y precio.',
            },
            {
                title: 'Checkout y fulfillment',
                description: 'Los pedidos pagados se enrutan al proveedor correcto con seguimiento y soporte.',
            },
        ],
        featuredTitle: 'Selección de catálogo lista para lanzar',
        whyTitle: 'Por qué SmartPrintAI convierte mejor',
        whyItems: [
            {
                title: 'Guías de prompt para calidad',
                description: 'Reglas integradas para evitar resultados sucios y mejorar la calidad final.',
            },
            {
                title: 'Curación de productos segura',
                description: 'Se filtran SKUs inestables para mostrar solo opciones de alta confianza.',
            },
            {
                title: 'Confianza en el momento de compra',
                description: 'SLA, soporte y políticas visibles cuando el usuario decide pagar.',
            },
        ],
        faqTitle: 'Preguntas frecuentes',
        faqItems: [
            {
                question: '¿Qué tan rápido paso de idea a checkout?',
                answer: 'Normalmente menos de tres minutos desde el prompt hasta iniciar el pago.',
            },
            {
                question: '¿Necesito experiencia en diseño?',
                answer: 'No. Las guías y presets ayudan a generar resultados profesionales rápidamente.',
            },
            {
                question: '¿Qué pasa después del pago?',
                answer: 'El pedido entra en producción y envío con trazabilidad y soporte operativo.',
            },
        ],
        finalCtaTitle: 'Más claridad creativa. Mejor conversión.',
        finalCtaSubtitle: 'Empieza con un producto, valida demanda y escala sin ruido.',
    },
}

const TRUST_STACK = ['Stripe', 'Printful', 'Gooten', 'Resend', 'GA4', 'Search Console']

const FEATURED_PRODUCT_PREVIEWS = [
    { name: 'Premium Heavyweight Tee', price: '$49', provider: 'Printful' },
    { name: 'All-Over Zip Hoodie', price: '$113', provider: 'Gooten' },
    { name: 'Embroidered Dad Cap', price: '$33', provider: 'Printful' },
    { name: 'Canvas Wall Piece', price: '$74', provider: 'Gooten' },
]

export default function HomeLanding({ locale, copy }: HomeLandingProps) {
    const text = LANDING_COPY[locale]

    return (
        <>
            <div className="premium-home-shell bg-[#06080f] text-zinc-100">
                <HomeThemeScope />

                <section className="relative pt-6">
                    <div className="mx-auto flex max-w-7xl justify-center px-4 sm:px-6 lg:justify-end lg:px-8">
                        <LanguageSwitcher currentLocale={locale} pagePath="/" />
                    </div>
                </section>

                <section className="relative overflow-hidden px-4 pb-14 pt-8 sm:px-6 lg:px-8 lg:pb-20 lg:pt-12">
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(249,115,22,0.28),_transparent_68%)] blur-3xl" />
                        <div className="absolute -right-20 top-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(14,165,233,0.24),_transparent_70%)] blur-3xl" />
                    </div>

                    <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-300">
                                <BrandMark size={16} />
                                {text.heroLabel}
                            </div>
                            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
                                {text.heroTitle}
                            </h1>
                            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
                                {text.heroSubtitle}
                            </p>

                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <Link
                                    href="/create"
                                    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_20px_50px_-28px_rgba(56,189,248,0.7)] transition-transform duration-300 hover:-translate-y-0.5"
                                >
                                    {text.heroPrimaryCta}
                                </Link>
                                <Link
                                    href="/products"
                                    className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:bg-white/[0.08]"
                                >
                                    {text.heroSecondaryCta}
                                </Link>
                            </div>

                            <div className="mt-9 grid gap-3 sm:grid-cols-3">
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-2xl font-semibold tracking-tight text-white">5-15s</p>
                                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-400">Design Generation</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-2xl font-semibold tracking-tight text-white">24h</p>
                                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-400">Support Response</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-2xl font-semibold tracking-tight text-white">3-10d</p>
                                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-400">Delivery Window</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-5 shadow-[0_34px_90px_-60px_rgba(14,165,233,0.65)] backdrop-blur-xl">
                            <div className="rounded-2xl border border-white/10 bg-[#0b1020] p-5">
                                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">{copy.hero.badge}</p>
                                <p className="mt-3 text-sm text-zinc-200">{copy.hero.samplePrompts[2]}</p>
                                <div className="mt-4 rounded-xl border border-white/10 bg-gradient-to-b from-zinc-900 to-[#111a2f] p-4">
                                    <div className="mb-3 h-2 w-20 rounded bg-zinc-700/50" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="rounded-lg border border-white/10 bg-gradient-to-br from-orange-400/20 to-sky-400/20 p-3">
                                            <p className="text-xs text-zinc-200">Prompt Quality</p>
                                            <p className="mt-2 text-lg font-semibold text-white">A+</p>
                                        </div>
                                        <div className="rounded-lg border border-white/10 bg-gradient-to-br from-sky-500/20 to-indigo-500/20 p-3">
                                            <p className="text-xs text-zinc-200">Mockup Readiness</p>
                                            <p className="mt-2 text-lg font-semibold text-white">Stable</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="border-y border-white/10 bg-[#070b16]/80 px-4 py-6 sm:px-6 lg:px-8">
                    <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">{text.trustTitle}</p>
                        <div className="flex flex-wrap gap-2">
                            {TRUST_STACK.map((item) => (
                                <span
                                    key={item}
                                    className="rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-200"
                                >
                                    {item}
                                </span>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="how-it-works" className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
                    <div className="mx-auto max-w-7xl">
                        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">{text.howItWorksTitle}</h2>
                        <p className="mt-3 max-w-2xl text-zinc-300">{text.howItWorksSubtitle}</p>

                        <div className="mt-8 grid gap-4 md:grid-cols-3">
                            {text.howItWorksSteps.map((step, index) => (
                                <article key={step.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Step {index + 1}</p>
                                    <h3 className="mt-3 text-xl font-semibold text-white">{step.title}</h3>
                                    <p className="mt-3 text-sm leading-6 text-zinc-300">{step.description}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="px-4 py-6 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">{text.featuredTitle}</h2>
                        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {FEATURED_PRODUCT_PREVIEWS.map((item, index) => (
                                <article key={item.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                    <div
                                        className={`h-40 rounded-xl border border-white/10 bg-gradient-to-br ${index % 2 === 0 ? 'from-orange-500/20 to-sky-500/20' : 'from-sky-500/20 to-indigo-500/20'
                                            }`}
                                    />
                                    <div className="mt-4 flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="text-sm font-semibold text-zinc-100">{item.name}</h3>
                                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-400">{item.provider}</p>
                                        </div>
                                        <p className="text-sm font-semibold text-white">{item.price}</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
                    <div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-7 sm:p-10">
                        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">{text.whyTitle}</h2>
                        <div className="mt-7 grid gap-4 md:grid-cols-3">
                            {text.whyItems.map((item) => (
                                <article key={item.title} className="rounded-2xl border border-white/10 bg-[#090f1e] p-5">
                                    <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                                    <p className="mt-3 text-sm leading-6 text-zinc-300">{item.description}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="px-4 pb-10 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-[#0b1222] p-7 sm:p-10">
                        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">{text.faqTitle}</h2>
                        <div className="mt-6 space-y-3">
                            {text.faqItems.map((item) => (
                                <details key={item.question} className="group rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
                                    <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-100">{item.question}</summary>
                                    <p className="mt-3 text-sm leading-6 text-zinc-300">{item.answer}</p>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="px-4 pb-20 pt-8 sm:px-6 lg:px-8 lg:pb-24">
                    <div className="mx-auto max-w-6xl rounded-3xl border border-white/12 bg-gradient-to-r from-orange-500/20 via-[#121a2f] to-sky-500/20 p-8 text-center sm:p-12">
                        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-5xl">{text.finalCtaTitle}</h2>
                        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-zinc-200 sm:text-base">{text.finalCtaSubtitle}</p>
                        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                            <Link
                                href="/create"
                                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-sky-500 px-7 py-3 text-sm font-semibold text-white shadow-[0_22px_54px_-34px_rgba(14,165,233,0.75)] transition-transform duration-300 hover:-translate-y-0.5"
                            >
                                {text.heroPrimaryCta}
                            </Link>
                            <Link
                                href="/support"
                                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/[0.03] px-7 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:bg-white/[0.09]"
                            >
                                Talk to Support
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
            <FirstOrderDiscountPopup locale={locale} />
        </>
    )
}
