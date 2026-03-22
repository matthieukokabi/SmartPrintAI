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
    heroAssurances: string[]
    heroSupportLine: string
    trustTitle: string
    trustSubtitle: string
    whyTitle: string
    whyIntro: string
    whyItems: { title: string; description: string }[]
    howItWorksTitle: string
    howItWorksSubtitle: string
    howItWorksSteps: { title: string; description: string }[]
    featuredTitle: string
    featuredSubtitle: string
    faqTitle: string
    faqItems: { question: string; answer: string }[]
    midCtaTitle: string
    midCtaSubtitle: string
    midCtaPrimary: string
    midCtaSecondary: string
    finalCtaTitle: string
    finalCtaSubtitle: string
    finalCtaSecondary: string
}

const LANDING_COPY: Record<SupportedLocale, LandingLocaleCopy> = {
    en: {
        heroLabel: 'Premium Prompt-to-Product Engine',
        heroTitle: 'Turn one prompt into premium products people actually buy.',
        heroSubtitle:
            'Generate print-ready artwork, preview it on curated products, and launch checkout with reliable fulfillment in a single flow.',
        heroPrimaryCta: 'Start Designing Now',
        heroSecondaryCta: 'View Product Catalog',
        heroAssurances: ['No design software required', 'Transparency-safe mockup flow', 'Secure Stripe checkout'],
        heroSupportLine: 'Need help before you launch?',
        trustTitle: 'Operational trust, built into the buying path',
        trustSubtitle: 'Payments, fulfillment, support, and analytics are integrated so creators can focus on selling, not patching ops.',
        whyTitle: 'Why creators choose SmartPrintAI over generic POD tools',
        whyIntro: 'Built for clean launches, stable mockups, and purchase confidence.',
        whyItems: [
            {
                title: 'Prompt quality controls',
                description: 'Guidance and constraints reduce messy outputs and keep designs centered, clean, and printable.',
            },
            {
                title: 'Curated revenue-safe catalog',
                description: 'Unreliable SKUs are filtered out so buyers only see products with strong preview and fulfillment reliability.',
            },
            {
                title: 'Trust where it converts',
                description: 'Delivery windows, support response timing, and policy links stay visible at decision points.',
            },
        ],
        howItWorksTitle: 'How SmartPrintAI gets you from idea to paid order',
        howItWorksSubtitle: 'Three steps, zero toolchain switching, and no design bottlenecks.',
        howItWorksSteps: [
            {
                title: 'Write a focused prompt',
                description: 'Describe style, composition, and intent to produce artwork tailored for real products.',
            },
            {
                title: 'Approve product-ready mockups',
                description: 'Review fit, scale, and color behavior on curated products before you send traffic.',
            },
            {
                title: 'Launch checkout with confidence',
                description: 'Orders route to the right provider, with shipping visibility and support guardrails in place.',
            },
        ],
        featuredTitle: 'Launch-ready product lineup',
        featuredSubtitle: 'Start with proven formats, then expand once demand is validated.',
        faqTitle: 'Frequently asked questions',
        faqItems: [
            {
                question: 'How fast can I go from prompt to checkout?',
                answer: 'For most creators, the full flow takes a few minutes: prompt, preview, product select, then checkout launch.',
            },
            {
                question: 'Do I need to know design software?',
                answer: 'No. SmartPrintAI is built for prompt-first creation with safeguards that keep output print-ready.',
            },
            {
                question: 'What happens after a customer pays?',
                answer: 'The order is routed to the mapped provider for production and shipping, with support coverage if anything goes wrong.',
            },
        ],
        midCtaTitle: 'Ready to test your first product?',
        midCtaSubtitle: 'Start with one clear concept, validate demand, then scale your catalog intentionally.',
        midCtaPrimary: 'Create My First Product',
        midCtaSecondary: 'Talk to Support',
        finalCtaTitle: 'Build a cleaner creator-commerce pipeline.',
        finalCtaSubtitle: 'From prompt clarity to fulfillment reliability, SmartPrintAI helps you ship products that look premium and sell with confidence.',
        finalCtaSecondary: 'Review Terms',
    },
    fr: {
        heroLabel: 'Moteur premium du prompt au produit',
        heroTitle: 'Transformez un prompt en produits premium qui se vendent.',
        heroSubtitle:
            'Générez un visuel prêt à imprimer, prévisualisez-le sur un catalogue curé, puis lancez le checkout avec un fulfillment fiable.',
        heroPrimaryCta: 'Commencer à créer',
        heroSecondaryCta: 'Voir le catalogue',
        heroAssurances: ['Aucun logiciel design requis', 'Flux mockup sûr pour transparence', 'Paiement Stripe sécurisé'],
        heroSupportLine: 'Besoin d’aide avant le lancement ?',
        trustTitle: 'Confiance opérationnelle intégrée au parcours d’achat',
        trustSubtitle: 'Paiement, fulfillment, support et analytics sont alignés pour vendre sans friction.',
        whyTitle: 'Pourquoi choisir SmartPrintAI plutôt qu’un POD générique',
        whyIntro: 'Conçu pour des lancements propres, des mockups stables et une meilleure conversion.',
        whyItems: [
            {
                title: 'Contrôle qualité des prompts',
                description: 'Des contraintes utiles limitent les sorties confuses et gardent les designs centrés et imprimables.',
            },
            {
                title: 'Catalogue curé orienté revenus',
                description: 'Les SKUs fragiles sont filtrés pour montrer uniquement des options fiables.',
            },
            {
                title: 'Confiance au moment clé',
                description: 'Délais, support et politiques restent visibles quand le client décide de payer.',
            },
        ],
        howItWorksTitle: 'Comment passer de l’idée à la commande payée',
        howItWorksSubtitle: 'Trois étapes claires, sans changer d’outils en continu.',
        howItWorksSteps: [
            {
                title: 'Rédigez un prompt précis',
                description: 'Définissez style et intention pour obtenir un visuel utile en production.',
            },
            {
                title: 'Validez les mockups produits',
                description: 'Vérifiez cadrage, taille et rendu couleur avant de lancer le trafic.',
            },
            {
                title: 'Lancez le checkout sereinement',
                description: 'Les commandes partent au bon fournisseur avec suivi et garde-fous support.',
            },
        ],
        featuredTitle: 'Sélection produits prête au lancement',
        featuredSubtitle: 'Commencez avec des formats fiables, puis élargissez selon la demande.',
        faqTitle: 'Questions fréquentes',
        faqItems: [
            {
                question: 'Combien de temps entre prompt et checkout ?',
                answer: 'Généralement quelques minutes pour générer, prévisualiser et ouvrir le checkout.',
            },
            {
                question: 'Faut-il maîtriser un outil design ?',
                answer: 'Non. Le flux est pensé pour la création par prompt avec garde-fous impression.',
            },
            {
                question: 'Que se passe-t-il après paiement ?',
                answer: 'La commande est envoyée au fournisseur correspondant, puis suivie jusqu’à la livraison.',
            },
        ],
        midCtaTitle: 'Prêt à tester votre premier produit ?',
        midCtaSubtitle: 'Commencez avec un concept simple, validez, puis scalez proprement.',
        midCtaPrimary: 'Créer mon premier produit',
        midCtaSecondary: 'Contacter le support',
        finalCtaTitle: 'Construisez un pipeline creator-commerce plus propre.',
        finalCtaSubtitle:
            'De la clarté du prompt à la fiabilité fulfillment, SmartPrintAI vous aide à vendre avec plus de confiance.',
        finalCtaSecondary: 'Voir les conditions',
    },
    de: {
        heroLabel: 'Premium Prompt-to-Product Engine',
        heroTitle: 'Aus einem Prompt werden Premium-Produkte, die sich verkaufen.',
        heroSubtitle:
            'Erzeuge druckfertige Motive, prüfe sie auf kuratierten Produkten und starte Checkout mit zuverlässigem Fulfillment.',
        heroPrimaryCta: 'Jetzt Design starten',
        heroSecondaryCta: 'Produktkatalog ansehen',
        heroAssurances: ['Keine Design-Software nötig', 'Transparenz-sichere Mockups', 'Sicherer Stripe-Checkout'],
        heroSupportLine: 'Fragen vor dem Launch?',
        trustTitle: 'Operative Sicherheit direkt im Kaufprozess',
        trustSubtitle: 'Payment, Fulfillment, Support und Analytics greifen sauber ineinander.',
        whyTitle: 'Warum SmartPrintAI statt generischer POD-Tools',
        whyIntro: 'Für saubere Launches, stabile Mockups und höhere Kaufzuversicht.',
        whyItems: [
            {
                title: 'Prompt-Qualitätskontrolle',
                description: 'Leitplanken reduzieren unklare Outputs und halten Designs druckfähig.',
            },
            {
                title: 'Umsatzsichere Produktkurierung',
                description: 'Schwache SKUs sind gefiltert, sichtbar bleiben nur verlässliche Optionen.',
            },
            {
                title: 'Vertrauen im Kaufmoment',
                description: 'Lieferfenster, Support-Reaktionszeit und Richtlinien sind sofort sichtbar.',
            },
        ],
        howItWorksTitle: 'So kommst du von Idee zu bezahlter Bestellung',
        howItWorksSubtitle: 'Drei klare Schritte ohne Tool-Wechsel-Chaos.',
        howItWorksSteps: [
            {
                title: 'Präzisen Prompt schreiben',
                description: 'Beschreibe Stil und Komposition für produktionsfähige Motive.',
            },
            {
                title: 'Produkt-Mockups freigeben',
                description: 'Prüfe Maßstab, Platzierung und Farbe vor dem Traffic-Start.',
            },
            {
                title: 'Checkout sicher starten',
                description: 'Orders gehen an den passenden Partner mit Tracking und Support-Schutz.',
            },
        ],
        featuredTitle: 'Launch-fähige Produktauswahl',
        featuredSubtitle: 'Mit bewährten Formaten starten, dann kontrolliert erweitern.',
        faqTitle: 'Häufige Fragen',
        faqItems: [
            {
                question: 'Wie schnell geht es von Prompt zu Checkout?',
                answer: 'Meist nur wenige Minuten für Erstellung, Vorschau und Checkout-Start.',
            },
            {
                question: 'Brauche ich Design-Software?',
                answer: 'Nein. Der Flow ist prompt-first und auf druckfähige Ergebnisse ausgelegt.',
            },
            {
                question: 'Was passiert nach der Zahlung?',
                answer: 'Die Bestellung wird dem richtigen Anbieter übergeben und bis zum Versand verfolgt.',
            },
        ],
        midCtaTitle: 'Bereit für dein erstes Produkt?',
        midCtaSubtitle: 'Starte mit einem klaren Konzept, validiere Nachfrage, skaliere dann gezielt.',
        midCtaPrimary: 'Erstes Produkt erstellen',
        midCtaSecondary: 'Support kontaktieren',
        finalCtaTitle: 'Baue eine sauberere Creator-Commerce-Pipeline.',
        finalCtaSubtitle:
            'Von Prompt-Qualität bis Fulfillment-Zuverlässigkeit hilft SmartPrintAI beim stabilen Verkaufen.',
        finalCtaSecondary: 'AGB ansehen',
    },
    es: {
        heroLabel: 'Motor premium de prompt a producto',
        heroTitle: 'Convierte un prompt en productos premium que sí venden.',
        heroSubtitle:
            'Genera arte listo para impresión, revísalo en productos curados y lanza checkout con fulfillment confiable.',
        heroPrimaryCta: 'Empezar a diseñar',
        heroSecondaryCta: 'Ver catálogo de productos',
        heroAssurances: ['Sin software de diseño', 'Mockups seguros para transparencia', 'Checkout Stripe seguro'],
        heroSupportLine: '¿Necesitas ayuda antes de lanzar?',
        trustTitle: 'Confianza operativa dentro del recorrido de compra',
        trustSubtitle: 'Pago, fulfillment, soporte y analytics unidos para vender sin fricción.',
        whyTitle: 'Por qué SmartPrintAI supera a un POD genérico',
        whyIntro: 'Pensado para lanzamientos limpios, mockups estables y compras con confianza.',
        whyItems: [
            {
                title: 'Control de calidad en prompts',
                description: 'Las guías reducen resultados sucios y mantienen diseño centrado e imprimible.',
            },
            {
                title: 'Catálogo curado para ingresos',
                description: 'Los SKUs inestables se filtran para mostrar solo opciones confiables.',
            },
            {
                title: 'Confianza al momento de pago',
                description: 'Ventanas de entrega, soporte y políticas visibles en el momento clave.',
            },
        ],
        howItWorksTitle: 'Cómo pasar de idea a pedido pagado',
        howItWorksSubtitle: 'Tres pasos claros sin cambiar herramientas todo el tiempo.',
        howItWorksSteps: [
            {
                title: 'Escribe un prompt enfocado',
                description: 'Define estilo y composición para obtener arte útil para producción.',
            },
            {
                title: 'Aprueba mockups de producto',
                description: 'Revisa escala, posición y color antes de enviar tráfico.',
            },
            {
                title: 'Lanza checkout con seguridad',
                description: 'Los pedidos van al proveedor correcto con tracking y cobertura de soporte.',
            },
        ],
        featuredTitle: 'Selección de productos lista para lanzar',
        featuredSubtitle: 'Empieza con formatos confiables y expande según demanda real.',
        faqTitle: 'Preguntas frecuentes',
        faqItems: [
            {
                question: '¿Qué tan rápido voy de prompt a checkout?',
                answer: 'Normalmente en pocos minutos: crear, previsualizar y abrir checkout.',
            },
            {
                question: '¿Necesito experiencia en diseño?',
                answer: 'No. El flujo está hecho para creación por prompt con resultados imprimibles.',
            },
            {
                question: '¿Qué pasa después del pago?',
                answer: 'El pedido se enruta al proveedor correcto y se sigue hasta el envío.',
            },
        ],
        midCtaTitle: '¿Listo para probar tu primer producto?',
        midCtaSubtitle: 'Empieza con un concepto claro, valida demanda y escala con orden.',
        midCtaPrimary: 'Crear mi primer producto',
        midCtaSecondary: 'Hablar con soporte',
        finalCtaTitle: 'Construye un pipeline creator-commerce más limpio.',
        finalCtaSubtitle:
            'Desde la claridad del prompt hasta la confiabilidad del fulfillment, SmartPrintAI te ayuda a vender mejor.',
        finalCtaSecondary: 'Revisar términos',
    },
}

const TRUST_STACK = ['Stripe', 'Printful', 'Gooten', 'Resend', 'GA4', 'Search Console']

const FEATURED_PRODUCT_PREVIEWS = [
    { name: 'Premium Heavyweight Tee', price: '$49', provider: 'Printful', fit: 'Best for statement drops' },
    { name: 'All-Over Zip Hoodie', price: '$113', provider: 'Gooten', fit: 'Best for high-impact graphics' },
    { name: 'Embroidered Dad Cap', price: '$33', provider: 'Printful', fit: 'Best for logo-first brands' },
    { name: 'Canvas Wall Piece', price: '$74', provider: 'Gooten', fit: 'Best for premium home decor' },
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

                <section className="relative overflow-hidden px-4 pb-12 pt-6 sm:px-6 lg:px-8 lg:pb-16 lg:pt-10">
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(249,115,22,0.28),_transparent_68%)] blur-3xl" />
                        <div className="absolute -right-20 top-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(14,165,233,0.24),_transparent_70%)] blur-3xl" />
                    </div>

                    <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-300">
                                <BrandMark size={16} />
                                {text.heroLabel}
                            </div>
                            <h1 className="mt-5 max-w-3xl text-[2rem] font-semibold leading-[1.07] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
                                {text.heroTitle}
                            </h1>
                            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">{text.heroSubtitle}</p>

                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <Link
                                    href="/create"
                                    className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_20px_50px_-28px_rgba(56,189,248,0.7)] transition-transform duration-300 hover:-translate-y-0.5 sm:w-auto"
                                >
                                    {text.heroPrimaryCta}
                                </Link>
                                <Link
                                    href="/products"
                                    className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:bg-white/[0.08] sm:w-auto"
                                >
                                    {text.heroSecondaryCta}
                                </Link>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {text.heroAssurances.map((assurance) => (
                                    <span
                                        key={assurance}
                                        className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-200"
                                    >
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                                        {assurance}
                                    </span>
                                ))}
                            </div>

                            <p className="mt-4 text-sm text-zinc-400">
                                {text.heroSupportLine}{' '}
                                <Link href="/support" className="text-zinc-200 underline underline-offset-4 transition-colors hover:text-white">
                                    Support
                                </Link>{' '}
                                ·{' '}
                                <Link href="/terms" className="text-zinc-200 underline underline-offset-4 transition-colors hover:text-white">
                                    Terms
                                </Link>
                            </p>

                            <div className="mt-8 grid gap-3 sm:grid-cols-3">
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                                    <p className="text-2xl font-semibold tracking-tight text-white">5-15s</p>
                                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-400">Prompt to Design</p>
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

                        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-4 shadow-[0_34px_90px_-60px_rgba(14,165,233,0.65)] backdrop-blur-xl sm:p-5">
                            <div className="rounded-2xl border border-white/10 bg-[#0b1020] p-5">
                                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">{copy.hero.badge}</p>
                                <p className="mt-3 text-sm text-zinc-200">{copy.hero.samplePrompts[2]}</p>
                                <div className="mt-4 rounded-xl border border-white/10 bg-gradient-to-b from-zinc-900 to-[#111a2f] p-4">
                                    <div className="mb-3 h-2 w-20 rounded bg-zinc-700/50" />
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="rounded-lg border border-white/10 bg-gradient-to-br from-orange-400/20 to-sky-400/20 p-3">
                                            <p className="text-xs uppercase tracking-[0.16em] text-zinc-200">Output Quality</p>
                                            <p className="mt-2 text-sm text-zinc-100">Transparency-safe, print-ready pipeline</p>
                                        </div>
                                        <div className="rounded-lg border border-white/10 bg-gradient-to-br from-sky-500/20 to-indigo-500/20 p-3">
                                            <p className="text-xs uppercase tracking-[0.16em] text-zinc-200">Checkout Reliability</p>
                                            <p className="mt-2 text-sm text-zinc-100">Provider routing with order tracking</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="border-y border-white/10 bg-[#070b16]/80 px-4 py-5 sm:px-6 lg:px-8">
                    <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">{text.trustTitle}</p>
                            <p className="mt-2 max-w-3xl text-sm text-zinc-300">{text.trustSubtitle}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 lg:justify-end">
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

                <section id="why-smartprintai" className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
                    <div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 sm:p-8 lg:p-10">
                        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">{text.whyTitle}</h2>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">{text.whyIntro}</p>
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

                <section id="how-it-works" className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
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

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Link
                                href="/create"
                                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_20px_50px_-28px_rgba(56,189,248,0.7)] transition-transform duration-300 hover:-translate-y-0.5 sm:w-auto"
                            >
                                {text.midCtaPrimary}
                            </Link>
                            <Link
                                href="/support"
                                className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:bg-white/[0.08] sm:w-auto"
                            >
                                {text.midCtaSecondary}
                            </Link>
                        </div>
                    </div>
                </section>

                <section id="featured-products" className="px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
                    <div className="mx-auto max-w-7xl">
                        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">{text.featuredTitle}</h2>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">{text.featuredSubtitle}</p>
                        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {FEATURED_PRODUCT_PREVIEWS.map((item, index) => (
                                <article key={item.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                    <div
                                        className={`h-40 rounded-xl border border-white/10 bg-gradient-to-br ${index % 2 === 0 ? 'from-orange-500/20 to-sky-500/20' : 'from-sky-500/20 to-indigo-500/20'
                                            }`}
                                    />
                                    <div className="mt-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <h3 className="text-sm font-semibold text-zinc-100">{item.name}</h3>
                                            <p className="text-sm font-semibold text-white">{item.price}</p>
                                        </div>
                                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-400">{item.provider}</p>
                                        <p className="mt-2 text-sm text-zinc-300">{item.fit}</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
                    <div className="mx-auto max-w-6xl rounded-3xl border border-white/12 bg-gradient-to-r from-orange-500/18 via-[#121a2f] to-sky-500/18 p-6 text-center sm:p-10">
                        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">{text.midCtaTitle}</h2>
                        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-zinc-200 sm:text-base">{text.midCtaSubtitle}</p>
                        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                            <Link
                                href="/create"
                                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-sky-500 px-7 py-3 text-sm font-semibold text-white shadow-[0_22px_54px_-34px_rgba(14,165,233,0.75)] transition-transform duration-300 hover:-translate-y-0.5 sm:w-auto"
                            >
                                {text.midCtaPrimary}
                            </Link>
                            <Link
                                href="/products"
                                className="inline-flex w-full items-center justify-center rounded-xl border border-white/20 bg-white/[0.03] px-7 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:bg-white/[0.09] sm:w-auto"
                            >
                                {text.heroSecondaryCta}
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="px-4 pb-8 sm:px-6 lg:px-8 lg:pb-10">
                    <div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-[#0b1222] p-5 sm:p-8 lg:p-10">
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

                <section className="px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-24">
                    <div className="mx-auto max-w-6xl rounded-3xl border border-white/12 bg-gradient-to-r from-orange-500/20 via-[#121a2f] to-sky-500/20 p-6 text-center sm:p-10 lg:p-12">
                        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-5xl">{text.finalCtaTitle}</h2>
                        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-zinc-200 sm:text-base">{text.finalCtaSubtitle}</p>
                        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                            <Link
                                href="/create"
                                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-sky-500 px-7 py-3 text-sm font-semibold text-white shadow-[0_22px_54px_-34px_rgba(14,165,233,0.75)] transition-transform duration-300 hover:-translate-y-0.5 sm:w-auto"
                            >
                                {text.heroPrimaryCta}
                            </Link>
                            <Link
                                href="/terms"
                                className="inline-flex w-full items-center justify-center rounded-xl border border-white/20 bg-white/[0.03] px-7 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:bg-white/[0.09] sm:w-auto"
                            >
                                {text.finalCtaSecondary}
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
            <FirstOrderDiscountPopup locale={locale} />
        </>
    )
}
