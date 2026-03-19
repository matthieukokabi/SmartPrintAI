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
    promptGuideTitle: string
    promptGuideChecklist: string[]
    promptGuideExampleLabel: string
    promptGuideExamples: string[]
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

type OrderTimelineCopy = {
    statusLabel: string
    paidLabel: string
    paidDescription: string
    processingLabel: string
    processingDescription: string
    shippedLabel: string
    shippedDescription: string
    manualReviewNote: string
    fulfillmentFailedNote: string
}

type SuccessPageCopy = {
    metadataTitle: string
    heading: string
    subtitle: string
    progressLabel: string
    loadingOrderLabel: string
    orderLabel: string
    totalLabel: string
    viewTrackingLabel: string
    fallbackStepOne: string
    fallbackStepTwo: string
    fallbackStepThree: string
    createAnotherLabel: string
    timeline: OrderTimelineCopy
}

type SupportPageCopy = {
    metadataTitle: string
    metadataDescription: string
    heading: string
    subtitle: string
    contactChannelsLabel: string
    emailLabel: string
    backupLabel: string
    includeOrderIdLabel: string
    returnToOrdersLabel: string
    ordersLinkLabel: string
    nameLabel: string
    namePlaceholder: string
    emailFieldLabel: string
    emailPlaceholder: string
    orderIdLabel: string
    orderIdPlaceholder: string
    subjectLabel: string
    subjectPlaceholder: string
    messageLabel: string
    messagePlaceholder: string
    sendingLabel: string
    sendLabel: string
    fallbackSuccessLabel: string
    fallbackErrorLabel: string
    faqLabel: string
    faqOne: string
    faqTwo: string
    shippingLabel: string
    shippingOne: string
    shippingTwo: string
}

export type LocaleCopy = {
    localeLabel: string
    home: HomePageCopy
    careers: CareersPageCopy
    products: ProductsPageCopy
    productDetail: ProductDetailPageCopy
    create: CreatePageCopy
    cart: CartPageCopy
    success: SuccessPageCopy
    support: SupportPageCopy
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
            promptGuideTitle: 'Prompt guide for clean mockups',
            promptGuideChecklist: [
                'Start with subject + style + mood (example: "vintage tiger mascot, bold comic shading").',
                'Add print constraints: "transparent background, no white box or frame, centered composition".',
                'For mugs and bottles, ask for a simple high-contrast icon/logo with clean edges.',
                'If you need text, keep it short and specify the exact wording.',
            ],
            promptGuideExampleLabel: 'High-performing examples',
            promptGuideExamples: [
                '"Minimalist mountain logo, flat vector style, transparent background, no frame, centered."',
                '"Cute corgi line-art badge, 2-color palette, transparent background, clean cutout edges."',
                '"Cyber tiger emblem, neon blue/orange, transparent background, no text, centered composition."',
            ],
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
        success: {
            metadataTitle: 'Order Success',
            heading: 'Order Confirmed!',
            subtitle: 'Thank you for your order! Your custom product is being produced and will ship within 3-7 business days.',
            progressLabel: 'Order progress',
            loadingOrderLabel: 'Loading order details...',
            orderLabel: 'Order',
            totalLabel: 'Total',
            viewTrackingLabel: 'View full order tracking',
            fallbackStepOne: 'Your design is sent to our production facility',
            fallbackStepTwo: 'Your product is printed with premium quality',
            fallbackStepThree: "You'll receive a tracking email when it ships",
            createAnotherLabel: 'Create Another Design',
            timeline: {
                statusLabel: 'Order status',
                paidLabel: 'Payment confirmed',
                paidDescription: 'Your payment was received successfully.',
                processingLabel: 'In production',
                processingDescription: 'Your item is being prepared and printed.',
                shippedLabel: 'Shipped',
                shippedDescription: 'Your package left production and is on the way.',
                manualReviewNote: 'Order requires manual review before fulfillment starts.',
                fulfillmentFailedNote: 'Fulfillment failed. Support intervention is required.',
            },
        },
        support: {
            metadataTitle: 'Support',
            metadataDescription: 'Contact SmartPrintAI support for order, shipping, and account help.',
            heading: 'Support',
            subtitle: 'We answer all requests within 24 business hours. Shipping issues are prioritized with a 4 business hour target.',
            contactChannelsLabel: 'Contact channels',
            emailLabel: 'Email',
            backupLabel: 'Backup',
            includeOrderIdLabel: 'Include your order ID for faster handling.',
            returnToOrdersLabel: 'Return to',
            ordersLinkLabel: 'orders',
            nameLabel: 'Name',
            namePlaceholder: 'Your name',
            emailFieldLabel: 'Email',
            emailPlaceholder: 'you@example.com',
            orderIdLabel: 'Order ID (optional)',
            orderIdPlaceholder: 'cmm...',
            subjectLabel: 'Subject',
            subjectPlaceholder: 'What do you need help with?',
            messageLabel: 'Message',
            messagePlaceholder: 'Describe the issue, include links/screenshots context if relevant.',
            sendingLabel: 'Sending...',
            sendLabel: 'Send support request',
            fallbackSuccessLabel: 'Support request received.',
            fallbackErrorLabel: 'Unable to submit support request',
            faqLabel: 'FAQ',
            faqOne: 'Order not visible yet? It can take a few minutes after payment for status synchronization.',
            faqTwo: 'Need invoice help? Send order ID and billing email in your support message.',
            shippingLabel: 'Shipping',
            shippingOne: 'Production usually starts right after payment confirmation and shipment notification follows carrier handoff.',
            shippingTwo: 'Shipping incidents are prioritized. Target first response: within 4 business hours.',
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
            promptGuideTitle: 'Guide prompt pour mockups propres',
            promptGuideChecklist: [
                'Commencez par sujet + style + ambiance (ex: "mascotte tigre vintage, ombrage comic").',
                'Ajoutez les contraintes print: "fond transparent, sans cadre/bloc blanc, composition centree".',
                'Pour mugs et bouteilles, demandez un logo/icone simple, contraste fort, bords nets.',
                'Si vous ajoutez du texte, gardez-le court et precisez la phrase exacte.',
            ],
            promptGuideExampleLabel: 'Exemples performants',
            promptGuideExamples: [
                '"Logo montagne minimaliste, style vectoriel plat, fond transparent, sans cadre, centre."',
                '"Badge corgi line-art, palette 2 couleurs, fond transparent, bords de decoupe nets."',
                '"Embleme tigre cyber, neon bleu/orange, fond transparent, sans texte, composition centree."',
            ],
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
        success: {
            metadataTitle: 'Commande confirmee',
            heading: 'Commande confirmee !',
            subtitle: 'Merci pour votre commande ! Votre produit est en production et sera expedie sous 3 a 7 jours ouvres.',
            progressLabel: 'Progression de la commande',
            loadingOrderLabel: 'Chargement des details de commande...',
            orderLabel: 'Commande',
            totalLabel: 'Total',
            viewTrackingLabel: 'Voir le suivi complet',
            fallbackStepOne: 'Votre design est envoye a notre centre de production',
            fallbackStepTwo: 'Votre produit est imprime avec une qualite premium',
            fallbackStepThree: "Vous recevrez un email de suivi lors de l'expedition",
            createAnotherLabel: 'Creer un autre design',
            timeline: {
                statusLabel: 'Statut de la commande',
                paidLabel: 'Paiement confirme',
                paidDescription: 'Votre paiement a bien ete recu.',
                processingLabel: 'En production',
                processingDescription: 'Votre article est en preparation et impression.',
                shippedLabel: 'Expedie',
                shippedDescription: 'Votre colis est en route.',
                manualReviewNote: "La commande necessite une verification manuelle avant la production.",
                fulfillmentFailedNote: "La production a echoue. L'intervention du support est requise.",
            },
        },
        support: {
            metadataTitle: 'Support',
            metadataDescription: "Contactez le support SmartPrintAI pour l'aide commande, livraison ou compte.",
            heading: 'Support',
            subtitle: 'Nous repondons sous 24 heures ouvrables. Les incidents livraison sont priorises avec un objectif de 4 heures.',
            contactChannelsLabel: 'Canaux de contact',
            emailLabel: 'Email',
            backupLabel: 'Secours',
            includeOrderIdLabel: "Ajoutez votre ID de commande pour un traitement plus rapide.",
            returnToOrdersLabel: 'Retour vers',
            ordersLinkLabel: 'commandes',
            nameLabel: 'Nom',
            namePlaceholder: 'Votre nom',
            emailFieldLabel: 'Email',
            emailPlaceholder: 'vous@example.com',
            orderIdLabel: 'ID commande (optionnel)',
            orderIdPlaceholder: 'cmm...',
            subjectLabel: 'Sujet',
            subjectPlaceholder: "De quoi avez-vous besoin ?",
            messageLabel: 'Message',
            messagePlaceholder: 'Decrivez le probleme, ajoutez des liens/captures si utile.',
            sendingLabel: 'Envoi...',
            sendLabel: 'Envoyer la demande',
            fallbackSuccessLabel: 'Demande de support recue.',
            fallbackErrorLabel: "Impossible d'envoyer la demande de support",
            faqLabel: 'FAQ',
            faqOne: "Commande non visible ? La synchronisation du statut peut prendre quelques minutes apres paiement.",
            faqTwo: "Besoin d'une facture ? Envoyez l'ID commande et l'email de facturation dans votre message.",
            shippingLabel: 'Livraison',
            shippingOne: "La production commence generalement juste apres la confirmation du paiement, puis l'avis d'expedition est envoye.",
            shippingTwo: 'Les incidents livraison sont priorises. Premiere reponse cible: sous 4 heures ouvrables.',
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
            promptGuideTitle: 'Prompt-Leitfaden fuer saubere Mockups',
            promptGuideChecklist: [
                'Starte mit Motiv + Stil + Stimmung (z.B. "vintage tiger mascot, bold comic shading").',
                'Fuege Print-Regeln hinzu: "transparenter Hintergrund, kein weisser Rahmen/Block, zentrierte Komposition".',
                'Fuer Tassen und Flaschen: simples kontrastreiches Icon/Logo mit klaren Kanten anfordern.',
                'Wenn Text noetig ist, kurz halten und den exakten Wortlaut nennen.',
            ],
            promptGuideExampleLabel: 'Starke Beispiele',
            promptGuideExamples: [
                '"Minimalistisches Berglogo, flacher Vektorstil, transparenter Hintergrund, ohne Rahmen, zentriert."',
                '"Niedliches Corgi-Lineart-Badge, 2-Farben-Palette, transparenter Hintergrund, klare Cutout-Kanten."',
                '"Cyber-Tiger-Emblem, Neon Blau/Orange, transparenter Hintergrund, kein Text, zentrierte Komposition."',
            ],
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
        success: {
            metadataTitle: 'Bestellung bestaetigt',
            heading: 'Bestellung bestaetigt!',
            subtitle: 'Danke fuer deine Bestellung! Dein Produkt ist in Produktion und wird in 3-7 Werktagen versendet.',
            progressLabel: 'Bestellfortschritt',
            loadingOrderLabel: 'Bestelldetails werden geladen...',
            orderLabel: 'Bestellung',
            totalLabel: 'Gesamt',
            viewTrackingLabel: 'Vollstaendige Sendungsverfolgung anzeigen',
            fallbackStepOne: 'Dein Design wurde an unsere Produktion uebermittelt',
            fallbackStepTwo: 'Dein Produkt wird in Premium-Qualitaet gedruckt',
            fallbackStepThree: 'Du erhaeltst eine Tracking-E-Mail, sobald der Versand startet',
            createAnotherLabel: 'Weiteres Design erstellen',
            timeline: {
                statusLabel: 'Bestellstatus',
                paidLabel: 'Zahlung bestaetigt',
                paidDescription: 'Deine Zahlung wurde erfolgreich empfangen.',
                processingLabel: 'In Produktion',
                processingDescription: 'Dein Artikel wird vorbereitet und gedruckt.',
                shippedLabel: 'Versendet',
                shippedDescription: 'Dein Paket ist unterwegs.',
                manualReviewNote: 'Die Bestellung erfordert eine manuelle Pruefung vor der Produktion.',
                fulfillmentFailedNote: 'Die Produktion ist fehlgeschlagen. Support-Eingriff ist erforderlich.',
            },
        },
        support: {
            metadataTitle: 'Support',
            metadataDescription: 'Kontaktiere den SmartPrintAI Support fuer Hilfe zu Bestellung, Versand und Konto.',
            heading: 'Support',
            subtitle: 'Wir beantworten alle Anfragen innerhalb von 24 Geschaeftsstunden. Versandthemen haben Prioritaet mit 4 Stunden Zielzeit.',
            contactChannelsLabel: 'Kontaktkanaele',
            emailLabel: 'E-Mail',
            backupLabel: 'Backup',
            includeOrderIdLabel: 'Fuer schnellere Bearbeitung bitte die Bestell-ID angeben.',
            returnToOrdersLabel: 'Zurueck zu',
            ordersLinkLabel: 'Bestellungen',
            nameLabel: 'Name',
            namePlaceholder: 'Dein Name',
            emailFieldLabel: 'E-Mail',
            emailPlaceholder: 'du@example.com',
            orderIdLabel: 'Bestell-ID (optional)',
            orderIdPlaceholder: 'cmm...',
            subjectLabel: 'Betreff',
            subjectPlaceholder: 'Wobei brauchst du Hilfe?',
            messageLabel: 'Nachricht',
            messagePlaceholder: 'Beschreibe das Problem und fuege bei Bedarf Links/Screenshots hinzu.',
            sendingLabel: 'Wird gesendet...',
            sendLabel: 'Supportanfrage senden',
            fallbackSuccessLabel: 'Supportanfrage erhalten.',
            fallbackErrorLabel: 'Supportanfrage konnte nicht gesendet werden',
            faqLabel: 'FAQ',
            faqOne: 'Bestellung noch nicht sichtbar? Die Status-Synchronisierung kann nach der Zahlung einige Minuten dauern.',
            faqTwo: 'Hilfe bei der Rechnung? Sende Bestell-ID und Rechnungs-E-Mail in deiner Nachricht.',
            shippingLabel: 'Versand',
            shippingOne: 'Die Produktion startet meist direkt nach der Zahlungsbestaetigung, danach folgt die Versandbenachrichtigung.',
            shippingTwo: 'Versandprobleme sind priorisiert. Ziel fuer die erste Antwort: innerhalb von 4 Geschaeftsstunden.',
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
            promptGuideTitle: 'Guia de prompt para mockups limpios',
            promptGuideChecklist: [
                'Empieza con sujeto + estilo + tono (ej: "mascota tigre vintage, sombreado comic marcado").',
                'Agrega restricciones de impresion: "fondo transparente, sin marco/cuadro blanco, composicion centrada".',
                'Para tazas y botellas, pide icono/logo simple de alto contraste con bordes limpios.',
                'Si necesitas texto, mantenlo corto y define la frase exacta.',
            ],
            promptGuideExampleLabel: 'Ejemplos que suelen funcionar',
            promptGuideExamples: [
                '"Logo minimalista de montana, estilo vectorial plano, fondo transparente, sin marco, centrado."',
                '"Insignia corgi line-art, paleta de 2 colores, fondo transparente, bordes de recorte limpios."',
                '"Emblema tigre cyber, neon azul/naranja, fondo transparente, sin texto, composicion centrada."',
            ],
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
        success: {
            metadataTitle: 'Pedido confirmado',
            heading: 'Pedido confirmado!',
            subtitle: 'Gracias por tu pedido! Tu producto se esta fabricando y se enviara en 3-7 dias habiles.',
            progressLabel: 'Progreso del pedido',
            loadingOrderLabel: 'Cargando detalles del pedido...',
            orderLabel: 'Pedido',
            totalLabel: 'Total',
            viewTrackingLabel: 'Ver seguimiento completo',
            fallbackStepOne: 'Tu diseno se envia a nuestro centro de produccion',
            fallbackStepTwo: 'Tu producto se imprime con calidad premium',
            fallbackStepThree: 'Recibiras un correo de seguimiento cuando sea enviado',
            createAnotherLabel: 'Crear otro diseno',
            timeline: {
                statusLabel: 'Estado del pedido',
                paidLabel: 'Pago confirmado',
                paidDescription: 'Tu pago fue recibido correctamente.',
                processingLabel: 'En produccion',
                processingDescription: 'Tu articulo se esta preparando e imprimiendo.',
                shippedLabel: 'Enviado',
                shippedDescription: 'Tu paquete ya esta en camino.',
                manualReviewNote: 'El pedido requiere revision manual antes de iniciar la produccion.',
                fulfillmentFailedNote: 'La produccion fallo. Se requiere intervencion de soporte.',
            },
        },
        support: {
            metadataTitle: 'Soporte',
            metadataDescription: 'Contacta al soporte de SmartPrintAI para ayuda con pedidos, envios y cuenta.',
            heading: 'Soporte',
            subtitle: 'Respondemos todas las solicitudes en 24 horas habiles. Los problemas de envio tienen prioridad con objetivo de 4 horas.',
            contactChannelsLabel: 'Canales de contacto',
            emailLabel: 'Email',
            backupLabel: 'Respaldo',
            includeOrderIdLabel: 'Incluye tu ID de pedido para una atencion mas rapida.',
            returnToOrdersLabel: 'Volver a',
            ordersLinkLabel: 'pedidos',
            nameLabel: 'Nombre',
            namePlaceholder: 'Tu nombre',
            emailFieldLabel: 'Email',
            emailPlaceholder: 'tu@ejemplo.com',
            orderIdLabel: 'ID de pedido (opcional)',
            orderIdPlaceholder: 'cmm...',
            subjectLabel: 'Asunto',
            subjectPlaceholder: 'Con que necesitas ayuda?',
            messageLabel: 'Mensaje',
            messagePlaceholder: 'Describe el problema e incluye enlaces/capturas si aplica.',
            sendingLabel: 'Enviando...',
            sendLabel: 'Enviar solicitud de soporte',
            fallbackSuccessLabel: 'Solicitud de soporte recibida.',
            fallbackErrorLabel: 'No se pudo enviar la solicitud de soporte',
            faqLabel: 'FAQ',
            faqOne: 'Tu pedido no aparece aun? La sincronizacion de estado puede tardar unos minutos despues del pago.',
            faqTwo: 'Necesitas ayuda con factura? Envia ID de pedido y email de facturacion en tu mensaje.',
            shippingLabel: 'Envio',
            shippingOne: 'La produccion suele iniciar justo despues de confirmar el pago y luego llega la notificacion de envio.',
            shippingTwo: 'Los incidentes de envio tienen prioridad. Objetivo de primera respuesta: en 4 horas habiles.',
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

export function buildLocaleCanonical(locale: SupportedLocale, path: string): string {
    return getLocalizedPath(locale, path)
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
