export const SUPPORTED_LOCALES = ['en', 'fr', 'de', 'es'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: SupportedLocale = 'en'

export function isSupportedLocale(value: string): value is SupportedLocale {
    return SUPPORTED_LOCALES.includes(value as SupportedLocale)
}

type HeroCopy = {
    badge: string
    titleLead: string
    titleAccent: string
    titleTail: string
    subtitle: string
    inputPlaceholder: string
    createButton: string
    samplePrompts: string[]
}

type HowItWorksStepCopy = {
    title: string
    description: string
}

type HowItWorksCopy = {
    titleLead: string
    titleAccent: string
    subtitle: string
    stepLabel: string
    steps: [HowItWorksStepCopy, HowItWorksStepCopy, HowItWorksStepCopy]
}

type FeaturedProductsCopy = {
    titleLead: string
    titleAccent: string
    subtitle: string
    emptyState: string
    pricePrefix: string
}

type SampleDesignsCopy = {
    titleLead: string
    titleAccent: string
    subtitle: string
    fallbackText: string
}

type HomeCtaCopy = {
    titleLead: string
    titleAccent: string
    titleTail: string
    subtitle: string
    buttonLabel: string
}

type HomePageCopy = {
    metadataTitle: string
    metadataDescription: string
    hero: HeroCopy
    howItWorks: HowItWorksCopy
    featuredProducts: FeaturedProductsCopy
    sampleDesigns: SampleDesignsCopy
    cta: HomeCtaCopy
}

type CareerRoleCopy = {
    title: string
    location: string
    type: string
    summary: string
}

type CareersPageCopy = {
    metadataTitle: string
    metadataDescription: string
    eyebrow: string
    titleLead: string
    titleAccent: string
    subtitle: string
    applyButton: string
    exploreButton: string
    roleSectionTitle: string
    openRoles: CareerRoleCopy[]
    valuesTitle: string
    values: string[]
    closingLine: string
}

type ProductsPageCopy = {
    metadataTitle: string
    metadataDescription: string
    titleLead: string
    titleAccent: string
    subtitle: string
    emptyState: string
}

type ProductDetailPageCopy = {
    notFoundSeoTitle: string
    notFoundTitle: string
    notFoundDescription: string
    backLabel: string
    availableSizesLabel: string
    colorsLabel: string
    designButtonLabel: string
}

type CreatePageCopy = {
    metadataTitle: string
    metadataDescription: string
    titleLead: string
    titleAccent: string
    subtitle: string
    promptPlaceholder: string
    promptGeneratingLabel: string
    promptGenerateLabel: string
    promptTip: string
    styleLabel: string
    chooseProductLabel: string
    loadingProductsLabel: string
    sizeLabel: string
    colorLabel: string
    addToCartLabel: string
    addedToCartLabel: string
    creatingDesignLabel: string
    creatingDesignSubLabel: string
    generatedPlaceholderLabel: string
    regenerateLabel: string
    generatingMockupLabel: string
    mockupPlaceholderLabel: string
}

type CartPageCopy = {
    metadataTitle: string
    emptyTitle: string
    emptySubtitle: string
    startCreatingLabel: string
    headingLabel: string
    sizeLabel: string
    colorLabel: string
    orderSummaryLabel: string
    subtotalLabel: string
    itemsLabel: string
    shippingLabel: string
    totalLabel: string
    checkoutLabel: string
    checkoutFailedLabel: string
    secureCheckoutLabel: string
}

export type LocaleCopy = {
    localeLabel: string
    home: HomePageCopy
    careers: CareersPageCopy
    products: ProductsPageCopy
    productDetail: ProductDetailPageCopy
    create: CreatePageCopy
    cart: CartPageCopy
}

export const LOCALE_COPY: Record<SupportedLocale, LocaleCopy> = {
    en: {
        localeLabel: 'English',
        home: {
            metadataTitle: 'Create Custom AI Print-on-Demand Products',
            metadataDescription:
                'Turn your idea into custom merch in seconds. Generate AI art, preview on t-shirts, hoodies, mugs and more, then order with fast fulfillment.',
            hero: {
                badge: 'AI-Powered Custom Print On Demand',
                titleLead: 'Describe it.',
                titleAccent: 'AI creates it.',
                titleTail: 'We print it.',
                subtitle:
                    'Turn your words into stunning custom products. T-shirts, hoodies, mugs, canvas - all designed by AI in seconds. No design skills needed.',
                inputPlaceholder: 'Describe your design... (e.g., a cosmic cat in a space helmet)',
                createButton: 'Create',
                samplePrompts: [
                    'A golden retriever wearing sunglasses, pop art style',
                    'Japanese cherry blossoms at sunset, watercolor',
                    'Geometric wolf in neon colors',
                    'Vintage Van Gogh style starry night over a city',
                ],
            },
            howItWorks: {
                titleLead: 'How It',
                titleAccent: 'Works',
                subtitle: 'From idea to doorstep in three simple steps',
                stepLabel: 'STEP',
                steps: [
                    {
                        title: 'Describe Your Vision',
                        description: 'Type any idea - a pet portrait, abstract art, or a funny quote. Our AI understands it all.',
                    },
                    {
                        title: 'Pick Your Product',
                        description: 'Choose from 15+ premium products - t-shirts, hoodies, mugs, canvas prints, and more.',
                    },
                    {
                        title: 'We Print & Ship',
                        description: 'Your custom product is printed on demand and shipped worldwide in 3-7 business days.',
                    },
                ],
            },
            featuredProducts: {
                titleLead: 'Print On',
                titleAccent: 'Anything',
                subtitle: 'Your AI-generated designs on premium, high-quality products',
                emptyState: 'Products will appear here after catalog sync.',
                pricePrefix: 'from',
            },
            sampleDesigns: {
                titleLead: "See What's",
                titleAccent: 'Possible',
                subtitle: '8 trending prompt ideas inspired by what buyers love. Tap any to reuse it.',
                fallbackText: 'Showcase image is being prepared',
            },
            cta: {
                titleLead: 'Ready to Create Something',
                titleAccent: 'Amazing',
                titleTail: '?',
                subtitle:
                    'Join thousands of creators making unique custom products with AI. Start for free - only pay when you order.',
                buttonLabel: 'Start Creating',
            },
        },
        careers: {
            metadataTitle: 'Careers',
            metadataDescription: 'Join SmartPrintAI to build AI-native commerce experiences for creators worldwide.',
            eyebrow: 'Careers at SmartPrintAI',
            titleLead: 'Build the future of',
            titleAccent: 'AI-powered commerce',
            subtitle:
                'We help creators turn ideas into premium physical products in minutes. Join us to build a global, fast-moving platform where AI meets real-world manufacturing.',
            applyButton: 'Apply by Email',
            exploreButton: 'Explore the Product',
            roleSectionTitle: 'Open Roles',
            openRoles: [
                {
                    title: 'Senior Full-Stack Engineer',
                    location: 'Remote (Europe-friendly timezone)',
                    type: 'Full-time',
                    summary:
                        'Own product features end-to-end across Next.js, APIs, and commerce workflows. Focus on speed, reliability, and conversion.',
                },
                {
                    title: 'Lifecycle Marketing Lead',
                    location: 'Remote',
                    type: 'Contract / Part-time',
                    summary:
                        'Build acquisition and retention systems across SEO, email, creator campaigns, and marketplace channels.',
                },
                {
                    title: 'Product Designer (Growth)',
                    location: 'Remote',
                    type: 'Full-time',
                    summary:
                        'Design clear and high-converting experiences from prompt input to checkout, with strong visual and UX quality.',
                },
            ],
            valuesTitle: 'How We Work',
            values: [
                'Ship fast, measure impact, iterate weekly.',
                'Default to clear writing, clear ownership, and clear quality bars.',
                'Use AI pragmatically to improve customer outcomes, not to add noise.',
                'Act like owners: customer trust, reliability, and margins matter.',
            ],
            closingLine:
                "Don't see your exact role? Send us your profile and what you want to build at hello@smartprintai.com.",
        },
        products: {
            metadataTitle: 'All Products',
            metadataDescription:
                'Browse SmartPrintAI catalog products and start designing custom print-on-demand items with AI.',
            titleLead: 'All',
            titleAccent: 'Products',
            subtitle: 'Choose a product and start designing with AI',
            emptyState: 'No active products available yet.',
        },
        productDetail: {
            notFoundSeoTitle: 'Product Not Found',
            notFoundTitle: 'Product Not Found',
            notFoundDescription: 'The product you requested is not available.',
            backLabel: 'Back',
            availableSizesLabel: 'Available Sizes',
            colorsLabel: 'Colors',
            designButtonLabel: 'Design This Product with AI',
        },
        create: {
            metadataTitle: 'Create Your Design',
            metadataDescription: 'Describe your idea and generate custom AI artwork ready for print-on-demand products.',
            titleLead: 'Create Your',
            titleAccent: 'Design',
            subtitle: 'Describe it, pick a product, add to cart',
            promptPlaceholder: "Describe your design... e.g., 'A majestic lion made of galaxies and stars'",
            promptGeneratingLabel: 'Generating...',
            promptGenerateLabel: 'Generate Design',
            promptTip:
                'Tip: Artistic and abstract designs work best. For text-based designs, try "minimalist text on solid background" style.',
            styleLabel: 'Style',
            chooseProductLabel: 'Choose a Product',
            loadingProductsLabel: 'Loading products...',
            sizeLabel: 'Size',
            colorLabel: 'Color',
            addToCartLabel: 'Add to Cart',
            addedToCartLabel: 'Added to Cart!',
            creatingDesignLabel: 'Creating your design...',
            creatingDesignSubLabel: 'This usually takes 5-15 seconds',
            generatedPlaceholderLabel: 'Your AI-generated design will appear here',
            regenerateLabel: 'Not happy? Regenerate',
            generatingMockupLabel: 'Generating mockup...',
            mockupPlaceholderLabel: 'Select a product to see your design on it',
        },
        cart: {
            metadataTitle: 'Cart',
            emptyTitle: 'Your cart is empty',
            emptySubtitle: 'Create a custom design and add it to your cart',
            startCreatingLabel: 'Start Creating',
            headingLabel: 'Shopping Cart',
            sizeLabel: 'Size',
            colorLabel: 'Color',
            orderSummaryLabel: 'Order Summary',
            subtotalLabel: 'Subtotal',
            itemsLabel: 'items',
            shippingLabel: 'Shipping',
            totalLabel: 'Total',
            checkoutLabel: 'Checkout with Stripe',
            checkoutFailedLabel: 'Checkout failed. Please try again.',
            secureCheckoutLabel: 'Secure checkout powered by Stripe',
        },
    },
    fr: {
        localeLabel: 'Francais',
        home: {
            metadataTitle: 'Creez des produits personnalises avec IA',
            metadataDescription:
                'Transformez votre idee en produit personnalise en quelques secondes. Generez un visuel IA, previsualisez-le, puis commandez.',
            hero: {
                badge: 'Impression a la demande pilotee par IA',
                titleLead: 'Decrivez-le.',
                titleAccent: "L'IA le cree.",
                titleTail: "Nous l'imprimons.",
                subtitle:
                    'Passez de votre idee a un produit premium en quelques secondes: t-shirts, hoodies, mugs, canvas et plus.',
                inputPlaceholder: 'Decrivez votre design... (ex: chat cosmique en casque spatial)',
                createButton: 'Creer',
                samplePrompts: [
                    'Bouledogue francais drole avec lunettes de soleil, style cartoon',
                    'Cerisiers japonais au coucher du soleil, style aquarelle',
                    'Loup geometrique en couleurs neon',
                    'Nuit etoilee style vintage sur une ville',
                ],
            },
            howItWorks: {
                titleLead: 'Comment ca',
                titleAccent: 'marche',
                subtitle: 'De votre idee a la livraison en 3 etapes simples',
                stepLabel: 'ETAPE',
                steps: [
                    {
                        title: 'Decrivez votre idee',
                        description: 'Entrez votre concept: portrait animal, art abstrait ou citation. Notre IA le comprend.',
                    },
                    {
                        title: 'Choisissez votre produit',
                        description: 'Selectionnez parmi 15+ produits premium: t-shirts, hoodies, mugs, toiles et plus.',
                    },
                    {
                        title: 'Nous imprimons et livrons',
                        description: 'Votre produit est imprime a la demande et livre dans le monde entier en 3 a 7 jours ouvres.',
                    },
                ],
            },
            featuredProducts: {
                titleLead: 'Imprime sur',
                titleAccent: 'tout',
                subtitle: 'Vos designs IA sur des produits premium de haute qualite',
                emptyState: 'Les produits apparaitront ici apres la synchronisation du catalogue.',
                pricePrefix: 'des',
            },
            sampleDesigns: {
                titleLead: 'Voyez ce qui est',
                titleAccent: 'possible',
                subtitle: '8 idees de prompts tendance inspirees des achats reels. Cliquez pour reutiliser.',
                fallbackText: 'Le visuel exemple est en preparation',
            },
            cta: {
                titleLead: 'Pret a creer quelque chose',
                titleAccent: 'd\'incroyable',
                titleTail: '?',
                subtitle: "Commencez gratuitement et payez seulement lors d'une commande.",
                buttonLabel: 'Commencer',
            },
        },
        careers: {
            metadataTitle: 'Carrieres',
            metadataDescription: 'Rejoignez SmartPrintAI pour construire le commerce IA pour les createurs.',
            eyebrow: 'Carrieres chez SmartPrintAI',
            titleLead: 'Construisez le futur du',
            titleAccent: 'commerce IA',
            subtitle:
                'Nous aidons les createurs a transformer leurs idees en produits premium. Rejoignez une equipe rapide et ambitieuse.',
            applyButton: 'Postuler par email',
            exploreButton: 'Decouvrir le produit',
            roleSectionTitle: 'Postes ouverts',
            openRoles: [
                {
                    title: 'Senior Full-Stack Engineer',
                    location: 'Remote (fuseau Europe)',
                    type: 'Temps plein',
                    summary: 'Pilotez des fonctionnalites de bout en bout sur Next.js, API, paiement et fulfillment.',
                },
                {
                    title: 'Lifecycle Marketing Lead',
                    location: 'Remote',
                    type: 'Part-time / Contrat',
                    summary: 'Construisez les moteurs SEO, email, creators et marketplace orientes croissance.',
                },
                {
                    title: 'Product Designer (Growth)',
                    location: 'Remote',
                    type: 'Temps plein',
                    summary: 'Concevez des experiences claires et performantes de la creation au checkout.',
                },
            ],
            valuesTitle: 'Notre facon de travailler',
            values: [
                'Livrer vite, mesurer, iterer chaque semaine.',
                'Clarte dans les ecrits, les decisions et la qualite.',
                "Utiliser l'IA pour des resultats clients concrets.",
                'Agir en proprietaire: confiance client, fiabilite et marge.',
            ],
            closingLine:
                "Vous ne voyez pas le role parfait? Ecrivez-nous avec votre profil et ce que vous voulez construire: hello@smartprintai.com.",
        },
        products: {
            metadataTitle: 'Tous les produits',
            metadataDescription:
                'Parcourez le catalogue SmartPrintAI et lancez vos produits personnalises avec IA.',
            titleLead: 'Tous les',
            titleAccent: 'produits',
            subtitle: 'Choisissez un produit et commencez a designer avec IA',
            emptyState: "Aucun produit actif n'est disponible pour le moment.",
        },
        productDetail: {
            notFoundSeoTitle: 'Produit introuvable',
            notFoundTitle: 'Produit introuvable',
            notFoundDescription: "Le produit demande n'est pas disponible.",
            backLabel: 'Retour',
            availableSizesLabel: 'Tailles disponibles',
            colorsLabel: 'Couleurs',
            designButtonLabel: 'Designer ce produit avec IA',
        },
        create: {
            metadataTitle: 'Creer votre design',
            metadataDescription:
                'Decrivez votre idee et generez un visuel IA pret pour des produits print-on-demand.',
            titleLead: 'Creez votre',
            titleAccent: 'design',
            subtitle: 'Decrivez, choisissez un produit, ajoutez au panier',
            promptPlaceholder: "Decrivez votre design... ex: 'Un lion majestueux compose de galaxies et d'etoiles'",
            promptGeneratingLabel: 'Generation...',
            promptGenerateLabel: 'Generer le design',
            promptTip:
                "Astuce: les styles artistiques et abstraits fonctionnent tres bien. Pour du texte, essayez 'texte minimaliste sur fond uni'.",
            styleLabel: 'Style',
            chooseProductLabel: 'Choisir un produit',
            loadingProductsLabel: 'Chargement des produits...',
            sizeLabel: 'Taille',
            colorLabel: 'Couleur',
            addToCartLabel: 'Ajouter au panier',
            addedToCartLabel: 'Ajoute au panier !',
            creatingDesignLabel: 'Creation de votre design...',
            creatingDesignSubLabel: 'Cela prend generalement 5 a 15 secondes',
            generatedPlaceholderLabel: 'Votre design genere par IA apparaitra ici',
            regenerateLabel: 'Pas satisfait ? Regenerer',
            generatingMockupLabel: 'Generation du mockup...',
            mockupPlaceholderLabel: 'Selectionnez un produit pour voir votre design dessus',
        },
        cart: {
            metadataTitle: 'Panier',
            emptyTitle: 'Votre panier est vide',
            emptySubtitle: 'Creez un design personnalise et ajoutez-le au panier',
            startCreatingLabel: 'Commencer a creer',
            headingLabel: 'Panier',
            sizeLabel: 'Taille',
            colorLabel: 'Couleur',
            orderSummaryLabel: 'Resume de commande',
            subtotalLabel: 'Sous-total',
            itemsLabel: 'articles',
            shippingLabel: 'Livraison',
            totalLabel: 'Total',
            checkoutLabel: 'Payer avec Stripe',
            checkoutFailedLabel: "Echec du paiement. Veuillez reessayer.",
            secureCheckoutLabel: 'Paiement securise propulse par Stripe',
        },
    },
    de: {
        localeLabel: 'Deutsch',
        home: {
            metadataTitle: 'Erstelle personalisierte Produkte mit KI',
            metadataDescription:
                'Verwandle deine Idee in wenigen Sekunden in ein personalisiertes Produkt. KI Design, Vorschau, Bestellung.',
            hero: {
                badge: 'KI-gestuetztes Print-on-Demand',
                titleLead: 'Beschreibe es.',
                titleAccent: 'Die KI erstellt es.',
                titleTail: 'Wir drucken es.',
                subtitle:
                    'Aus Worten werden starke Designs fuer T-Shirts, Hoodies, Tassen, Leinwand und mehr - in Sekunden.',
                inputPlaceholder: 'Beschreibe dein Design... (z.B. kosmische Katze mit Raumhelm)',
                createButton: 'Erstellen',
                samplePrompts: [
                    'Lustige franzoesische Bulldogge mit Sonnenbrille im Cartoon-Stil',
                    'Japanische Kirschblueten bei Sonnenuntergang, Aquarell',
                    'Geometrischer Wolf in Neonfarben',
                    'Vintage Sternenhimmel ueber einer Stadt',
                ],
            },
            howItWorks: {
                titleLead: 'So',
                titleAccent: 'funktioniert es',
                subtitle: 'Von der Idee bis zur Lieferung in 3 einfachen Schritten',
                stepLabel: 'SCHRITT',
                steps: [
                    {
                        title: 'Idee beschreiben',
                        description: 'Schreibe jede Idee: Tierportrait, abstrakte Kunst oder witziges Zitat. Unsere KI versteht alles.',
                    },
                    {
                        title: 'Produkt waehlen',
                        description: 'Waehle aus 15+ Premium-Produkten: Shirts, Hoodies, Tassen, Leinwand und mehr.',
                    },
                    {
                        title: 'Wir drucken und versenden',
                        description: 'Dein Produkt wird on-demand gedruckt und weltweit in 3-7 Werktagen versendet.',
                    },
                ],
            },
            featuredProducts: {
                titleLead: 'Druck auf',
                titleAccent: 'alles',
                subtitle: 'Deine KI-Designs auf hochwertigen Premium-Produkten',
                emptyState: 'Produkte erscheinen hier nach der Katalog-Synchronisierung.',
                pricePrefix: 'ab',
            },
            sampleDesigns: {
                titleLead: 'Sieh was',
                titleAccent: 'moeglich ist',
                subtitle: '8 Trend-Prompts aus realen Kaufinteressen. Klick zum Uebernehmen.',
                fallbackText: 'Showcase-Bild wird vorbereitet',
            },
            cta: {
                titleLead: 'Bereit etwas',
                titleAccent: 'Grossartiges',
                titleTail: 'zu erstellen?',
                subtitle: 'Starte kostenlos und zahle nur, wenn du bestellst.',
                buttonLabel: 'Jetzt starten',
            },
        },
        careers: {
            metadataTitle: 'Karriere',
            metadataDescription: 'Werde Teil von SmartPrintAI und baue KI-Commerce fuer Creator weltweit.',
            eyebrow: 'Karriere bei SmartPrintAI',
            titleLead: 'Baue die Zukunft von',
            titleAccent: 'KI-Commerce',
            subtitle:
                'Wir helfen Creatorn, Ideen in Premium-Produkte zu verwandeln. Arbeite mit uns an einer globalen Plattform.',
            applyButton: 'Per E-Mail bewerben',
            exploreButton: 'Produkt ansehen',
            roleSectionTitle: 'Offene Rollen',
            openRoles: [
                {
                    title: 'Senior Full-Stack Engineer',
                    location: 'Remote (Europa-freundliche Zeitzone)',
                    type: 'Vollzeit',
                    summary: 'Verantworte Features end-to-end in Next.js, APIs, Checkout und Fulfillment.',
                },
                {
                    title: 'Lifecycle Marketing Lead',
                    location: 'Remote',
                    type: 'Teilzeit / Vertrag',
                    summary: 'Baue skalierbare Kanaele fuer SEO, E-Mail, Creator und Marktplatz-Wachstum.',
                },
                {
                    title: 'Product Designer (Growth)',
                    location: 'Remote',
                    type: 'Vollzeit',
                    summary: 'Gestalte klare, conversion-starke Flows von Prompt bis Checkout.',
                },
            ],
            valuesTitle: 'So arbeiten wir',
            values: [
                'Schnell liefern, messen, woechentlich verbessern.',
                'Klarheit in Schreiben, Ownership und Qualitaet.',
                'KI pragmatisch fuer echte Kundenergebnisse einsetzen.',
                'Wie Eigentuemer handeln: Vertrauen, Zuverlaessigkeit, Marge.',
            ],
            closingLine:
                'Du siehst keine perfekte Rolle? Schreib uns mit deinem Profil und was du bauen willst: hello@smartprintai.com.',
        },
        products: {
            metadataTitle: 'Alle Produkte',
            metadataDescription:
                'Entdecke den SmartPrintAI Produktkatalog und starte dein KI-Print-on-Demand Design.',
            titleLead: 'Alle',
            titleAccent: 'Produkte',
            subtitle: 'Waehle ein Produkt und starte dein KI-Design',
            emptyState: 'Noch keine aktiven Produkte verfuegbar.',
        },
        productDetail: {
            notFoundSeoTitle: 'Produkt nicht gefunden',
            notFoundTitle: 'Produkt nicht gefunden',
            notFoundDescription: 'Das angeforderte Produkt ist nicht verfuegbar.',
            backLabel: 'Zurueck',
            availableSizesLabel: 'Verfuegbare Groessen',
            colorsLabel: 'Farben',
            designButtonLabel: 'Dieses Produkt mit KI designen',
        },
        create: {
            metadataTitle: 'Erstelle dein Design',
            metadataDescription:
                'Beschreibe deine Idee und erzeuge KI-Grafiken fuer Print-on-Demand Produkte.',
            titleLead: 'Erstelle dein',
            titleAccent: 'Design',
            subtitle: 'Beschreiben, Produkt waehlen, in den Warenkorb legen',
            promptPlaceholder: "Beschreibe dein Design... z.B. 'Ein majestaetischer Loewe aus Galaxien und Sternen'",
            promptGeneratingLabel: 'Wird erstellt...',
            promptGenerateLabel: 'Design erstellen',
            promptTip:
                'Tipp: Artistische und abstrakte Designs funktionieren am besten. Fuer Text nutze "minimalistischer Text auf einfarbigem Hintergrund".',
            styleLabel: 'Stil',
            chooseProductLabel: 'Produkt waehlen',
            loadingProductsLabel: 'Produkte werden geladen...',
            sizeLabel: 'Groesse',
            colorLabel: 'Farbe',
            addToCartLabel: 'In den Warenkorb',
            addedToCartLabel: 'Zum Warenkorb hinzugefuegt!',
            creatingDesignLabel: 'Dein Design wird erstellt...',
            creatingDesignSubLabel: 'Das dauert normalerweise 5-15 Sekunden',
            generatedPlaceholderLabel: 'Dein KI-generiertes Design erscheint hier',
            regenerateLabel: 'Nicht zufrieden? Neu generieren',
            generatingMockupLabel: 'Mockup wird erstellt...',
            mockupPlaceholderLabel: 'Waehle ein Produkt, um dein Design darauf zu sehen',
        },
        cart: {
            metadataTitle: 'Warenkorb',
            emptyTitle: 'Dein Warenkorb ist leer',
            emptySubtitle: 'Erstelle ein Design und fuege es deinem Warenkorb hinzu',
            startCreatingLabel: 'Jetzt erstellen',
            headingLabel: 'Warenkorb',
            sizeLabel: 'Groesse',
            colorLabel: 'Farbe',
            orderSummaryLabel: 'Bestelluebersicht',
            subtotalLabel: 'Zwischensumme',
            itemsLabel: 'Artikel',
            shippingLabel: 'Versand',
            totalLabel: 'Gesamt',
            checkoutLabel: 'Mit Stripe bezahlen',
            checkoutFailedLabel: 'Checkout fehlgeschlagen. Bitte versuche es erneut.',
            secureCheckoutLabel: 'Sicherer Checkout mit Stripe',
        },
    },
    es: {
        localeLabel: 'Espanol',
        home: {
            metadataTitle: 'Crea productos personalizados con IA',
            metadataDescription:
                'Convierte tu idea en merchandising en segundos. Genera arte con IA, previsualiza y compra con entrega rapida.',
            hero: {
                badge: 'Print on demand impulsado por IA',
                titleLead: 'Descrbelo.',
                titleAccent: 'La IA lo crea.',
                titleTail: 'Nosotros lo imprimimos.',
                subtitle:
                    'Convierte tus palabras en productos personalizados: camisetas, sudaderas, tazas, lienzos y mas.',
                inputPlaceholder: 'Describe tu diseno... (ej: gato cosmico con casco espacial)',
                createButton: 'Crear',
                samplePrompts: [
                    'Bulldog frances gracioso con gafas de sol, estilo cartoon',
                    'Cerezos japoneses al atardecer, acuarela',
                    'Lobo geometrico en colores neon',
                    'Noche estrellada vintage sobre una ciudad',
                ],
            },
            howItWorks: {
                titleLead: 'Como',
                titleAccent: 'funciona',
                subtitle: 'De la idea a tu puerta en 3 pasos simples',
                stepLabel: 'PASO',
                steps: [
                    {
                        title: 'Describe tu vision',
                        description: 'Escribe cualquier idea: retrato de mascota, arte abstracto o frase divertida.',
                    },
                    {
                        title: 'Elige tu producto',
                        description: 'Selecciona entre 15+ productos premium: camisetas, sudaderas, tazas, lienzos y mas.',
                    },
                    {
                        title: 'Imprimimos y enviamos',
                        description: 'Tu producto se imprime bajo demanda y se envia mundialmente en 3-7 dias habiles.',
                    },
                ],
            },
            featuredProducts: {
                titleLead: 'Imprime en',
                titleAccent: 'todo',
                subtitle: 'Tus disenos IA sobre productos premium de alta calidad',
                emptyState: 'Los productos apareceran aqui despues de sincronizar el catalogo.',
                pricePrefix: 'desde',
            },
            sampleDesigns: {
                titleLead: 'Mira lo',
                titleAccent: 'posible',
                subtitle: '8 ideas de prompts en tendencia inspiradas en lo que mas se compra.',
                fallbackText: 'La imagen de ejemplo se esta preparando',
            },
            cta: {
                titleLead: 'Listo para crear algo',
                titleAccent: 'increible',
                titleTail: '?',
                subtitle: 'Comienza gratis y paga solo cuando hagas un pedido.',
                buttonLabel: 'Empezar',
            },
        },
        careers: {
            metadataTitle: 'Carreras',
            metadataDescription: 'Unete a SmartPrintAI para construir comercio con IA para creadores.',
            eyebrow: 'Carreras en SmartPrintAI',
            titleLead: 'Construye el futuro del',
            titleAccent: 'comercio con IA',
            subtitle:
                'Ayudamos a creadores a convertir ideas en productos premium. Sumate a una plataforma global y rapida.',
            applyButton: 'Aplicar por email',
            exploreButton: 'Explorar producto',
            roleSectionTitle: 'Roles abiertos',
            openRoles: [
                {
                    title: 'Senior Full-Stack Engineer',
                    location: 'Remoto (zona horaria compatible con Europa)',
                    type: 'Tiempo completo',
                    summary: 'Lidera funcionalidades end-to-end en Next.js, APIs, checkout y fulfillment.',
                },
                {
                    title: 'Lifecycle Marketing Lead',
                    location: 'Remoto',
                    type: 'Part-time / Contrato',
                    summary: 'Construye motores de crecimiento para SEO, email, creators y marketplaces.',
                },
                {
                    title: 'Product Designer (Growth)',
                    location: 'Remoto',
                    type: 'Tiempo completo',
                    summary: 'Disena experiencias claras y de alta conversion desde prompt hasta checkout.',
                },
            ],
            valuesTitle: 'Como trabajamos',
            values: [
                'Lanzar rapido, medir impacto, iterar cada semana.',
                'Claridad en escritura, ownership y calidad.',
                'Usar IA de forma pragmatica para resultados reales.',
                'Actuar como duenos: confianza, fiabilidad y margen.',
            ],
            closingLine:
                'No ves tu rol exacto? Envia tu perfil y lo que quieres construir a hello@smartprintai.com.',
        },
        products: {
            metadataTitle: 'Todos los productos',
            metadataDescription:
                'Explora el catalogo de SmartPrintAI y empieza a crear productos personalizados con IA.',
            titleLead: 'Todos los',
            titleAccent: 'productos',
            subtitle: 'Elige un producto y empieza a disenar con IA',
            emptyState: 'Todavia no hay productos activos disponibles.',
        },
        productDetail: {
            notFoundSeoTitle: 'Producto no encontrado',
            notFoundTitle: 'Producto no encontrado',
            notFoundDescription: 'El producto solicitado no esta disponible.',
            backLabel: 'Volver',
            availableSizesLabel: 'Tallas disponibles',
            colorsLabel: 'Colores',
            designButtonLabel: 'Disenar este producto con IA',
        },
        create: {
            metadataTitle: 'Crea tu diseno',
            metadataDescription:
                'Describe tu idea y genera arte con IA listo para productos print-on-demand.',
            titleLead: 'Crea tu',
            titleAccent: 'diseno',
            subtitle: 'Describe, elige un producto y anade al carrito',
            promptPlaceholder: "Describe tu diseno... ej: 'Un leon majestuoso hecho de galaxias y estrellas'",
            promptGeneratingLabel: 'Generando...',
            promptGenerateLabel: 'Generar diseno',
            promptTip:
                'Tip: Los estilos artisticos y abstractos funcionan mejor. Para texto, prueba "texto minimalista sobre fondo solido".',
            styleLabel: 'Estilo',
            chooseProductLabel: 'Elegir producto',
            loadingProductsLabel: 'Cargando productos...',
            sizeLabel: 'Talla',
            colorLabel: 'Color',
            addToCartLabel: 'Anadir al carrito',
            addedToCartLabel: 'Anadido al carrito!',
            creatingDesignLabel: 'Creando tu diseno...',
            creatingDesignSubLabel: 'Esto normalmente tarda entre 5 y 15 segundos',
            generatedPlaceholderLabel: 'Tu diseno generado por IA aparecera aqui',
            regenerateLabel: 'No te convence? Regenerar',
            generatingMockupLabel: 'Generando mockup...',
            mockupPlaceholderLabel: 'Selecciona un producto para ver tu diseno en el',
        },
        cart: {
            metadataTitle: 'Carrito',
            emptyTitle: 'Tu carrito esta vacio',
            emptySubtitle: 'Crea un diseno personalizado y anadelo al carrito',
            startCreatingLabel: 'Empezar a crear',
            headingLabel: 'Carrito',
            sizeLabel: 'Talla',
            colorLabel: 'Color',
            orderSummaryLabel: 'Resumen del pedido',
            subtotalLabel: 'Subtotal',
            itemsLabel: 'articulos',
            shippingLabel: 'Envio',
            totalLabel: 'Total',
            checkoutLabel: 'Pagar con Stripe',
            checkoutFailedLabel: 'El pago fallo. Intentalo de nuevo.',
            secureCheckoutLabel: 'Pago seguro impulsado por Stripe',
        },
    },
}

export function getLocaleCopy(locale: SupportedLocale): LocaleCopy {
    return LOCALE_COPY[locale]
}

export function getLocalizedPath(locale: SupportedLocale, path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    if (locale === DEFAULT_LOCALE) {
        return normalizedPath
    }
    if (normalizedPath === '/') {
        return `/${locale}`
    }
    return `/${locale}${normalizedPath}`
}

export function buildLocaleAlternates(path: string): Record<string, string> {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    const languages: Record<string, string> = {}
    for (const locale of SUPPORTED_LOCALES) {
        languages[locale] = getLocalizedPath(locale, normalizedPath)
    }
    languages['x-default'] = normalizedPath
    return languages
}
