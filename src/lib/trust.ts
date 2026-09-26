import { buildLocaleCanonical, type SupportedLocale } from './i18n'
import { buildTrustDeliveryValue } from './shipping-copy'

type TrustSignalCopy = {
    deliveryLabel: string
    deliveryValue: string
    supportLabel: string
    supportValue: string
    supportLinkLabel: string
    returnsLabel: string
    returnsValue: string
    termsLinkLabel: string
}

const TRUST_SIGNAL_COPY: Record<SupportedLocale, TrustSignalCopy> = {
    en: {
        deliveryLabel: 'Delivery SLA',
        deliveryValue: buildTrustDeliveryValue('en'),
        supportLabel: 'Support Promise',
        supportValue: 'Human support replies within 24 hours on business days.',
        supportLinkLabel: 'Contact support',
        returnsLabel: 'Returns Policy',
        returnsValue: 'Custom products are final sale unless damaged or incorrect.',
        termsLinkLabel: 'Review terms',
    },
    fr: {
        deliveryLabel: 'Delai de livraison',
        deliveryValue: buildTrustDeliveryValue('fr'),
        supportLabel: 'Promesse support',
        supportValue: 'Le support humain repond sous 24 heures les jours ouvres.',
        supportLinkLabel: 'Contacter le support',
        returnsLabel: 'Politique de retour',
        returnsValue: 'Les produits personnalises sont en vente finale sauf article endommage ou incorrect.',
        termsLinkLabel: 'Voir les conditions',
    },
    de: {
        deliveryLabel: 'Lieferzeit',
        deliveryValue: buildTrustDeliveryValue('de'),
        supportLabel: 'Support-Versprechen',
        supportValue: 'Der Support antwortet an Werktagen innerhalb von 24 Stunden.',
        supportLinkLabel: 'Support kontaktieren',
        returnsLabel: 'Rueckgabe',
        returnsValue: 'Personalisierte Produkte sind final, ausser bei Beschaedigung oder Fehlern.',
        termsLinkLabel: 'Bedingungen lesen',
    },
    es: {
        deliveryLabel: 'Plazo de entrega',
        deliveryValue: buildTrustDeliveryValue('es'),
        supportLabel: 'Compromiso de soporte',
        supportValue: 'El soporte humano responde en 24 horas en dias habiles.',
        supportLinkLabel: 'Contactar soporte',
        returnsLabel: 'Politica de devolucion',
        returnsValue: 'Los productos personalizados son venta final salvo dano o error.',
        termsLinkLabel: 'Revisar terminos',
    },
}

export type TrustSignalModel = TrustSignalCopy & {
    supportPath: string
    termsPath: string
}

export function getTrustSignalModel(locale: SupportedLocale): TrustSignalModel {
    const copy = TRUST_SIGNAL_COPY[locale] || TRUST_SIGNAL_COPY.en

    return {
        ...copy,
        supportPath: buildLocaleCanonical(locale, '/support'),
        termsPath: '/terms',
    }
}
