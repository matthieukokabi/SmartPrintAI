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
    readyToBuyOnlyLabel: string
    readyToBuyAddToCartLabel: string
    readyToBuyAddedToCartLabel: string
    readyToBuyGoToCartLabel: string
}

type CreatePageCopy = {
    metadataTitle: string
    metadataDescription: string
    titleLead: string
    titleAccent: string
    subtitle: string
    entryStepLabel: string
    entryStepTitle: string
    entryStepHint: string
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
    cartButton: {
        notReady: string
        generating: string
        unavailable: string
    }
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
    nextStepsLabel: string
    manualReviewReassurance: string
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

export type ReturnsBodyBlock =
    | { type: 'paragraph'; text: string }
    | { type: 'list'; items: string[] }

export type ReturnsSection = {
    id: string
    heading: string
    body: ReturnsBodyBlock[]
}

export type ReturnsPageCopy = {
    metaTitle: string
    metaDescription: string
    title: string
    effectiveDate: string
    sections: ReturnsSection[]
    supportLinkLabel: string
}

// Shipping page copy reuses the same shape as returns — sections of
// paragraphs and lists, with optional {email} substitution and \n line
// breaks. Aliased so the renderer (ReturnsPolicyContent) accepts both
// without semantic confusion at call sites.
export type ShippingPageCopy = ReturnsPageCopy

// English returns/refund policy copy. Sections render in array order.
// Strings may contain the literal token "{email}" — the renderer
// substitutes a mailto: link at render time. Paragraph text may
// contain "\n" for line breaks (rendered as <br />).
//
// Phase 1 (this commit): English-only. fr/de/es bundles literally
// reference this same object so /[locale]/returns continues to
// render English content while translation effort is tracked
// separately. Phase 2 will replace those references with localized
// constants.
const enReturnsCopy: ReturnsPageCopy = {
    metaTitle: 'Returns & Refund Policy',
    metaDescription: 'How to return or refund a custom AI-designed product from SmartPrintAI, including eligibility, timelines, and contact details.',
    title: 'Returns & Refund Policy',
    effectiveDate: 'Effective date: April 24, 2026',
    sections: [
        {
            id: 'summary',
            heading: 'Summary',
            body: [
                {
                    type: 'paragraph',
                    text: 'Custom AI-designed products are made to order specifically for you. We accept returns and issue refunds when an item arrives damaged, defective, or materially different from what was ordered. We cannot accept returns for buyer’s-remorse, design dissatisfaction, or wrong size when the size matches the option you selected at checkout, because each item is custom-printed and cannot be resold.',
                },
            ],
        },
        {
            id: 'eligibility',
            heading: 'Eligibility window',
            body: [
                {
                    type: 'paragraph',
                    text: 'You have 30 days from the delivery date shown by the carrier to request a return for a damaged, defective, or incorrect item.',
                },
            ],
        },
        {
            id: 'how-to-request',
            heading: 'How to request a return or refund',
            body: [
                { type: 'paragraph', text: 'Email {email} within the 30-day window with:' },
                {
                    type: 'list',
                    items: [
                        'your order number,',
                        'the affected item(s),',
                        'clear photos showing the issue (front, back, and a close-up of the defect),',
                        'whether you would prefer a free replacement or a refund to your original payment method.',
                    ],
                },
                { type: 'paragraph', text: 'We respond to all return requests within 1 business day.' },
            ],
        },
        {
            id: 'what-we-replace',
            heading: 'What we replace or refund for free',
            body: [
                {
                    type: 'list',
                    items: [
                        'Items that arrive damaged or defective.',
                        'Items printed with the wrong design, wrong product, wrong size, or wrong color compared to your confirmed order.',
                        'Items that never arrive (lost in transit) once the carrier has confirmed the parcel as lost.',
                    ],
                },
                {
                    type: 'paragraph',
                    text: 'In these cases we cover all return shipping costs and ship a replacement at no charge, or refund the full amount paid (item + original shipping) to your original payment method. Refunds are processed within 5 business days of approval; depending on your card issuer or bank, they typically post within 5–10 business days after that.',
                },
            ],
        },
        {
            id: 'final-sale',
            heading: 'What is final sale (no refund)',
            body: [
                {
                    type: 'list',
                    items: [
                        'Buyer’s-remorse on a correctly produced custom item.',
                        'Wrong size when the size you received matches the size selected at checkout.',
                        'Designs that look different from your expectation when the printed result matches the AI-generated preview you approved before payment.',
                    ],
                },
            ],
        },
        {
            id: 'cancellations',
            heading: 'Order cancellations',
            body: [
                {
                    type: 'paragraph',
                    text: 'You can cancel an order at no charge within 1 hour of placing it, before production begins. Email {email} with your order number. After production has started we cannot cancel, but the return policy above still applies if anything is wrong on arrival.',
                },
            ],
        },
        {
            id: 'damaged-on-arrival',
            heading: 'Damaged on arrival',
            body: [
                {
                    type: 'paragraph',
                    text: 'Photograph the parcel and product within 7 days of delivery and email {email}. We will arrange a free replacement or full refund.',
                },
            ],
        },
        {
            id: 'lost-in-transit',
            heading: 'Lost in transit',
            body: [
                {
                    type: 'paragraph',
                    text: 'If tracking has not updated for 10 consecutive business days for a US shipment (or 21 for international), email {email}. We will open a carrier claim and ship a replacement or issue a full refund.',
                },
            ],
        },
        {
            id: 'return-shipping',
            heading: 'Return shipping',
            body: [
                {
                    type: 'paragraph',
                    text: 'For free returns (damaged, defective, incorrect), we email you a prepaid return label. Do not ship items back without contacting us first — unsolicited returns cannot be processed.',
                },
            ],
        },
        {
            id: 'contact',
            heading: 'Contact',
            body: [
                {
                    type: 'paragraph',
                    text: 'SmartPrintAI Support\nEmail: {email}\nResponse time: within 1 business day, Monday–Friday.',
                },
            ],
        },
    ],
    supportLinkLabel: 'Go to support',
}

// ─── French ─────────────────────────────────────────────────────────

const frReturnsCopy: ReturnsPageCopy = {
    metaTitle: 'Politique de retour et de remboursement',
    metaDescription: 'Comment retourner ou obtenir un remboursement pour un produit personnalisé conçu par IA chez SmartPrintAI, y compris les conditions, les délais et les coordonnées de contact.',
    title: 'Politique de retour et de remboursement',
    effectiveDate: "Date d'effet : 24 avril 2026",
    sections: [
        {
            id: 'summary',
            heading: 'Résumé',
            body: [
                {
                    type: 'paragraph',
                    text: "Les produits personnalisés conçus par IA sont fabriqués sur commande spécialement pour vous. Nous acceptons les retours et émettons des remboursements lorsqu'un article arrive endommagé, défectueux ou matériellement différent de celui commandé. Nous ne pouvons pas accepter les retours pour remords de l'acheteur, insatisfaction du design, ou taille incorrecte lorsque celle-ci correspond à l'option sélectionnée au moment du paiement, car chaque article est imprimé sur mesure et ne peut pas être revendu.",
                },
            ],
        },
        {
            id: 'eligibility',
            heading: "Délai d'éligibilité",
            body: [
                {
                    type: 'paragraph',
                    text: 'Vous disposez de 30 jours à compter de la date de livraison indiquée par le transporteur pour demander un retour pour un article endommagé, défectueux ou incorrect.',
                },
            ],
        },
        {
            id: 'how-to-request',
            heading: 'Comment demander un retour ou un remboursement',
            body: [
                { type: 'paragraph', text: 'Envoyez un e-mail à {email} dans le délai de 30 jours en indiquant :' },
                {
                    type: 'list',
                    items: [
                        'votre numéro de commande,',
                        'le ou les articles concernés,',
                        'des photos claires montrant le problème (face, dos et gros plan du défaut),',
                        'si vous préférez un remplacement gratuit ou un remboursement sur votre moyen de paiement initial.',
                    ],
                },
                { type: 'paragraph', text: 'Nous répondons à toutes les demandes de retour sous 1 jour ouvré.' },
            ],
        },
        {
            id: 'what-we-replace',
            heading: 'Ce que nous remplaçons ou remboursons gratuitement',
            body: [
                {
                    type: 'list',
                    items: [
                        'Les articles qui arrivent endommagés ou défectueux.',
                        'Les articles imprimés avec le mauvais design, le mauvais produit, la mauvaise taille ou la mauvaise couleur par rapport à votre commande confirmée.',
                        "Les articles qui n'arrivent jamais (perdus en transit) une fois que le transporteur a confirmé que le colis est perdu.",
                    ],
                },
                {
                    type: 'paragraph',
                    text: 'Dans ces cas, nous prenons en charge tous les frais de retour et expédions un remplacement sans frais, ou remboursons le montant total payé (article + frais de port initiaux) sur votre moyen de paiement initial. Les remboursements sont traités sous 5 jours ouvrés après approbation ; selon votre émetteur de carte ou votre banque, ils sont généralement crédités sous 5 à 10 jours ouvrés supplémentaires.',
                },
            ],
        },
        {
            id: 'final-sale',
            heading: 'Ce qui est en vente finale (sans remboursement)',
            body: [
                {
                    type: 'list',
                    items: [
                        "Le remords de l'acheteur sur un article personnalisé correctement produit.",
                        'Une mauvaise taille lorsque la taille reçue correspond à celle sélectionnée au moment du paiement.',
                        "Des designs qui semblent différents de vos attentes lorsque le résultat imprimé correspond à l'aperçu généré par IA que vous avez approuvé avant le paiement.",
                    ],
                },
            ],
        },
        {
            id: 'cancellations',
            heading: 'Annulations de commande',
            body: [
                {
                    type: 'paragraph',
                    text: "Vous pouvez annuler une commande sans frais dans l'heure suivant sa passation, avant le début de la production. Envoyez un e-mail à {email} avec votre numéro de commande. Une fois la production commencée, nous ne pouvons pas annuler, mais la politique de retour ci-dessus reste applicable si quelque chose ne va pas à l'arrivée.",
                },
            ],
        },
        {
            id: 'damaged-on-arrival',
            heading: "Endommagé à l'arrivée",
            body: [
                {
                    type: 'paragraph',
                    text: 'Photographiez le colis et le produit dans les 7 jours suivant la livraison et envoyez un e-mail à {email}. Nous organiserons un remplacement gratuit ou un remboursement intégral.',
                },
            ],
        },
        {
            id: 'lost-in-transit',
            heading: 'Perdu en transit',
            body: [
                {
                    type: 'paragraph',
                    text: "Si le suivi n'a pas été mis à jour pendant 10 jours ouvrés consécutifs pour un envoi aux États-Unis (ou 21 pour un envoi international), envoyez un e-mail à {email}. Nous ouvrirons une réclamation auprès du transporteur et expédierons un remplacement ou émettrons un remboursement intégral.",
                },
            ],
        },
        {
            id: 'return-shipping',
            heading: 'Frais de retour',
            body: [
                {
                    type: 'paragraph',
                    text: "Pour les retours gratuits (endommagés, défectueux, incorrects), nous vous envoyons une étiquette de retour prépayée par e-mail. Ne renvoyez pas d'articles sans nous contacter au préalable — les retours non sollicités ne peuvent pas être traités.",
                },
            ],
        },
        {
            id: 'contact',
            heading: 'Contact',
            body: [
                {
                    type: 'paragraph',
                    text: 'Support SmartPrintAI\nE-mail : {email}\nDélai de réponse : sous 1 jour ouvré, du lundi au vendredi.',
                },
            ],
        },
    ],
    supportLinkLabel: 'Aller au support',
}

// ─── German ─────────────────────────────────────────────────────────

const deReturnsCopy: ReturnsPageCopy = {
    metaTitle: 'Rückgabe- und Erstattungsrichtlinie',
    metaDescription: 'Wie Sie ein KI-gestaltetes individuelles Produkt von SmartPrintAI zurückgeben oder erstatten lassen, einschließlich Voraussetzungen, Fristen und Kontaktdaten.',
    title: 'Rückgabe- und Erstattungsrichtlinie',
    effectiveDate: 'Stand: 24. April 2026',
    sections: [
        {
            id: 'summary',
            heading: 'Zusammenfassung',
            body: [
                {
                    type: 'paragraph',
                    text: 'KI-gestaltete individuelle Produkte werden speziell für Sie auf Bestellung gefertigt. Wir akzeptieren Rückgaben und erstatten den Kaufpreis, wenn ein Artikel beschädigt, mangelhaft oder wesentlich anders als bestellt eintrifft. Wir können keine Rückgaben aufgrund von Reue des Käufers, Unzufriedenheit mit dem Design oder falscher Größe akzeptieren, wenn die erhaltene Größe der beim Kauf gewählten Option entspricht, da jeder Artikel individuell bedruckt und nicht weiterverkauft werden kann.',
                },
            ],
        },
        {
            id: 'eligibility',
            heading: 'Rückgabefrist',
            body: [
                {
                    type: 'paragraph',
                    text: 'Sie haben 30 Tage ab dem vom Versanddienstleister angezeigten Lieferdatum Zeit, eine Rückgabe für einen beschädigten, mangelhaften oder fehlerhaften Artikel zu beantragen.',
                },
            ],
        },
        {
            id: 'how-to-request',
            heading: 'So beantragen Sie eine Rückgabe oder Erstattung',
            body: [
                { type: 'paragraph', text: 'Senden Sie innerhalb des 30-Tage-Zeitraums eine E-Mail an {email} mit folgenden Angaben:' },
                {
                    type: 'list',
                    items: [
                        'Ihre Bestellnummer,',
                        'die betroffenen Artikel,',
                        'klare Fotos des Problems (Vorderseite, Rückseite und Nahaufnahme des Defekts),',
                        'ob Sie einen kostenlosen Ersatz oder eine Erstattung auf Ihr ursprüngliches Zahlungsmittel bevorzugen.',
                    ],
                },
                { type: 'paragraph', text: 'Wir beantworten alle Rückgabeanfragen innerhalb von 1 Werktag.' },
            ],
        },
        {
            id: 'what-we-replace',
            heading: 'Was wir kostenlos ersetzen oder erstatten',
            body: [
                {
                    type: 'list',
                    items: [
                        'Artikel, die beschädigt oder mangelhaft eintreffen.',
                        'Artikel, die mit dem falschen Design, falschen Produkt, falscher Größe oder falscher Farbe gegenüber Ihrer bestätigten Bestellung bedruckt wurden.',
                        'Artikel, die nie ankommen (auf dem Versandweg verloren), sobald der Versanddienstleister das Paket als verloren bestätigt hat.',
                    ],
                },
                {
                    type: 'paragraph',
                    text: 'In diesen Fällen übernehmen wir alle Rücksendekosten und versenden einen Ersatz kostenlos, oder erstatten den vollen gezahlten Betrag (Artikel + ursprüngliche Versandkosten) auf Ihr ursprüngliches Zahlungsmittel. Erstattungen werden innerhalb von 5 Werktagen nach Genehmigung bearbeitet; je nach Kartenherausgeber oder Bank werden sie typischerweise innerhalb von 5–10 Werktagen danach gutgeschrieben.',
                },
            ],
        },
        {
            id: 'final-sale',
            heading: 'Was vom Umtausch ausgeschlossen ist (keine Erstattung)',
            body: [
                {
                    type: 'list',
                    items: [
                        'Reue des Käufers bei einem korrekt produzierten individuellen Artikel.',
                        'Falsche Größe, wenn die erhaltene Größe der beim Kauf gewählten Größe entspricht.',
                        'Designs, die anders aussehen als erwartet, wenn das gedruckte Ergebnis der KI-generierten Vorschau entspricht, die Sie vor der Zahlung bestätigt haben.',
                    ],
                },
            ],
        },
        {
            id: 'cancellations',
            heading: 'Bestellstornierungen',
            body: [
                {
                    type: 'paragraph',
                    text: 'Sie können eine Bestellung innerhalb von 1 Stunde nach der Aufgabe und vor Produktionsbeginn kostenlos stornieren. Senden Sie eine E-Mail an {email} mit Ihrer Bestellnummer. Nach Produktionsbeginn ist eine Stornierung nicht mehr möglich, aber die obige Rückgaberichtlinie gilt weiterhin, falls bei der Ankunft etwas nicht in Ordnung ist.',
                },
            ],
        },
        {
            id: 'damaged-on-arrival',
            heading: 'Beschädigung bei Ankunft',
            body: [
                {
                    type: 'paragraph',
                    text: 'Fotografieren Sie das Paket und das Produkt innerhalb von 7 Tagen nach der Lieferung und senden Sie eine E-Mail an {email}. Wir veranlassen einen kostenlosen Ersatz oder eine vollständige Erstattung.',
                },
            ],
        },
        {
            id: 'lost-in-transit',
            heading: 'Auf dem Versandweg verloren',
            body: [
                {
                    type: 'paragraph',
                    text: 'Wenn die Sendungsverfolgung 10 aufeinanderfolgende Werktage lang nicht aktualisiert wurde (bei US-Sendungen) oder 21 Werktage (bei internationalen Sendungen), senden Sie eine E-Mail an {email}. Wir eröffnen eine Reklamation beim Versanddienstleister und versenden einen Ersatz oder veranlassen eine vollständige Erstattung.',
                },
            ],
        },
        {
            id: 'return-shipping',
            heading: 'Rücksendekosten',
            body: [
                {
                    type: 'paragraph',
                    text: 'Bei kostenlosen Rückgaben (Beschädigung, Mangel, Fehlbestellung) senden wir Ihnen ein vorfrankiertes Rücksendeetikett per E-Mail. Senden Sie keine Artikel zurück, ohne uns vorher zu kontaktieren — unaufgeforderte Rücksendungen können nicht bearbeitet werden.',
                },
            ],
        },
        {
            id: 'contact',
            heading: 'Kontakt',
            body: [
                {
                    type: 'paragraph',
                    text: 'SmartPrintAI Support\nE-Mail: {email}\nAntwortzeit: innerhalb von 1 Werktag, Montag–Freitag.',
                },
            ],
        },
    ],
    supportLinkLabel: 'Zum Support',
}

// ─── Spanish ────────────────────────────────────────────────────────

const esReturnsCopy: ReturnsPageCopy = {
    metaTitle: 'Política de devoluciones y reembolsos',
    metaDescription: 'Cómo devolver o reembolsar un producto personalizado diseñado por IA de SmartPrintAI, incluidos los requisitos, plazos y datos de contacto.',
    title: 'Política de devoluciones y reembolsos',
    effectiveDate: 'Fecha de entrada en vigor: 24 de abril de 2026',
    sections: [
        {
            id: 'summary',
            heading: 'Resumen',
            body: [
                {
                    type: 'paragraph',
                    text: 'Los productos personalizados diseñados por IA se fabrican bajo pedido específicamente para usted. Aceptamos devoluciones y emitimos reembolsos cuando un artículo llega dañado, defectuoso o materialmente diferente al que pidió. No podemos aceptar devoluciones por arrepentimiento del comprador, insatisfacción con el diseño o talla incorrecta cuando la talla coincide con la opción que seleccionó al pagar, ya que cada artículo se imprime a medida y no puede revenderse.',
                },
            ],
        },
        {
            id: 'eligibility',
            heading: 'Plazo de elegibilidad',
            body: [
                {
                    type: 'paragraph',
                    text: 'Dispone de 30 días a partir de la fecha de entrega indicada por el transportista para solicitar la devolución de un artículo dañado, defectuoso o incorrecto.',
                },
            ],
        },
        {
            id: 'how-to-request',
            heading: 'Cómo solicitar una devolución o reembolso',
            body: [
                { type: 'paragraph', text: 'Envíe un correo electrónico a {email} dentro del plazo de 30 días con:' },
                {
                    type: 'list',
                    items: [
                        'su número de pedido,',
                        'los artículos afectados,',
                        'fotos claras que muestren el problema (frente, dorso y primer plano del defecto),',
                        'si prefiere un reemplazo gratuito o un reembolso a su método de pago original.',
                    ],
                },
                { type: 'paragraph', text: 'Respondemos a todas las solicitudes de devolución en 1 día hábil.' },
            ],
        },
        {
            id: 'what-we-replace',
            heading: 'Qué reemplazamos o reembolsamos gratuitamente',
            body: [
                {
                    type: 'list',
                    items: [
                        'Artículos que llegan dañados o defectuosos.',
                        'Artículos impresos con el diseño, producto, talla o color incorrectos respecto a su pedido confirmado.',
                        'Artículos que nunca llegan (perdidos en tránsito) una vez que el transportista haya confirmado que el paquete está perdido.',
                    ],
                },
                {
                    type: 'paragraph',
                    text: 'En estos casos cubrimos todos los gastos de envío de devolución y enviamos un reemplazo sin coste, o reembolsamos el importe total pagado (artículo + envío original) a su método de pago original. Los reembolsos se procesan en 5 días hábiles tras la aprobación; según su entidad bancaria, suelen reflejarse en 5 a 10 días hábiles adicionales.',
                },
            ],
        },
        {
            id: 'final-sale',
            heading: 'Qué es venta final (sin reembolso)',
            body: [
                {
                    type: 'list',
                    items: [
                        'Arrepentimiento del comprador sobre un artículo personalizado correctamente producido.',
                        'Talla incorrecta cuando la talla recibida coincide con la talla seleccionada al pagar.',
                        'Diseños que se ven diferentes a sus expectativas cuando el resultado impreso coincide con la vista previa generada por IA que aprobó antes de pagar.',
                    ],
                },
            ],
        },
        {
            id: 'cancellations',
            heading: 'Cancelaciones de pedido',
            body: [
                {
                    type: 'paragraph',
                    text: 'Puede cancelar un pedido sin coste dentro de 1 hora tras realizarlo, antes de que comience la producción. Envíe un correo electrónico a {email} con su número de pedido. Una vez iniciada la producción no podemos cancelar, pero la política de devolución anterior sigue aplicándose si algo no está bien al recibir el pedido.',
                },
            ],
        },
        {
            id: 'damaged-on-arrival',
            heading: 'Dañado a la llegada',
            body: [
                {
                    type: 'paragraph',
                    text: 'Fotografíe el paquete y el producto dentro de los 7 días posteriores a la entrega y envíe un correo electrónico a {email}. Organizaremos un reemplazo gratuito o un reembolso completo.',
                },
            ],
        },
        {
            id: 'lost-in-transit',
            heading: 'Perdido en tránsito',
            body: [
                {
                    type: 'paragraph',
                    text: 'Si el seguimiento no se ha actualizado durante 10 días hábiles consecutivos para un envío a EE. UU. (o 21 para un envío internacional), envíe un correo electrónico a {email}. Abriremos una reclamación con el transportista y enviaremos un reemplazo o emitiremos un reembolso completo.',
                },
            ],
        },
        {
            id: 'return-shipping',
            heading: 'Gastos de envío de devolución',
            body: [
                {
                    type: 'paragraph',
                    text: 'Para devoluciones gratuitas (dañadas, defectuosas, incorrectas) le enviamos por correo electrónico una etiqueta de envío prepagada. No nos envíe artículos sin contactarnos primero — las devoluciones no solicitadas no se pueden procesar.',
                },
            ],
        },
        {
            id: 'contact',
            heading: 'Contacto',
            body: [
                {
                    type: 'paragraph',
                    text: 'Soporte de SmartPrintAI\nCorreo electrónico: {email}\nTiempo de respuesta: en 1 día hábil, de lunes a viernes.',
                },
            ],
        },
    ],
    supportLinkLabel: 'Ir al soporte',
}

// ─── Shipping & Delivery — English ──────────────────────────────────

const enShippingCopy: ShippingPageCopy = {
    metaTitle: 'Shipping & Delivery',
    metaDescription: 'Production and delivery times, tracking, shipping costs, and customs information for SmartPrintAI orders.',
    title: 'Shipping & Delivery',
    effectiveDate: 'Effective date: April 24, 2026',
    sections: [
        {
            id: 'production-time',
            heading: 'Production time',
            body: [
                {
                    type: 'paragraph',
                    text: 'Each item is custom-printed when you order. Production takes 2–5 business days before the parcel ships.',
                },
            ],
        },
        {
            id: 'delivery-windows',
            heading: 'Delivery windows',
            body: [
                { type: 'paragraph', text: 'After production, typical carrier delivery times are:' },
                {
                    type: 'list',
                    items: [
                        'United States: 3–7 business days (USPS / UPS, depending on item).',
                        'Canada: 5–10 business days.',
                        'United Kingdom & European Union: 6–12 business days.',
                        'Rest of world: 10–20 business days.',
                    ],
                },
                {
                    type: 'paragraph',
                    text: 'Combined production + shipping is usually 3–10 business days within the US, and up to 25 business days for international destinations.',
                },
            ],
        },
        {
            id: 'tracking',
            heading: 'Tracking',
            body: [
                {
                    type: 'paragraph',
                    text: 'Once the parcel leaves our fulfilment partner you receive an email with a tracking number. You can also view live order status from your account on the orders page.',
                },
            ],
        },
        {
            id: 'shipping-costs',
            heading: 'Shipping costs',
            body: [
                {
                    type: 'paragraph',
                    text: 'Calculated at checkout based on destination and the items in your cart.',
                },
            ],
        },
        {
            id: 'customs',
            heading: 'Customs and duties',
            body: [
                {
                    type: 'paragraph',
                    text: 'International orders may be subject to import duties or taxes assessed by your local customs authority. These charges are the recipient’s responsibility and are not included in the price you pay at checkout.',
                },
            ],
        },
        {
            id: 'wrong-address',
            heading: 'Wrong address',
            body: [
                {
                    type: 'paragraph',
                    text: 'If you spot an address error, email {email} within 1 hour of ordering and we will correct it before production starts. After production begins, address changes are not possible.',
                },
            ],
        },
        {
            id: 'contact',
            heading: 'Contact',
            body: [
                {
                    type: 'paragraph',
                    text: 'SmartPrintAI Support\nEmail: {email}\nResponse time: within 1 business day, Monday–Friday.',
                },
            ],
        },
    ],
    supportLinkLabel: 'Go to support',
}

// ─── Shipping & Delivery — French ───────────────────────────────────

const frShippingCopy: ShippingPageCopy = {
    metaTitle: 'Livraison et expédition',
    metaDescription: 'Délais de production et de livraison, suivi, frais d’expédition et droits de douane pour les commandes SmartPrintAI.',
    title: 'Livraison et expédition',
    effectiveDate: 'Date d’effet : 24 avril 2026',
    sections: [
        {
            id: 'production-time',
            heading: 'Délai de production',
            body: [
                {
                    type: 'paragraph',
                    text: 'Chaque article est imprimé sur mesure lors de votre commande. La production prend de 2 à 5 jours ouvrés avant l’expédition du colis.',
                },
            ],
        },
        {
            id: 'delivery-windows',
            heading: 'Délais de livraison',
            body: [
                { type: 'paragraph', text: 'Après la production, les délais de livraison habituels du transporteur sont :' },
                {
                    type: 'list',
                    items: [
                        'États-Unis : 3 à 7 jours ouvrés (USPS / UPS, selon l’article).',
                        'Canada : 5 à 10 jours ouvrés.',
                        'Royaume-Uni et Union européenne : 6 à 12 jours ouvrés.',
                        'Reste du monde : 10 à 20 jours ouvrés.',
                    ],
                },
                {
                    type: 'paragraph',
                    text: 'Production et expédition cumulées prennent généralement 3 à 10 jours ouvrés aux États-Unis, et jusqu’à 25 jours ouvrés pour les destinations internationales.',
                },
            ],
        },
        {
            id: 'tracking',
            heading: 'Suivi',
            body: [
                {
                    type: 'paragraph',
                    text: 'Dès que le colis quitte notre partenaire logistique, vous recevez un e-mail contenant un numéro de suivi. Vous pouvez également consulter le statut en temps réel depuis votre espace, sur la page de vos commandes.',
                },
            ],
        },
        {
            id: 'shipping-costs',
            heading: 'Frais d’expédition',
            body: [
                {
                    type: 'paragraph',
                    text: 'Calculés au moment du paiement en fonction de la destination et des articles présents dans votre panier.',
                },
            ],
        },
        {
            id: 'customs',
            heading: 'Douane et droits d’importation',
            body: [
                {
                    type: 'paragraph',
                    text: 'Les commandes internationales peuvent être soumises à des droits de douane ou taxes imposés par votre administration locale. Ces frais sont à la charge du destinataire et ne sont pas inclus dans le prix payé au moment du paiement.',
                },
            ],
        },
        {
            id: 'wrong-address',
            heading: 'Adresse erronée',
            body: [
                {
                    type: 'paragraph',
                    text: 'Si vous repérez une erreur dans l’adresse, écrivez à {email} dans l’heure suivant votre commande et nous la corrigerons avant le début de la production. Une fois la production lancée, les modifications d’adresse ne sont plus possibles.',
                },
            ],
        },
        {
            id: 'contact',
            heading: 'Contact',
            body: [
                {
                    type: 'paragraph',
                    text: 'Support SmartPrintAI\nE-mail : {email}\nDélai de réponse : sous 1 jour ouvré, du lundi au vendredi.',
                },
            ],
        },
    ],
    supportLinkLabel: 'Aller au support',
}

// ─── Shipping & Delivery — German ───────────────────────────────────

const deShippingCopy: ShippingPageCopy = {
    metaTitle: 'Versand und Lieferung',
    metaDescription: 'Produktions- und Lieferzeiten, Sendungsverfolgung, Versandkosten und Zollinformationen für SmartPrintAI-Bestellungen.',
    title: 'Versand und Lieferung',
    effectiveDate: 'Gültig ab: 24. April 2026',
    sections: [
        {
            id: 'production-time',
            heading: 'Produktionszeit',
            body: [
                {
                    type: 'paragraph',
                    text: 'Jeder Artikel wird nach Ihrer Bestellung individuell bedruckt. Die Produktion dauert 2 bis 5 Werktage, bevor das Paket versandt wird.',
                },
            ],
        },
        {
            id: 'delivery-windows',
            heading: 'Lieferzeiten',
            body: [
                { type: 'paragraph', text: 'Nach der Produktion betragen die üblichen Lieferzeiten der Versanddienstleister:' },
                {
                    type: 'list',
                    items: [
                        'Vereinigte Staaten: 3 bis 7 Werktage (USPS / UPS, je nach Artikel).',
                        'Kanada: 5 bis 10 Werktage.',
                        'Vereinigtes Königreich und Europäische Union: 6 bis 12 Werktage.',
                        'Übrige Welt: 10 bis 20 Werktage.',
                    ],
                },
                {
                    type: 'paragraph',
                    text: 'Produktion und Versand zusammen dauern in der Regel 3 bis 10 Werktage innerhalb der USA und bis zu 25 Werktage für internationale Ziele.',
                },
            ],
        },
        {
            id: 'tracking',
            heading: 'Sendungsverfolgung',
            body: [
                {
                    type: 'paragraph',
                    text: 'Sobald das Paket unseren Fulfillment-Partner verlässt, erhalten Sie eine E-Mail mit der Sendungsnummer. Den aktuellen Bestellstatus können Sie zusätzlich in Ihrem Konto auf der Bestellungsseite einsehen.',
                },
            ],
        },
        {
            id: 'shipping-costs',
            heading: 'Versandkosten',
            body: [
                {
                    type: 'paragraph',
                    text: 'Werden beim Bezahlvorgang abhängig vom Lieferziel und den Artikeln in Ihrem Warenkorb berechnet.',
                },
            ],
        },
        {
            id: 'customs',
            heading: 'Zoll und Einfuhrabgaben',
            body: [
                {
                    type: 'paragraph',
                    text: 'Bei internationalen Bestellungen können Einfuhrzölle oder Steuern durch Ihre örtliche Zollbehörde anfallen. Diese Gebühren gehen zulasten der Empfängerin oder des Empfängers und sind nicht im Kaufpreis enthalten.',
                },
            ],
        },
        {
            id: 'wrong-address',
            heading: 'Falsche Adresse',
            body: [
                {
                    type: 'paragraph',
                    text: 'Wenn Sie einen Adressfehler bemerken, schreiben Sie innerhalb einer Stunde nach Bestellung an {email}, und wir korrigieren die Angabe vor Produktionsbeginn. Nach Produktionsstart sind Adressänderungen nicht mehr möglich.',
                },
            ],
        },
        {
            id: 'contact',
            heading: 'Kontakt',
            body: [
                {
                    type: 'paragraph',
                    text: 'SmartPrintAI Support\nE-Mail: {email}\nAntwortzeit: innerhalb von 1 Werktag, Montag bis Freitag.',
                },
            ],
        },
    ],
    supportLinkLabel: 'Zum Support',
}

// ─── Shipping & Delivery — Spanish ──────────────────────────────────

const esShippingCopy: ShippingPageCopy = {
    metaTitle: 'Envío y entrega',
    metaDescription: 'Tiempos de producción y entrega, seguimiento, costes de envío e información aduanera para los pedidos de SmartPrintAI.',
    title: 'Envío y entrega',
    effectiveDate: 'Fecha de entrada en vigor: 24 de abril de 2026',
    sections: [
        {
            id: 'production-time',
            heading: 'Tiempo de producción',
            body: [
                {
                    type: 'paragraph',
                    text: 'Cada artículo se imprime a medida al realizar el pedido. La producción tarda entre 2 y 5 días hábiles antes del envío del paquete.',
                },
            ],
        },
        {
            id: 'delivery-windows',
            heading: 'Plazos de entrega',
            body: [
                { type: 'paragraph', text: 'Tras la producción, los plazos habituales del transportista son:' },
                {
                    type: 'list',
                    items: [
                        'Estados Unidos: entre 3 y 7 días hábiles (USPS / UPS, según el artículo).',
                        'Canadá: entre 5 y 10 días hábiles.',
                        'Reino Unido y Unión Europea: entre 6 y 12 días hábiles.',
                        'Resto del mundo: entre 10 y 20 días hábiles.',
                    ],
                },
                {
                    type: 'paragraph',
                    text: 'En conjunto, la producción más el envío suelen tardar entre 3 y 10 días hábiles dentro de Estados Unidos, y hasta 25 días hábiles para destinos internacionales.',
                },
            ],
        },
        {
            id: 'tracking',
            heading: 'Seguimiento',
            body: [
                {
                    type: 'paragraph',
                    text: 'Cuando el paquete sale de nuestro socio de fabricación, recibirá un correo con el número de seguimiento. También puede consultar el estado en tiempo real desde su cuenta, en la página de pedidos.',
                },
            ],
        },
        {
            id: 'shipping-costs',
            heading: 'Costes de envío',
            body: [
                {
                    type: 'paragraph',
                    text: 'Se calculan al finalizar la compra en función del destino y los artículos del carrito.',
                },
            ],
        },
        {
            id: 'customs',
            heading: 'Aduanas y aranceles',
            body: [
                {
                    type: 'paragraph',
                    text: 'Los pedidos internacionales pueden estar sujetos a aranceles o impuestos aplicados por su autoridad aduanera local. Estos cargos corren a cargo del destinatario y no están incluidos en el precio que paga al finalizar la compra.',
                },
            ],
        },
        {
            id: 'wrong-address',
            heading: 'Dirección incorrecta',
            body: [
                {
                    type: 'paragraph',
                    text: 'Si detecta un error en la dirección, escriba a {email} en la hora siguiente al pedido y lo corregiremos antes de que comience la producción. Una vez iniciada la producción, no es posible cambiar la dirección.',
                },
            ],
        },
        {
            id: 'contact',
            heading: 'Contacto',
            body: [
                {
                    type: 'paragraph',
                    text: 'Soporte de SmartPrintAI\nCorreo electrónico: {email}\nTiempo de respuesta: en 1 día hábil, de lunes a viernes.',
                },
            ],
        },
    ],
    supportLinkLabel: 'Ir al soporte',
}

type ProcessorEntry = {
    name: string
    role: string
    region: string
}

type PrivacyPageCopy = {
    metadata: { title: string; description: string }
    headerTitle: string
    effectiveDate: string
    lastUpdated: string
    nav: {
        overview: string
        processors: string
        cookies: string
        yourRights: string
        retention: string
        contact: string
    }
    intro: { title: string; body: string; controller: string }
    processors: { title: string; intro: string; items: ProcessorEntry[] }
    cookies: {
        title: string
        intro: string
        essential: { title: string; body: string }
        analytics: { title: string; body: string }
        consentNote: string
    }
    yourRights: {
        title: string
        intro: string
        items: string[]
        howToExercise: string
        supervisoryAuthority: string
    }
    retention: {
        title: string
        intro: string
        items: Array<{ category: string; period: string }>
    }
    contact: {
        title: string
        body: string
        email: string
        supportLinkLabel: string
        supportLinkText: string
    }
}

type TermsPageCopy = {
    metadata: { title: string; description: string }
    headerTitle: string
    effectiveDate: string
    lastUpdated: string
    nav: {
        overview: string
        orders: string
        pricing: string
        aiContent: string
        intellectualProperty: string
        returns: string
        liability: string
        governingLaw: string
        changes: string
        contact: string
    }
    intro: { title: string; body: string }
    orders: { title: string; body: string }
    pricing: { title: string; body: string }
    aiContent: { title: string; body: string }
    intellectualProperty: { title: string; body: string }
    returns: {
        title: string
        body: string
        returnsLinkLabel: string
        shippingLinkLabel: string
    }
    liability: { title: string; body: string }
    governingLaw: { title: string; body: string }
    changes: { title: string; body: string }
    contact: {
        title: string
        body: string
        email: string
        supportLinkLabel: string
        supportLinkText: string
    }
}

type ConsentBannerCopy = {
    title: string
    body: string
    accept: string
    reject: string
    learnMore: string
}

type FooterCopy = {
    tagline: string
    cta: string
    productsHeading: string
    productsList: {
        tshirts: string
        hoodies: string
        mugs: string
        wallArt: string
    }
    supportHeading: string
    supportLinks: {
        shipping: string
        returns: string
        terms: string
        privacy: string
    }
    copyright: string
}

type ErrorPagesCopy = {
    generic: {
        title: string
        body: string
        retry: string
        goHome: string
        contactSupport: string
        referenceLabel: string
    }
    notFound: {
        eyebrow: string
        title: string
        body: string
        goHome: string
        startCreating: string
    }
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
    returns: ReturnsPageCopy
    shipping: ShippingPageCopy
    privacy: PrivacyPageCopy
    terms: TermsPageCopy
    consent: ConsentBannerCopy
    footer: FooterCopy
    errors: ErrorPagesCopy
}

export const LOCALE_COPY: Record<SupportedLocale, LocaleCopy> = {
    en: {
        localeLabel: 'English',
        returns: enReturnsCopy,
        shipping: enShippingCopy,
        privacy: {
            metadata: {
                title: 'Privacy Policy',
                description:
                    'How SmartPrintAI handles your data: lawful basis, processors, cookies, your GDPR rights, and how to contact us.',
            },
            headerTitle: 'Privacy Policy',
            effectiveDate: 'Effective: May 18, 2026',
            lastUpdated: 'Last updated: May 18, 2026',
            nav: {
                overview: 'Overview',
                processors: 'Processors',
                cookies: 'Cookies',
                yourRights: 'Your rights',
                retention: 'Retention',
                contact: 'Contact',
            },
            intro: {
                title: 'What this policy covers',
                body:
                    "SmartPrintAI (\"we\", \"us\") provides an AI-powered print-on-demand service at smartprintai.com. This policy explains the personal data we collect, why we process it, who we share it with, how long we keep it, and the rights you have under the EU General Data Protection Regulation (GDPR).",
                controller:
                    'Data controller: SmartPrintAI, operated by Matthieu Kokabi. For data-protection enquiries, contact privacy@smartprintai.com.',
            },
            processors: {
                title: 'Service providers (processors)',
                intro:
                    'We use the following processors to operate the service. Each one only receives the data needed for its specific task, under a written processing agreement.',
                items: [
                    {
                        name: 'Stripe Payments Europe Ltd (Ireland) — parent Stripe, Inc. (US)',
                        role:
                            'Payment processing. Receives card details, billing address, email, and order amount.',
                        region: 'EU + US',
                    },
                    {
                        name: 'Printful Latvia, SIA (Latvia) and Printful, Inc. (US)',
                        role:
                            'On-demand fulfillment for Printful-routed items. Receives shipping address, recipient name, email, product variant, and design file URL.',
                        region: 'EU + US',
                    },
                    {
                        name: 'Gelato AS (Norway)',
                        role:
                            'On-demand fulfillment for Gelato-routed items. Receives shipping address, recipient name, email, product variant, and design file URL.',
                        region: 'Norway (EEA) + global production network',
                    },
                    {
                        name: 'Gooten, Inc. (United States)',
                        role:
                            'On-demand fulfillment for Gooten-routed items. Receives shipping address, recipient name, email, product variant, and design file URL.',
                        region: 'US',
                    },
                    {
                        name: 'Resend.com Inc. (United States)',
                        role:
                            'Transactional and marketing email delivery (order confirmation, shipment notification, support replies, discount-lead emails). Receives your email address and order metadata.',
                        region: 'US',
                    },
                    {
                        name: 'Google LLC — Gemini API (US) and Google Ireland Ltd. (Ireland)',
                        role:
                            'AI image generation. Receives the design prompt you type. Does not receive your email or shipping address.',
                        region: 'US + EU',
                    },
                    {
                        name: 'Google LLC — Google Analytics 4 (US) and Google Ireland Ltd. (Ireland)',
                        role:
                            'Aggregate site analytics. Loads cookieless pings always (consent-mode v2) and only stores cookies after you click Accept on the cookie banner. Anonymized IP is used.',
                        region: 'US + EU',
                    },
                    {
                        name: 'Make.com (Celonis SE, Czech Republic)',
                        role:
                            'Internal automation: order-event alerts, abandoned-cart triggers, daily ops digest. Receives order metadata (order ID, total, customer email, status).',
                        region: 'EU',
                    },
                    {
                        name: 'Hostinger International Ltd. (Lithuania / Cyprus)',
                        role:
                            'VPS hosting provider. Stores the database, design files, server logs, and backups that run the service.',
                        region: 'EU',
                    },
                ],
            },
            cookies: {
                title: 'Cookies',
                intro:
                    'We use only the cookies we need to operate the site. Analytics cookies fire only after you click Accept on the banner.',
                essential: {
                    title: 'Essential cookies',
                    body:
                        'Cart contents, session, and your cookie-consent choice itself. These are always active because the site cannot function without them. No personal-data sharing with third parties.',
                },
                analytics: {
                    title: 'Analytics cookies (consent required)',
                    body:
                        'Google Analytics 4 visitor identifier, attribution (UTM source/medium/campaign/referrer), and our visitor_id used for funnel measurement. None of these fire before you click Accept. If you click Reject, they never fire.',
                },
                consentNote:
                    "You can change your choice anytime by clearing your browser's cookies for this site — the banner will re-appear on your next visit.",
            },
            yourRights: {
                title: 'Your rights under the GDPR',
                intro:
                    'You have the following rights regarding the personal data we process about you:',
                items: [
                    'Right of access to your personal data (Article 15 GDPR)',
                    'Right to rectification of inaccurate data (Article 16 GDPR)',
                    "Right to erasure (\"right to be forgotten\") (Article 17 GDPR)",
                    'Right to restriction of processing (Article 18 GDPR)',
                    'Right to data portability (Article 20 GDPR)',
                    'Right to object to processing (Article 21 GDPR)',
                    'Right to withdraw consent at any time (Article 7(3) GDPR)',
                    'Right to lodge a complaint with a supervisory authority (Article 77 GDPR)',
                ],
                howToExercise:
                    'To exercise any of these rights, email privacy@smartprintai.com from the address associated with your account. We aim to respond within 30 days as required by the GDPR.',
                supervisoryAuthority:
                    'If you believe we are not handling your data correctly, you may complain to the data-protection authority in the EU member state where you live, work, or where the issue occurred — for example the CNIL in France, the BfDI in Germany, or the AEPD in Spain.',
            },
            retention: {
                title: 'How long we keep data',
                intro: 'We keep personal data only as long as we have a lawful reason to:',
                items: [
                    { category: 'Order records', period: '10 years (mandatory under most EU tax and accounting law)' },
                    { category: 'Support requests', period: '2 years from last contact' },
                    { category: 'Marketing-list email (discount sign-up)', period: 'Until you unsubscribe, then deleted within 30 days' },
                    { category: 'Analytics data (when consented)', period: '14 months in Google Analytics 4, then automatically deleted by Google' },
                    { category: 'Server logs', period: '30 days, then automatically rotated' },
                    { category: 'Backups', period: '30 days rolling, then overwritten' },
                ],
            },
            contact: {
                title: 'Contact us',
                body: 'For any question, concern, or request about your personal data:',
                email: 'privacy@smartprintai.com',
                supportLinkLabel: 'For order-related questions, use our',
                supportLinkText: 'support center',
            },
        },
        terms: {
            metadata: {
                title: 'Terms of Service',
                description:
                    'The agreement between you and SmartPrintAI when you use our AI-powered print-on-demand service.',
            },
            headerTitle: 'Terms of Service',
            effectiveDate: 'Effective: May 18, 2026',
            lastUpdated: 'Last updated: May 18, 2026',
            nav: {
                overview: 'Overview',
                orders: 'Orders',
                pricing: 'Pricing',
                aiContent: 'AI content',
                intellectualProperty: 'IP',
                returns: 'Returns & shipping',
                liability: 'Liability',
                governingLaw: 'Governing law',
                changes: 'Changes',
                contact: 'Contact',
            },
            intro: {
                title: 'Agreement',
                body:
                    "These Terms govern your use of the SmartPrintAI service at smartprintai.com (the \"Service\"). By placing an order or otherwise using the Service, you accept these Terms. SmartPrintAI is operated by Matthieu Kokabi.",
            },
            orders: {
                title: 'Orders and fulfillment',
                body:
                    'Custom items are made to order — production begins only after you complete checkout. Typical production time is 2–5 business days; shipping then takes 3–10 business days depending on the destination country and the fulfillment partner routed for your product. Order confirmation, in-production, and shipped notifications are sent to the email you provide at checkout.',
            },
            pricing: {
                title: 'Prices, taxes, and payment',
                body:
                    'Prices shown on product pages are in US dollars and include the design, production, and the Service margin. Shipping is calculated at checkout based on destination. For EU customers, VAT is calculated and shown at checkout in accordance with your country of delivery. Payment is processed by Stripe; we never store full card details.',
            },
            aiContent: {
                title: 'AI-generated designs',
                body:
                    "You provide a text prompt and our system generates an image. You are responsible for the content of your prompt: it must not violate third-party rights, depict real identifiable people without their consent, or include content prohibited by Google Gemini's usage policies or by our own platform policies (including hate speech, sexual content involving minors, doxxing, or violent threats). Designs that violate these may be refused at fulfillment and we will refund the order in full.",
            },
            intellectualProperty: {
                title: 'Intellectual property',
                body:
                    'You own the design generated from your prompt and the physical product printed from it. SmartPrintAI retains a non-exclusive license to use generated images and mockups for the limited purpose of fulfillment, customer support, and (where permitted) anonymized model improvement. The SmartPrintAI name, logo, and software are our property and may not be reused without permission.',
            },
            returns: {
                title: 'Returns and shipping',
                body:
                    'Because each item is made to order, EU consumer-protection law (the 14-day cooling-off period) does not require a refund for custom-printed items unless the product is defective or damaged on arrival. We cover all defects and damage at our cost and will re-make or refund within a reasonable time of receiving photo evidence. Full details:',
                returnsLinkLabel: 'Returns policy',
                shippingLinkLabel: 'Shipping information',
            },
            liability: {
                title: 'Limitation of liability',
                body:
                    "To the maximum extent permitted by EU consumer-protection law, SmartPrintAI's liability for any single order is limited to the amount you paid for that order, except in cases of death, personal injury, fraud, gross negligence, or where applicable law forbids such limitation. This clause does not affect any non-waivable consumer rights you may have.",
            },
            governingLaw: {
                title: 'Governing law',
                body:
                    'These Terms are governed by the law of France, with the mandatory consumer-protection rules of your country of habitual residence expressly preserved. EU consumers may also bring disputes before the courts of their member state of residence. The European Commission provides an online dispute-resolution platform at https://ec.europa.eu/consumers/odr.',
            },
            changes: {
                title: 'Changes to these Terms',
                body:
                    "We may update these Terms — for example to reflect a new processor, a regulatory requirement, or a product change. Material changes will be notified by email (if you have an account) and shown on this page with a new \"Last updated\" date. Continuing to use the Service after the new date means you accept the updated Terms.",
            },
            contact: {
                title: 'Contact',
                body: 'For order-related issues use our support center; for legal questions email us:',
                email: 'legal@smartprintai.com',
                supportLinkLabel: 'Order issues:',
                supportLinkText: 'support center',
            },
        },
        consent: {
            title: 'We use cookies',
            body:
                "Essential cookies make this site work. With your consent we also use analytics cookies (Google Analytics 4) to understand how you use the site so we can improve it. You can change your mind anytime in our Privacy Policy.",
            accept: 'Accept all',
            reject: 'Reject non-essential',
            learnMore: 'Read our Privacy Policy',
        },
        footer: {
            tagline: 'Describe it. AI creates it. We print and ship it.',
            cta: 'Create My Product',
            productsHeading: 'Products',
            productsList: {
                tshirts: 'T-Shirts',
                hoodies: 'Hoodies',
                mugs: 'Mugs',
                wallArt: 'Wall Art',
            },
            supportHeading: 'Support',
            supportLinks: {
                shipping: 'Shipping Info',
                returns: 'Returns Policy',
                terms: 'Terms',
                privacy: 'Privacy',
            },
            copyright: '© 2026 SmartPrintAI. All rights reserved.',
        },
        errors: {
            generic: {
                title: 'Something went wrong',
                body:
                    'We hit an unexpected error. Please try again. If the problem keeps happening, contact our support.',
                retry: 'Try again',
                goHome: 'Go home',
                contactSupport: 'Contact support',
                referenceLabel: 'Reference',
            },
            notFound: {
                eyebrow: '404',
                title: 'Page not found',
                body:
                    "The page you were looking for doesn't exist — maybe the link is wrong, or the page has moved.",
                goHome: 'Go home',
                startCreating: 'Start creating',
            },
        },
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
            readyToBuyOnlyLabel: 'This product is sold as-is and is not available in AI design mode.',
            readyToBuyAddToCartLabel: 'Add to Cart',
            readyToBuyAddedToCartLabel: 'Added to Cart',
            readyToBuyGoToCartLabel: 'Go to Cart',
        },
        create: {
            metadataTitle: 'Create Your Design',
            metadataDescription: 'Describe your idea and generate custom AI artwork ready for print-on-demand products.',
            titleLead: 'Create Your',
            titleAccent: 'Design',
            subtitle: 'Step 1 describe your design. Step 2 pick a product. Step 3 add to cart.',
            entryStepLabel: 'Step 1',
            entryStepTitle: 'Describe exactly what should be printed.',
            entryStepHint: 'Include subject, style, and "transparent background" for cleaner mockups.',
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
            cartButton: {
                notReady: 'Generate a design first',
                generating: 'Generating mockup...',
                unavailable: 'Mockup unavailable — try a different color or regenerate',
            },
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
            nextStepsLabel: 'What happens next',
            manualReviewReassurance: 'We are confirming address details before production. No payment action is needed from you.',
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
                manualReviewNote: 'Address details are being verified. Production starts right after this check.',
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
        returns: frReturnsCopy,
        shipping: frShippingCopy,
        privacy: {
            metadata: {
                title: 'Politique de confidentialité',
                description:
                    'Comment SmartPrintAI traite vos données : base légale, sous-traitants, cookies, vos droits RGPD et nos coordonnées.',
            },
            headerTitle: 'Politique de confidentialité',
            effectiveDate: 'Date d’entrée en vigueur : 18 mai 2026',
            lastUpdated: 'Dernière mise à jour : 18 mai 2026',
            nav: {
                overview: 'Aperçu',
                processors: 'Sous-traitants',
                cookies: 'Cookies',
                yourRights: 'Vos droits',
                retention: 'Conservation',
                contact: 'Contact',
            },
            intro: {
                title: 'Ce que couvre cette politique',
                body:
                    "SmartPrintAI (« nous ») fournit un service d’impression à la demande propulsé par l’IA sur smartprintai.com. Cette politique explique les données personnelles que nous collectons, pourquoi nous les traitons, avec qui nous les partageons, combien de temps nous les conservons, et les droits que vous tenez du Règlement général sur la protection des données (RGPD).",
                controller:
                    'Responsable du traitement : SmartPrintAI, exploité par Matthieu Kokabi. Pour toute question relative à la protection des données : privacy@smartprintai.com.',
            },
            processors: {
                title: 'Prestataires (sous-traitants)',
                intro:
                    'Nous utilisons les sous-traitants suivants pour faire fonctionner le service. Chacun ne reçoit que les données nécessaires à sa mission, dans le cadre d’un contrat de sous-traitance écrit.',
                items: [
                    {
                        name: 'Stripe Payments Europe Ltd (Irlande) — maison mère Stripe, Inc. (États-Unis)',
                        role: 'Traitement des paiements. Reçoit les données de carte, l’adresse de facturation, l’e-mail et le montant de la commande.',
                        region: 'UE + États-Unis',
                    },
                    {
                        name: 'Printful Latvia, SIA (Lettonie) et Printful, Inc. (États-Unis)',
                        role: 'Production à la demande pour les articles routés vers Printful. Reçoit l’adresse de livraison, le nom du destinataire, l’e-mail, la variante du produit et l’URL du fichier de design.',
                        region: 'UE + États-Unis',
                    },
                    {
                        name: 'Gelato AS (Norvège)',
                        role: 'Production à la demande pour les articles routés vers Gelato. Reçoit l’adresse de livraison, le nom du destinataire, l’e-mail, la variante du produit et l’URL du fichier de design.',
                        region: 'Norvège (EEE) + réseau de production mondial',
                    },
                    {
                        name: 'Gooten, Inc. (États-Unis)',
                        role: 'Production à la demande pour les articles routés vers Gooten. Reçoit l’adresse de livraison, le nom du destinataire, l’e-mail, la variante du produit et l’URL du fichier de design.',
                        region: 'États-Unis',
                    },
                    {
                        name: 'Resend.com Inc. (États-Unis)',
                        role: 'Envoi d’e-mails transactionnels et marketing (confirmation de commande, notification d’expédition, réponses du support, e-mails de code de réduction). Reçoit votre adresse e-mail et les métadonnées de commande.',
                        region: 'États-Unis',
                    },
                    {
                        name: 'Google LLC — API Gemini (États-Unis) et Google Ireland Ltd. (Irlande)',
                        role: 'Génération d’images par IA. Reçoit l’invite (prompt) que vous saisissez. Ne reçoit ni votre e-mail ni votre adresse de livraison.',
                        region: 'États-Unis + UE',
                    },
                    {
                        name: 'Google LLC — Google Analytics 4 (États-Unis) et Google Ireland Ltd. (Irlande)',
                        role: 'Statistiques agrégées du site. Les pings sans cookies (consent-mode v2) s’exécutent en permanence ; les cookies ne sont stockés qu’après votre clic sur Accepter sur la bannière. L’adresse IP est anonymisée.',
                        region: 'États-Unis + UE',
                    },
                    {
                        name: 'Make.com (Celonis SE, République tchèque)',
                        role: 'Automatisation interne : alertes de commande, déclencheurs de panier abandonné, synthèse opérationnelle quotidienne. Reçoit les métadonnées de commande (identifiant, montant total, e-mail client, statut).',
                        region: 'UE',
                    },
                    {
                        name: 'Hostinger International Ltd. (Lituanie / Chypre)',
                        role: 'Hébergeur VPS. Stocke la base de données, les fichiers de design, les journaux serveur et les sauvegardes du service.',
                        region: 'UE',
                    },
                ],
            },
            cookies: {
                title: 'Cookies',
                intro:
                    'Nous utilisons uniquement les cookies nécessaires au fonctionnement du site. Les cookies d’analyse ne se déclenchent qu’après votre clic sur Accepter sur la bannière.',
                essential: {
                    title: 'Cookies essentiels',
                    body:
                        'Contenu du panier, session, et votre choix de consentement aux cookies lui-même. Ils sont toujours actifs car le site ne peut fonctionner sans eux. Aucun partage de données personnelles avec des tiers.',
                },
                analytics: {
                    title: 'Cookies d’analyse (consentement requis)',
                    body:
                        'Identifiant visiteur Google Analytics 4, attribution (source/medium/campagne/référent UTM) et notre visitor_id utilisé pour la mesure d’entonnoir. Aucun ne se déclenche avant votre clic sur Accepter. Si vous cliquez sur Refuser, aucun ne se déclenche.',
                },
                consentNote:
                    'Vous pouvez modifier votre choix à tout moment en effaçant les cookies de ce site dans votre navigateur — la bannière réapparaîtra à votre prochaine visite.',
            },
            yourRights: {
                title: 'Vos droits au titre du RGPD',
                intro:
                    'Vous disposez des droits suivants sur les données personnelles que nous traitons à votre sujet :',
                items: [
                    'Droit d’accès à vos données personnelles (article 15 RGPD)',
                    'Droit de rectification des données inexactes (article 16 RGPD)',
                    'Droit à l’effacement (« droit à l’oubli ») (article 17 RGPD)',
                    'Droit à la limitation du traitement (article 18 RGPD)',
                    'Droit à la portabilité des données (article 20 RGPD)',
                    'Droit d’opposition au traitement (article 21 RGPD)',
                    'Droit de retirer votre consentement à tout moment (article 7(3) RGPD)',
                    'Droit d’introduire une réclamation auprès d’une autorité de contrôle (article 77 RGPD)',
                ],
                howToExercise:
                    'Pour exercer l’un de ces droits, envoyez un e-mail à privacy@smartprintai.com depuis l’adresse associée à votre compte. Nous nous efforçons de répondre dans les 30 jours prévus par le RGPD.',
                supervisoryAuthority:
                    'Si vous estimez que nous ne traitons pas correctement vos données, vous pouvez introduire une réclamation auprès de l’autorité de protection des données de l’État membre de l’UE où vous résidez, travaillez ou où le problème s’est produit — par exemple la CNIL en France, le BfDI en Allemagne, l’AEPD en Espagne.',
            },
            retention: {
                title: 'Durée de conservation',
                intro:
                    'Nous conservons les données personnelles uniquement le temps nécessaire à une finalité légitime :',
                items: [
                    { category: 'Registres de commande', period: '10 ans (obligatoire en vertu du droit fiscal et comptable de la plupart des États membres de l’UE)' },
                    { category: 'Demandes de support', period: '2 ans à compter du dernier contact' },
                    { category: 'Liste de diffusion marketing (inscription au code de réduction)', period: 'Jusqu’à votre désabonnement, puis suppression sous 30 jours' },
                    { category: 'Données analytiques (avec consentement)', period: '14 mois dans Google Analytics 4, puis suppression automatique par Google' },
                    { category: 'Journaux serveur', period: '30 jours, puis rotation automatique' },
                    { category: 'Sauvegardes', period: '30 jours glissants, puis écrasement' },
                ],
            },
            contact: {
                title: 'Nous contacter',
                body: 'Pour toute question, préoccupation ou demande concernant vos données personnelles :',
                email: 'privacy@smartprintai.com',
                supportLinkLabel: 'Pour les questions liées aux commandes, utilisez notre',
                supportLinkText: 'centre de support',
            },
        },
        terms: {
            metadata: {
                title: 'Conditions générales d’utilisation',
                description:
                    'L’accord entre vous et SmartPrintAI lorsque vous utilisez notre service d’impression à la demande propulsé par l’IA.',
            },
            headerTitle: 'Conditions générales d’utilisation',
            effectiveDate: 'Date d’entrée en vigueur : 18 mai 2026',
            lastUpdated: 'Dernière mise à jour : 18 mai 2026',
            nav: {
                overview: 'Aperçu',
                orders: 'Commandes',
                pricing: 'Tarification',
                aiContent: 'Contenus IA',
                intellectualProperty: 'PI',
                returns: 'Retours et livraison',
                liability: 'Responsabilité',
                governingLaw: 'Droit applicable',
                changes: 'Modifications',
                contact: 'Contact',
            },
            intro: {
                title: 'Accord',
                body:
                    'Les présentes Conditions régissent votre utilisation du service SmartPrintAI accessible sur smartprintai.com (le « Service »). En passant commande ou en utilisant le Service de toute autre manière, vous acceptez ces Conditions. SmartPrintAI est exploité par Matthieu Kokabi.',
            },
            orders: {
                title: 'Commandes et exécution',
                body:
                    'Les articles personnalisés sont fabriqués à la demande — la production démarre uniquement après finalisation de votre paiement. Délai de production typique : 2 à 5 jours ouvrés ; la livraison prend ensuite 3 à 10 jours ouvrés selon le pays de destination et le partenaire d’exécution affecté à votre produit. Les notifications de confirmation, de mise en production et d’expédition sont envoyées à l’adresse e-mail fournie au paiement.',
            },
            pricing: {
                title: 'Prix, taxes et paiement',
                body:
                    'Les prix affichés sur les fiches produits sont en dollars américains et incluent le design, la production et la marge du Service. Les frais de livraison sont calculés au paiement en fonction de la destination. Pour les clients de l’UE, la TVA est calculée et affichée au paiement conformément à votre pays de livraison. Le paiement est traité par Stripe ; nous ne stockons jamais l’intégralité des données de carte.',
            },
            aiContent: {
                title: 'Designs générés par IA',
                body:
                    "Vous fournissez une invite textuelle et notre système génère une image. Vous êtes responsable du contenu de votre invite : elle ne doit pas porter atteinte aux droits de tiers, représenter des personnes réelles identifiables sans leur consentement, ni inclure des contenus interdits par les règles d’usage de Google Gemini ou par nos propres règles de plateforme (notamment incitation à la haine, contenus sexuels impliquant des mineurs, doxxing ou menaces violentes). Les designs en infraction peuvent être refusés en production et nous remboursons alors intégralement la commande.",
            },
            intellectualProperty: {
                title: 'Propriété intellectuelle',
                body:
                    'Vous êtes propriétaire du design généré à partir de votre invite et du produit physique imprimé à partir de celui-ci. SmartPrintAI conserve une licence non exclusive d’utilisation des images et visuels (mockups) générés, limitée à la production, au support client et (lorsque permis) à l’amélioration anonymisée du modèle. Le nom, le logo et le logiciel SmartPrintAI sont notre propriété et ne peuvent être réutilisés sans autorisation.',
            },
            returns: {
                title: 'Retours et livraison',
                body:
                    "Chaque article étant fabriqué à la demande, le droit de la consommation de l’UE (délai de rétractation de 14 jours) ne s’applique pas aux articles personnalisés, sauf en cas de produit défectueux ou endommagé à l’arrivée. Nous prenons en charge tous les défauts et dommages à nos frais et procédons au refait ou au remboursement dans un délai raisonnable après réception de preuves photographiques. Détails complets :",
                returnsLinkLabel: 'Politique de retours',
                shippingLinkLabel: 'Informations de livraison',
            },
            liability: {
                title: 'Limitation de responsabilité',
                body:
                    'Dans la limite maximale permise par le droit de la consommation de l’UE, la responsabilité de SmartPrintAI pour une commande donnée est limitée au montant que vous avez payé pour cette commande, sauf en cas de décès, de dommage corporel, de fraude, de faute lourde ou lorsque le droit applicable interdit une telle limitation. Cette clause n’affecte pas les droits non disponibles que vous tenez de la loi en tant que consommateur.',
            },
            governingLaw: {
                title: 'Droit applicable',
                body:
                    'Les présentes Conditions sont régies par le droit français, sous réserve de l’application impérative des règles de protection des consommateurs de votre pays de résidence habituelle. Les consommateurs de l’UE peuvent également porter les litiges devant les juridictions de leur État membre de résidence. La Commission européenne met à disposition une plateforme de résolution en ligne des litiges à l’adresse https://ec.europa.eu/consumers/odr.',
            },
            changes: {
                title: 'Modifications des Conditions',
                body:
                    'Nous pouvons mettre à jour ces Conditions — par exemple pour refléter un nouveau sous-traitant, une exigence réglementaire ou une évolution produit. Les modifications substantielles vous seront notifiées par e-mail (si vous avez un compte) et affichées sur cette page avec une nouvelle date de « Dernière mise à jour ». Continuer à utiliser le Service après cette date vaut acceptation des Conditions mises à jour.',
            },
            contact: {
                title: 'Contact',
                body: 'Pour les questions liées aux commandes, utilisez notre centre de support ; pour les questions juridiques, écrivez-nous :',
                email: 'legal@smartprintai.com',
                supportLinkLabel: 'Problèmes de commande :',
                supportLinkText: 'centre de support',
            },
        },
        consent: {
            title: 'Nous utilisons des cookies',
            body:
                'Les cookies essentiels permettent au site de fonctionner. Avec votre consentement, nous utilisons également des cookies d’analyse (Google Analytics 4) pour comprendre votre utilisation du site et l’améliorer. Vous pouvez changer d’avis à tout moment depuis notre Politique de confidentialité.',
            accept: 'Tout accepter',
            reject: 'Refuser les non-essentiels',
            learnMore: 'Lire notre Politique de confidentialité',
        },
        footer: {
            tagline: 'Décrivez-le. L’IA le crée. Nous l’imprimons et l’expédions.',
            cta: 'Créer mon produit',
            productsHeading: 'Produits',
            productsList: {
                tshirts: 'T-shirts',
                hoodies: 'Sweats à capuche',
                mugs: 'Mugs',
                wallArt: 'Décoration murale',
            },
            supportHeading: 'Assistance',
            supportLinks: {
                shipping: 'Livraison',
                returns: 'Retours',
                terms: 'Conditions',
                privacy: 'Confidentialité',
            },
            copyright: '© 2026 SmartPrintAI. Tous droits réservés.',
        },
        errors: {
            generic: {
                title: 'Une erreur est survenue',
                body:
                    'Nous avons rencontré une erreur inattendue. Veuillez réessayer. Si le problème persiste, contactez notre assistance.',
                retry: 'Réessayer',
                goHome: 'Retour à l’accueil',
                contactSupport: 'Contacter l’assistance',
                referenceLabel: 'Référence',
            },
            notFound: {
                eyebrow: '404',
                title: 'Page introuvable',
                body:
                    'La page que vous cherchiez n’existe pas — le lien est peut-être incorrect ou la page a été déplacée.',
                goHome: 'Retour à l’accueil',
                startCreating: 'Commencer à créer',
            },
        },
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
            readyToBuyOnlyLabel: "Ce produit est vendu tel quel et n'est pas disponible en mode design IA.",
            readyToBuyAddToCartLabel: 'Ajouter au panier',
            readyToBuyAddedToCartLabel: 'Ajoute au panier',
            readyToBuyGoToCartLabel: 'Aller au panier',
        },
        create: {
            metadataTitle: 'Creer votre design',
            metadataDescription:
                'Decrivez votre idee et generez un visuel IA pret pour des produits print-on-demand.',
            titleLead: 'Creez votre',
            titleAccent: 'design',
            subtitle: 'Etape 1 decrivez le design. Etape 2 choisissez le produit. Etape 3 ajoutez au panier.',
            entryStepLabel: 'Etape 1',
            entryStepTitle: 'Decrivez exactement ce qui doit etre imprime.',
            entryStepHint: 'Ajoutez sujet + style + "fond transparent" pour des mockups plus propres.',
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
            cartButton: {
                notReady: "Générez d'abord un design",
                generating: 'Création du visuel...',
                unavailable: 'Visuel indisponible — changez de couleur ou régénérez',
            },
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
            nextStepsLabel: 'Prochaines etapes',
            manualReviewReassurance: 'Nous validons les details de livraison avant lancement production. Aucune action de paiement n est requise.',
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
                manualReviewNote: 'Les details de livraison sont en cours de verification. La production demarre juste apres ce controle.',
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
        returns: deReturnsCopy,
        shipping: deShippingCopy,
        privacy: {
            metadata: {
                title: 'Datenschutzerklärung',
                description:
                    'Wie SmartPrintAI Ihre Daten verarbeitet: Rechtsgrundlage, Auftragsverarbeiter, Cookies, Ihre DSGVO-Rechte und Kontaktwege.',
            },
            headerTitle: 'Datenschutzerklärung',
            effectiveDate: 'Gültig ab: 18. Mai 2026',
            lastUpdated: 'Zuletzt aktualisiert: 18. Mai 2026',
            nav: {
                overview: 'Übersicht',
                processors: 'Auftragsverarbeiter',
                cookies: 'Cookies',
                yourRights: 'Ihre Rechte',
                retention: 'Speicherdauer',
                contact: 'Kontakt',
            },
            intro: {
                title: 'Was diese Erklärung umfasst',
                body:
                    'SmartPrintAI („wir") betreibt einen KI-gestützten Print-on-Demand-Dienst auf smartprintai.com. Diese Erklärung beschreibt die personenbezogenen Daten, die wir erheben, warum wir sie verarbeiten, mit wem wir sie teilen, wie lange wir sie speichern, und die Rechte, die Ihnen nach der EU-Datenschutz-Grundverordnung (DSGVO) zustehen.',
                controller:
                    // CONFIRM: "Verantwortlicher" + dative phrasing — idiomatic German legal register?
                    'Verantwortlicher: SmartPrintAI, betrieben von Matthieu Kokabi. Für Datenschutzanfragen wenden Sie sich an privacy@smartprintai.com.',
            },
            processors: {
                title: 'Dienstleister (Auftragsverarbeiter)',
                intro:
                    'Wir nutzen die folgenden Auftragsverarbeiter zum Betrieb des Dienstes. Jeder erhält nur die Daten, die für seine jeweilige Aufgabe erforderlich sind, auf Grundlage eines schriftlichen Auftragsverarbeitungsvertrags.',
                items: [
                    {
                        name: 'Stripe Payments Europe Ltd (Irland) — Muttergesellschaft Stripe, Inc. (USA)',
                        role: 'Zahlungsabwicklung. Erhält Kartendaten, Rechnungsadresse, E-Mail und Bestellbetrag.',
                        region: 'EU + USA',
                    },
                    {
                        name: 'Printful Latvia, SIA (Lettland) und Printful, Inc. (USA)',
                        role: 'On-Demand-Produktion für Printful-Artikel. Erhält Lieferadresse, Empfängername, E-Mail, Produktvariante und URL der Design-Datei.',
                        region: 'EU + USA',
                    },
                    {
                        name: 'Gelato AS (Norwegen)',
                        role: 'On-Demand-Produktion für Gelato-Artikel. Erhält Lieferadresse, Empfängername, E-Mail, Produktvariante und URL der Design-Datei.',
                        region: 'Norwegen (EWR) + globales Produktionsnetz',
                    },
                    {
                        name: 'Gooten, Inc. (USA)',
                        role: 'On-Demand-Produktion für Gooten-Artikel. Erhält Lieferadresse, Empfängername, E-Mail, Produktvariante und URL der Design-Datei.',
                        region: 'USA',
                    },
                    {
                        name: 'Resend.com Inc. (USA)',
                        role: 'Versand transaktionaler und marketingbezogener E-Mails (Bestellbestätigung, Versandbenachrichtigung, Support-Antworten, Rabatt-Code-E-Mails). Erhält Ihre E-Mail-Adresse und Bestellmetadaten.',
                        region: 'USA',
                    },
                    {
                        name: 'Google LLC — Gemini API (USA) und Google Ireland Ltd. (Irland)',
                        role: 'KI-Bildgenerierung. Erhält den Text-Prompt, den Sie eingeben. Erhält weder Ihre E-Mail-Adresse noch Ihre Lieferadresse.',
                        region: 'USA + EU',
                    },
                    {
                        name: 'Google LLC — Google Analytics 4 (USA) und Google Ireland Ltd. (Irland)',
                        role: 'Aggregierte Website-Analytik. Cookie-lose Pings (Consent Mode v2) laufen durchgehend; Cookies werden erst nach Ihrem Klick auf „Akzeptieren" gesetzt. Die IP-Adresse wird anonymisiert.',
                        region: 'USA + EU',
                    },
                    {
                        name: 'Make.com (Celonis SE, Tschechische Republik)',
                        role: 'Interne Automatisierung: Bestell-Event-Benachrichtigungen, Trigger für abgebrochene Warenkörbe, tägliche Ops-Übersicht. Erhält Bestellmetadaten (Bestell-ID, Gesamtbetrag, Kunden-E-Mail, Status).',
                        region: 'EU',
                    },
                    {
                        name: 'Hostinger International Ltd. (Litauen / Zypern)',
                        role: 'VPS-Hosting-Anbieter. Speichert die Datenbank, Design-Dateien, Server-Logs und Backups des Dienstes.',
                        region: 'EU',
                    },
                ],
            },
            cookies: {
                title: 'Cookies',
                intro:
                    'Wir verwenden nur die Cookies, die für den Betrieb der Website erforderlich sind. Analyse-Cookies werden erst nach Ihrem Klick auf „Akzeptieren" gesetzt.',
                essential: {
                    title: 'Essenzielle Cookies',
                    body:
                        'Warenkorbinhalt, Sitzung und Ihre Cookie-Einwilligungsentscheidung selbst. Diese sind immer aktiv, da die Website ohne sie nicht funktionieren kann. Keine Weitergabe personenbezogener Daten an Dritte.',
                },
                analytics: {
                    title: 'Analyse-Cookies (Einwilligung erforderlich)',
                    body:
                        // CONFIRM: visitor_id is a technical term — leave English or translate to "Besucher-ID"?
                        'Google-Analytics-4-Besucherkennung, Attribution (UTM-Quelle/Medium/Kampagne/Verweis) und unsere visitor_id für die Funnel-Messung. Keines davon wird vor Ihrem Klick auf „Akzeptieren" gesetzt. Bei „Ablehnen" werden sie nie gesetzt.',
                },
                consentNote:
                    'Sie können Ihre Wahl jederzeit ändern, indem Sie die Cookies dieser Website in Ihrem Browser löschen — das Banner erscheint bei Ihrem nächsten Besuch erneut.',
            },
            yourRights: {
                title: 'Ihre Rechte nach der DSGVO',
                intro:
                    'Bezüglich der personenbezogenen Daten, die wir über Sie verarbeiten, haben Sie folgende Rechte:',
                items: [
                    'Auskunftsrecht über Ihre personenbezogenen Daten (Art. 15 DSGVO)',
                    'Recht auf Berichtigung unrichtiger Daten (Art. 16 DSGVO)',
                    'Recht auf Löschung („Recht auf Vergessenwerden") (Art. 17 DSGVO)',
                    'Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)',
                    'Recht auf Datenübertragbarkeit (Art. 20 DSGVO)',
                    'Widerspruchsrecht gegen die Verarbeitung (Art. 21 DSGVO)',
                    'Recht, Ihre Einwilligung jederzeit zu widerrufen (Art. 7 Abs. 3 DSGVO)',
                    'Recht auf Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO)',
                ],
                howToExercise:
                    'Um eines dieser Rechte auszuüben, schreiben Sie eine E-Mail von der mit Ihrem Konto verknüpften Adresse an privacy@smartprintai.com. Wir bemühen uns, innerhalb der von der DSGVO vorgesehenen 30 Tage zu antworten.',
                supervisoryAuthority:
                    // CONFIRM: In Deutschland ist die zustaendige Behoerde der jeweilige Landesdatenschutzbeauftragte (nicht BfDI, der nur fuer Bundesbehoerden zustaendig ist). Dieser Satz nennt BfDI als Beispiel — fuer einen Endkunden ist der Landesbeauftragte zustaendiger. Operator: ist die generische Formulierung "BfDI als Beispiel" akzeptabel, oder soll ich auf "Landesdatenschutzbehoerde" wechseln?
                    'Wenn Sie der Ansicht sind, dass wir Ihre Daten nicht ordnungsgemäß verarbeiten, können Sie sich an die Datenschutzbehörde des EU-Mitgliedstaats wenden, in dem Sie wohnen, arbeiten oder in dem der Vorfall eingetreten ist — beispielsweise die CNIL in Frankreich, die zuständige Landesdatenschutzbehörde in Deutschland oder die AEPD in Spanien.',
            },
            retention: {
                title: 'Speicherdauer',
                intro:
                    'Wir speichern personenbezogene Daten nur so lange, wie wir einen rechtmäßigen Grund dafür haben:',
                items: [
                    { category: 'Bestelldaten', period: '10 Jahre (nach Steuer- und Handelsrecht der meisten EU-Mitgliedstaaten verpflichtend)' },
                    { category: 'Support-Anfragen', period: '2 Jahre ab letztem Kontakt' },
                    { category: 'Marketing-Verteiler (Rabattanmeldung)', period: 'Bis zur Abmeldung, danach Löschung innerhalb von 30 Tagen' },
                    { category: 'Analytik-Daten (bei Einwilligung)', period: '14 Monate in Google Analytics 4, danach automatische Löschung durch Google' },
                    { category: 'Server-Logs', period: '30 Tage, danach automatische Rotation' },
                    { category: 'Backups', period: '30 Tage rollierend, danach Überschreibung' },
                ],
            },
            contact: {
                title: 'Kontakt',
                body: 'Für Fragen, Anliegen oder Anträge zu Ihren personenbezogenen Daten:',
                email: 'privacy@smartprintai.com',
                supportLinkLabel: 'Bei bestellbezogenen Fragen nutzen Sie unser',
                supportLinkText: 'Support-Center',
            },
        },
        terms: {
            metadata: {
                title: 'Allgemeine Geschäftsbedingungen',
                description:
                    'Die Vereinbarung zwischen Ihnen und SmartPrintAI bei Nutzung unseres KI-gestützten Print-on-Demand-Dienstes.',
            },
            headerTitle: 'Allgemeine Geschäftsbedingungen',
            effectiveDate: 'Gültig ab: 18. Mai 2026',
            lastUpdated: 'Zuletzt aktualisiert: 18. Mai 2026',
            nav: {
                overview: 'Übersicht',
                orders: 'Bestellungen',
                pricing: 'Preise',
                aiContent: 'KI-Inhalte',
                intellectualProperty: 'Geistiges Eigentum',
                returns: 'Rückgabe & Versand',
                liability: 'Haftung',
                governingLaw: 'Anwendbares Recht',
                changes: 'Änderungen',
                contact: 'Kontakt',
            },
            intro: {
                title: 'Vereinbarung',
                body:
                    'Diese Bedingungen regeln Ihre Nutzung des SmartPrintAI-Dienstes auf smartprintai.com (der „Dienst"). Durch Aufgabe einer Bestellung oder anderweitige Nutzung des Dienstes akzeptieren Sie diese Bedingungen. SmartPrintAI wird von Matthieu Kokabi betrieben.',
            },
            orders: {
                title: 'Bestellungen und Ausführung',
                body:
                    // CONFIRM: "auf Bestellung gefertigt" vs. "auftragsbezogen gefertigt" — welches passt besser im AGB-Register?
                    'Personalisierte Artikel werden auf Bestellung gefertigt — die Produktion beginnt erst nach Abschluss Ihrer Zahlung. Typische Produktionszeit: 2–5 Werktage; der Versand dauert anschließend 3–10 Werktage je nach Zielland und dem für Ihr Produkt zuständigen Produktionspartner. Bestellbestätigung, Produktionsbeginn und Versandbenachrichtigung werden an die von Ihnen beim Bezahlvorgang angegebene E-Mail-Adresse gesendet.',
            },
            pricing: {
                title: 'Preise, Steuern und Zahlung',
                body:
                    'Die auf den Produktseiten angezeigten Preise sind in US-Dollar und umfassen Design, Produktion und unsere Servicemarge. Die Versandkosten werden beim Bezahlvorgang anhand des Zielortes berechnet. Für Kunden in der EU wird die Mehrwertsteuer beim Bezahlvorgang gemäß Ihrem Lieferland berechnet und ausgewiesen. Die Zahlung erfolgt über Stripe; vollständige Kartendaten speichern wir nicht.',
            },
            aiContent: {
                title: 'KI-generierte Designs',
                body:
                    'Sie geben einen Text-Prompt ein, und unser System erzeugt ein Bild. Sie sind für den Inhalt Ihres Prompts verantwortlich: Er darf keine Rechte Dritter verletzen, keine real identifizierbaren Personen ohne deren Einwilligung darstellen und keine Inhalte enthalten, die gegen die Nutzungsrichtlinien von Google Gemini oder unsere Plattformregeln verstoßen (insbesondere Hassrede, sexuelle Inhalte mit Minderjährigen, Doxxing oder Gewaltdrohungen). Designs, die dagegen verstoßen, können in der Produktion abgelehnt werden; in diesem Fall erstatten wir die Bestellung vollständig.',
            },
            intellectualProperty: {
                title: 'Geistiges Eigentum',
                body:
                    'Sie sind Eigentümer des aus Ihrem Prompt erzeugten Designs und des daraus gefertigten physischen Produkts. SmartPrintAI behält sich eine nicht ausschließliche Lizenz zur Nutzung erzeugter Bilder und Mockups vor — beschränkt auf Produktion, Kundensupport und (sofern erlaubt) anonymisierte Modellverbesserung. Name, Logo und Software von SmartPrintAI sind unser Eigentum und dürfen ohne Erlaubnis nicht weiterverwendet werden.',
            },
            returns: {
                title: 'Rückgabe und Versand',
                body:
                    // CONFIRM: 14-Tage-Widerrufsrecht — Ausnahme fuer "nach Kundenspezifikation angefertigte Waren" gemaess § 312g Abs. 2 Nr. 1 BGB. Diese Formulierung sollte das wiedergeben.
                    'Da jeder Artikel auf Bestellung gefertigt wird, gilt das 14-tägige Widerrufsrecht des EU-Verbraucherrechts für individuell bedruckte Artikel grundsätzlich nicht — außer der Artikel ist bei Ankunft mangelhaft oder beschädigt. Mängel und Transportschäden tragen wir vollständig: Nach Erhalt eines Fotonachweises fertigen wir den Artikel innerhalb angemessener Frist neu oder erstatten den Kaufpreis. Vollständige Details:',
                returnsLinkLabel: 'Rückgaberichtlinie',
                shippingLinkLabel: 'Versandinformationen',
            },
            liability: {
                title: 'Haftungsbeschränkung',
                body:
                    'Soweit gesetzlich zulässig, ist die Haftung von SmartPrintAI für eine einzelne Bestellung auf den Betrag begrenzt, den Sie für diese Bestellung gezahlt haben. Ausgenommen sind Fälle von Tod, Körperverletzung, Betrug, grober Fahrlässigkeit sowie Fälle, in denen das anwendbare Recht eine solche Beschränkung untersagt. Diese Klausel berührt keine zwingenden Verbraucherrechte, die Ihnen zustehen.',
            },
            governingLaw: {
                title: 'Anwendbares Recht',
                body:
                    'Diese Bedingungen unterliegen französischem Recht; zwingende Verbraucherschutzbestimmungen Ihres Landes des gewöhnlichen Aufenthalts bleiben ausdrücklich unberührt. EU-Verbraucher können Streitigkeiten auch vor den Gerichten ihres Mitgliedstaats der Wohnsitzes anhängig machen. Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung unter https://ec.europa.eu/consumers/odr bereit.',
            },
            changes: {
                title: 'Änderungen dieser Bedingungen',
                body:
                    'Wir können diese Bedingungen aktualisieren — etwa um einen neuen Auftragsverarbeiter, eine regulatorische Anforderung oder eine Produktänderung abzubilden. Wesentliche Änderungen kündigen wir per E-Mail an (sofern ein Konto besteht) und kennzeichnen die Seite mit einem neuen „Zuletzt aktualisiert"-Datum. Mit der weiteren Nutzung des Dienstes nach diesem Datum akzeptieren Sie die geänderten Bedingungen.',
            },
            contact: {
                title: 'Kontakt',
                body: 'Bei bestellbezogenen Anliegen nutzen Sie unser Support-Center; für rechtliche Fragen schreiben Sie uns:',
                email: 'legal@smartprintai.com',
                supportLinkLabel: 'Bestellprobleme:',
                supportLinkText: 'Support-Center',
            },
        },
        consent: {
            title: 'Wir verwenden Cookies',
            body:
                'Essenzielle Cookies sind für den Betrieb der Website erforderlich. Mit Ihrer Einwilligung nutzen wir zusätzlich Analyse-Cookies (Google Analytics 4), um zu verstehen, wie Sie die Website nutzen, und sie zu verbessern. Sie können Ihre Wahl jederzeit in unserer Datenschutzerklärung ändern.',
            accept: 'Alle akzeptieren',
            reject: 'Nicht-essenzielle ablehnen',
            learnMore: 'Datenschutzerklärung lesen',
        },
        footer: {
            tagline: 'Beschreibe es. Die KI erstellt es. Wir drucken und versenden es.',
            cta: 'Produkt erstellen',
            productsHeading: 'Produkte',
            productsList: {
                tshirts: 'T-Shirts',
                hoodies: 'Hoodies',
                mugs: 'Tassen',
                wallArt: 'Wandkunst',
            },
            supportHeading: 'Hilfe',
            supportLinks: {
                shipping: 'Versand',
                returns: 'Rückgabe',
                terms: 'AGB',
                privacy: 'Datenschutz',
            },
            copyright: '© 2026 SmartPrintAI. Alle Rechte vorbehalten.',
        },
        errors: {
            generic: {
                title: 'Etwas ist schiefgelaufen',
                body:
                    'Es ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es erneut. Wenn das Problem weiterhin besteht, wenden Sie sich an unseren Support.',
                retry: 'Erneut versuchen',
                goHome: 'Zur Startseite',
                contactSupport: 'Support kontaktieren',
                referenceLabel: 'Referenz',
            },
            notFound: {
                eyebrow: '404',
                title: 'Seite nicht gefunden',
                body:
                    'Die gesuchte Seite existiert nicht — vielleicht ist der Link falsch, oder die Seite wurde verschoben.',
                goHome: 'Zur Startseite',
                startCreating: 'Mit dem Erstellen beginnen',
            },
        },
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
            readyToBuyOnlyLabel: 'Dieses Produkt wird unveraendert verkauft und ist nicht im KI-Design-Modus verfuegbar.',
            readyToBuyAddToCartLabel: 'In den Warenkorb',
            readyToBuyAddedToCartLabel: 'Zum Warenkorb hinzugefuegt',
            readyToBuyGoToCartLabel: 'Zum Warenkorb',
        },
        create: {
            metadataTitle: 'Erstelle dein Design',
            metadataDescription:
                'Beschreibe deine Idee und erzeuge KI-Grafiken fuer Print-on-Demand Produkte.',
            titleLead: 'Erstelle dein',
            titleAccent: 'Design',
            subtitle: 'Schritt 1 Design beschreiben. Schritt 2 Produkt waehlen. Schritt 3 in den Warenkorb legen.',
            entryStepLabel: 'Schritt 1',
            entryStepTitle: 'Beschreibe genau, was gedruckt werden soll.',
            entryStepHint: 'Motiv + Stil + "transparenter Hintergrund" liefern sauberere Mockups.',
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
            cartButton: {
                notReady: 'Erstelle zuerst ein Design',
                generating: 'Mockup wird erstellt...',
                unavailable: 'Mockup nicht verfuegbar — andere Farbe waehlen oder neu generieren',
            },
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
            nextStepsLabel: 'Was als Naechstes passiert',
            manualReviewReassurance: 'Wir bestaetigen die Lieferdetails vor Produktionsstart. Keine Zahlungsaktion von dir erforderlich.',
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
                manualReviewNote: 'Die Lieferdetails werden geprueft. Die Produktion startet direkt danach.',
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
        returns: esReturnsCopy,
        shipping: esShippingCopy,
        privacy: {
            metadata: {
                title: 'Política de Privacidad',
                description:
                    'Cómo SmartPrintAI gestiona sus datos: base legal, encargados del tratamiento, cookies, sus derechos RGPD y contacto.',
            },
            headerTitle: 'Política de Privacidad',
            effectiveDate: 'Fecha de entrada en vigor: 18 de mayo de 2026',
            lastUpdated: 'Última actualización: 18 de mayo de 2026',
            nav: {
                overview: 'Resumen',
                processors: 'Encargados',
                cookies: 'Cookies',
                yourRights: 'Sus derechos',
                retention: 'Conservación',
                contact: 'Contacto',
            },
            intro: {
                title: 'Alcance de esta política',
                body:
                    'SmartPrintAI («nosotros») presta un servicio de impresión bajo demanda potenciado por IA en smartprintai.com. Esta política explica los datos personales que recopilamos, por qué los tratamos, con quién los compartimos, durante cuánto tiempo los conservamos y los derechos que le reconoce el Reglamento General de Protección de Datos (RGPD).',
                controller:
                    // CONFIRM: "Responsable del tratamiento" es el termino RGPD estandar. ¿Idiomatico?
                    'Responsable del tratamiento: SmartPrintAI, operado por Matthieu Kokabi. Para consultas sobre protección de datos: privacy@smartprintai.com.',
            },
            processors: {
                title: 'Proveedores (encargados del tratamiento)',
                intro:
                    'Utilizamos los siguientes encargados del tratamiento para operar el servicio. Cada uno recibe únicamente los datos necesarios para su tarea, en virtud de un contrato de encargo del tratamiento por escrito.',
                items: [
                    {
                        name: 'Stripe Payments Europe Ltd (Irlanda) — matriz Stripe, Inc. (EE. UU.)',
                        role: 'Procesamiento de pagos. Recibe los datos de la tarjeta, dirección de facturación, correo electrónico e importe del pedido.',
                        region: 'UE + EE. UU.',
                    },
                    {
                        name: 'Printful Latvia, SIA (Letonia) y Printful, Inc. (EE. UU.)',
                        role: 'Producción bajo demanda para artículos Printful. Recibe la dirección de envío, nombre del destinatario, correo electrónico, variante del producto y URL del archivo de diseño.',
                        region: 'UE + EE. UU.',
                    },
                    {
                        name: 'Gelato AS (Noruega)',
                        role: 'Producción bajo demanda para artículos Gelato. Recibe la dirección de envío, nombre del destinatario, correo electrónico, variante del producto y URL del archivo de diseño.',
                        region: 'Noruega (EEE) + red mundial de producción',
                    },
                    {
                        name: 'Gooten, Inc. (Estados Unidos)',
                        role: 'Producción bajo demanda para artículos Gooten. Recibe la dirección de envío, nombre del destinatario, correo electrónico, variante del producto y URL del archivo de diseño.',
                        region: 'EE. UU.',
                    },
                    {
                        name: 'Resend.com Inc. (Estados Unidos)',
                        role: 'Envío de correos electrónicos transaccionales y de marketing (confirmación de pedido, notificación de envío, respuestas de soporte, correos de código de descuento). Recibe su dirección de correo electrónico y metadatos de pedido.',
                        region: 'EE. UU.',
                    },
                    {
                        name: 'Google LLC — API Gemini (EE. UU.) y Google Ireland Ltd. (Irlanda)',
                        role: 'Generación de imágenes con IA. Recibe el «prompt» (instrucción de texto) que usted introduce. No recibe su correo electrónico ni su dirección de envío.',
                        region: 'EE. UU. + UE',
                    },
                    {
                        name: 'Google LLC — Google Analytics 4 (EE. UU.) y Google Ireland Ltd. (Irlanda)',
                        role: 'Analítica agregada del sitio. Las solicitudes sin cookies (Consent Mode v2) se ejecutan siempre; las cookies se almacenan únicamente tras su clic en «Aceptar». La IP se anonimiza.',
                        region: 'EE. UU. + UE',
                    },
                    {
                        name: 'Make.com (Celonis SE, República Checa)',
                        role: 'Automatización interna: alertas de pedidos, disparadores de carrito abandonado, resumen operativo diario. Recibe metadatos de pedido (ID, importe total, correo electrónico del cliente, estado).',
                        region: 'UE',
                    },
                    {
                        name: 'Hostinger International Ltd. (Lituania / Chipre)',
                        role: 'Proveedor de alojamiento VPS. Almacena la base de datos, archivos de diseño, registros de servidor y copias de seguridad del servicio.',
                        region: 'UE',
                    },
                ],
            },
            cookies: {
                title: 'Cookies',
                intro:
                    'Usamos únicamente las cookies necesarias para operar el sitio. Las cookies de análisis solo se activan tras su clic en «Aceptar».',
                essential: {
                    title: 'Cookies esenciales',
                    body:
                        'Contenido del carrito, sesión y su propia elección de consentimiento de cookies. Siempre están activas porque el sitio no puede funcionar sin ellas. No se comparten datos personales con terceros.',
                },
                analytics: {
                    title: 'Cookies de análisis (consentimiento requerido)',
                    body:
                        'Identificador de visitante de Google Analytics 4, atribución (fuente/medio/campaña/referente UTM) y nuestra visitor_id para la medición del embudo. Ninguna se activa antes de su clic en «Aceptar». Si pulsa «Rechazar», nunca se activan.',
                },
                consentNote:
                    'Puede cambiar su elección en cualquier momento borrando las cookies de este sitio en su navegador — el banner volverá a aparecer en su próxima visita.',
            },
            yourRights: {
                title: 'Sus derechos al amparo del RGPD',
                intro:
                    'Tiene los siguientes derechos sobre los datos personales que tratamos sobre usted:',
                items: [
                    'Derecho de acceso a sus datos personales (art. 15 RGPD)',
                    'Derecho de rectificación de datos inexactos (art. 16 RGPD)',
                    'Derecho de supresión («derecho al olvido») (art. 17 RGPD)',
                    'Derecho a la limitación del tratamiento (art. 18 RGPD)',
                    'Derecho a la portabilidad de los datos (art. 20 RGPD)',
                    'Derecho de oposición al tratamiento (art. 21 RGPD)',
                    'Derecho a retirar su consentimiento en cualquier momento (art. 7.3 RGPD)',
                    'Derecho a presentar una reclamación ante una autoridad de control (art. 77 RGPD)',
                ],
                howToExercise:
                    'Para ejercer cualquiera de estos derechos, envíe un correo electrónico a privacy@smartprintai.com desde la dirección asociada a su cuenta. Procuramos responder dentro de los 30 días previstos por el RGPD.',
                supervisoryAuthority:
                    'Si considera que no estamos gestionando correctamente sus datos, puede presentar una reclamación ante la autoridad de protección de datos del Estado miembro de la UE en el que reside, trabaja o donde se haya producido la incidencia — por ejemplo, la CNIL en Francia, el BfDI en Alemania o la AEPD en España.',
            },
            retention: {
                title: 'Plazos de conservación',
                intro:
                    'Conservamos los datos personales solo durante el tiempo en que tengamos un motivo legítimo para hacerlo:',
                items: [
                    { category: 'Registros de pedidos', period: '10 años (obligatorio en virtud de la normativa fiscal y contable en la mayoría de Estados miembros de la UE)' },
                    { category: 'Solicitudes de soporte', period: '2 años desde el último contacto' },
                    { category: 'Lista de marketing (alta para código de descuento)', period: 'Hasta que se dé de baja; supresión en un plazo de 30 días' },
                    { category: 'Datos analíticos (con consentimiento)', period: '14 meses en Google Analytics 4, después borrado automático por Google' },
                    { category: 'Registros de servidor', period: '30 días, después rotación automática' },
                    { category: 'Copias de seguridad', period: '30 días rotativos, después sobrescritura' },
                ],
            },
            contact: {
                title: 'Contacto',
                body: 'Para cualquier pregunta, inquietud o solicitud sobre sus datos personales:',
                email: 'privacy@smartprintai.com',
                supportLinkLabel: 'Para consultas relacionadas con pedidos, utilice nuestro',
                supportLinkText: 'centro de soporte',
            },
        },
        terms: {
            metadata: {
                title: 'Términos de Servicio',
                description:
                    'El acuerdo entre usted y SmartPrintAI cuando utiliza nuestro servicio de impresión bajo demanda potenciado por IA.',
            },
            headerTitle: 'Términos de Servicio',
            effectiveDate: 'Fecha de entrada en vigor: 18 de mayo de 2026',
            lastUpdated: 'Última actualización: 18 de mayo de 2026',
            nav: {
                overview: 'Resumen',
                orders: 'Pedidos',
                pricing: 'Precios',
                aiContent: 'Contenidos IA',
                intellectualProperty: 'PI',
                returns: 'Devoluciones y envío',
                liability: 'Responsabilidad',
                governingLaw: 'Ley aplicable',
                changes: 'Cambios',
                contact: 'Contacto',
            },
            intro: {
                title: 'Acuerdo',
                body:
                    'Los presentes Términos regulan su uso del servicio SmartPrintAI accesible en smartprintai.com (el «Servicio»). Al realizar un pedido o utilizar el Servicio de cualquier otra forma, usted acepta estos Términos. SmartPrintAI es operado por Matthieu Kokabi.',
            },
            orders: {
                title: 'Pedidos y entrega',
                body:
                    // CONFIRM: "fabricado bajo demanda" / "hecho a pedido" — ¿cual encaja mejor en el registro legal espanol?
                    'Los artículos personalizados se fabrican bajo demanda — la producción comienza únicamente tras finalizar el pago. Tiempo de producción típico: de 2 a 5 días laborables; el envío posterior tarda de 3 a 10 días laborables según el país de destino y el socio de producción asignado a su producto. Las notificaciones de confirmación, producción y envío se envían al correo electrónico facilitado en el pago.',
            },
            pricing: {
                title: 'Precios, impuestos y pago',
                body:
                    'Los precios mostrados en las páginas de producto están en dólares estadounidenses e incluyen el diseño, la producción y el margen del Servicio. Los gastos de envío se calculan en el pago según el destino. Para clientes de la UE, el IVA se calcula y muestra en el pago conforme a su país de entrega. El pago se procesa a través de Stripe; nunca almacenamos los datos completos de la tarjeta.',
            },
            aiContent: {
                title: 'Diseños generados por IA',
                body:
                    'Usted proporciona una instrucción de texto («prompt») y nuestro sistema genera una imagen. Es responsable del contenido de su prompt: no debe vulnerar derechos de terceros, representar personas reales identificables sin su consentimiento, ni incluir contenido prohibido por las políticas de uso de Google Gemini o por nuestras propias políticas (en particular, incitación al odio, contenido sexual con menores, doxing o amenazas violentas). Los diseños que infrinjan estas normas pueden ser rechazados en producción y reembolsaremos el pedido íntegramente.',
            },
            intellectualProperty: {
                title: 'Propiedad intelectual',
                body:
                    'Usted es titular del diseño generado a partir de su prompt y del producto físico impreso a partir de él. SmartPrintAI conserva una licencia no exclusiva para usar las imágenes y mockups generados, limitada a producción, atención al cliente y (cuando esté permitido) mejora anonimizada del modelo. El nombre, logotipo y software de SmartPrintAI son de nuestra propiedad y no pueden reutilizarse sin permiso.',
            },
            returns: {
                title: 'Devoluciones y envío',
                body:
                    // CONFIRM: la excepcion "bienes confeccionados conforme a las especificaciones del consumidor" (art. 103 LGDCU en Espana) — esta formulacion deberia coincidir.
                    'Dado que cada artículo se fabrica bajo demanda, el derecho de desistimiento de 14 días previsto en la normativa de consumidores de la UE no se aplica a artículos personalizados, salvo que el producto llegue defectuoso o dañado. Asumimos por completo los defectos y daños de transporte: tras recibir prueba fotográfica, refabricamos o reembolsamos el artículo en un plazo razonable. Detalles completos:',
                returnsLinkLabel: 'Política de devoluciones',
                shippingLinkLabel: 'Información de envío',
            },
            liability: {
                title: 'Limitación de responsabilidad',
                body:
                    'En la máxima medida permitida por la normativa de protección al consumidor de la UE, la responsabilidad de SmartPrintAI por cualquier pedido se limita al importe pagado por dicho pedido, salvo en casos de fallecimiento, lesión personal, fraude, culpa grave o cuando la ley aplicable prohíba tal limitación. Esta cláusula no afecta a los derechos irrenunciables que le reconoce la ley como consumidor.',
            },
            governingLaw: {
                title: 'Ley aplicable',
                body:
                    'Los presentes Términos se rigen por el derecho francés, sin perjuicio de las normas imperativas de protección al consumidor de su país de residencia habitual. Los consumidores de la UE también pueden someter las controversias a los tribunales de su Estado miembro de residencia. La Comisión Europea pone a disposición una plataforma de resolución de litigios en línea en https://ec.europa.eu/consumers/odr.',
            },
            changes: {
                title: 'Cambios en estos Términos',
                body:
                    'Podemos actualizar estos Términos — por ejemplo, para reflejar un nuevo encargado del tratamiento, una exigencia normativa o un cambio de producto. Los cambios sustanciales se notificarán por correo electrónico (si dispone de cuenta) y se mostrarán en esta página con una nueva fecha de «Última actualización». El uso continuado del Servicio tras esa fecha implica la aceptación de los Términos modificados.',
            },
            contact: {
                title: 'Contacto',
                body: 'Para asuntos relacionados con pedidos, utilice nuestro centro de soporte; para consultas legales, escríbanos:',
                email: 'legal@smartprintai.com',
                supportLinkLabel: 'Problemas de pedido:',
                supportLinkText: 'centro de soporte',
            },
        },
        consent: {
            title: 'Usamos cookies',
            body:
                'Las cookies esenciales permiten el funcionamiento del sitio. Con su consentimiento también utilizamos cookies de análisis (Google Analytics 4) para entender cómo usa el sitio y mejorarlo. Puede cambiar su elección en cualquier momento desde nuestra Política de Privacidad.',
            accept: 'Aceptar todo',
            reject: 'Rechazar no esenciales',
            learnMore: 'Leer nuestra Política de Privacidad',
        },
        footer: {
            tagline: 'Descríbelo. La IA lo crea. Nosotros lo imprimimos y enviamos.',
            cta: 'Crear mi producto',
            productsHeading: 'Productos',
            productsList: {
                tshirts: 'Camisetas',
                hoodies: 'Sudaderas',
                mugs: 'Tazas',
                wallArt: 'Arte mural',
            },
            supportHeading: 'Ayuda',
            supportLinks: {
                shipping: 'Envío',
                returns: 'Devoluciones',
                terms: 'Términos',
                privacy: 'Privacidad',
            },
            copyright: '© 2026 SmartPrintAI. Todos los derechos reservados.',
        },
        errors: {
            generic: {
                title: 'Algo salió mal',
                body:
                    'Se ha producido un error inesperado. Por favor, vuelva a intentarlo. Si el problema persiste, contacte con nuestro soporte.',
                retry: 'Intentar de nuevo',
                goHome: 'Ir al inicio',
                contactSupport: 'Contactar con soporte',
                referenceLabel: 'Referencia',
            },
            notFound: {
                eyebrow: '404',
                title: 'Página no encontrada',
                body:
                    'La página que buscaba no existe — es posible que el enlace sea incorrecto o que la página haya sido movida.',
                goHome: 'Ir al inicio',
                startCreating: 'Empezar a crear',
            },
        },
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
            readyToBuyOnlyLabel: 'Este producto se vende tal cual y no esta disponible en modo de diseno con IA.',
            readyToBuyAddToCartLabel: 'Anadir al carrito',
            readyToBuyAddedToCartLabel: 'Anadido al carrito',
            readyToBuyGoToCartLabel: 'Ir al carrito',
        },
        create: {
            metadataTitle: 'Crea tu diseno',
            metadataDescription:
                'Describe tu idea y genera arte con IA listo para productos print-on-demand.',
            titleLead: 'Crea tu',
            titleAccent: 'diseno',
            subtitle: 'Paso 1 describe el diseno. Paso 2 elige el producto. Paso 3 anade al carrito.',
            entryStepLabel: 'Paso 1',
            entryStepTitle: 'Describe exactamente lo que se debe imprimir.',
            entryStepHint: 'Incluye sujeto + estilo + "fondo transparente" para mockups mas limpios.',
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
            cartButton: {
                notReady: 'Genera primero un diseno',
                generating: 'Generando mockup...',
                unavailable: 'Mockup no disponible — prueba con otro color o regenera',
            },
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
            nextStepsLabel: 'Que pasa ahora',
            manualReviewReassurance: 'Estamos verificando los datos de envio antes de produccion. No necesitas hacer ninguna accion de pago.',
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
                manualReviewNote: 'Estamos verificando los datos de envio. La produccion comienza justo despues.',
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
