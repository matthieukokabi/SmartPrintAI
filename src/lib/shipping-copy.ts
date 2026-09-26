/**
 * Customer-facing shipping copy, generated from the same numbers the
 * checkout charges and the merchant feed advertises
 * (src/lib/shipping-rates.ts). Nothing in here restates a price, a
 * delivery window or a country list by hand: change shipping-rates.ts
 * and every page, the cart, the terms and the JSON-LD follow.
 *
 * This module must not import '@/lib/i18n' (i18n imports it).
 */

import {
    FREE_SHIPPING_THRESHOLD_USD,
    HANDLING_TIME_BUSINESS_DAYS,
    SHIPPING_COUNTRIES,
    SHIPPING_SERVICES_USD,
    getExpressRateUsd,
    getStandardRateUsd,
} from '@/lib/shipping-rates'

export type ShippingCopyLocale = 'en' | 'fr' | 'de' | 'es'

export type ShippingCopyBlock =
    | { type: 'paragraph'; text: string }
    | { type: 'list'; items: string[] }

type DayRange = { min: number; max: number }

function serviceDays(name: string): DayRange {
    const svc = SHIPPING_SERVICES_USD.find((s) => s.service === name)
    if (!svc) throw new Error(`SHIPPING_SERVICES_USD missing ${name}`)
    return { min: svc.minTransitDays, max: svc.maxTransitDays }
}

export const SHIPPING_FACTS = {
    currency: 'USD',
    standardUsd: getStandardRateUsd(),
    expressUsd: getExpressRateUsd(),
    freeThresholdUsd: FREE_SHIPPING_THRESHOLD_USD,
    handling: { min: HANDLING_TIME_BUSINESS_DAYS.min, max: HANDLING_TIME_BUSINESS_DAYS.max } as DayRange,
    standardTransit: serviceDays('Standard Shipping'),
    expressTransit: serviceDays('Express Shipping'),
    countries: [...SHIPPING_COUNTRIES] as string[],
} as const

export function formatUsd(value: number): string {
    return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`
}

// Static, locale-stable names for the destinations checkout accepts.
// Kept static (not Intl.DisplayNames) so server and client render the
// same string. A country missing here falls back to its ISO code.
const COUNTRY_NAMES: Record<string, Record<ShippingCopyLocale, string>> = {
    US: { en: 'United States', fr: 'États-Unis', de: 'Vereinigte Staaten', es: 'Estados Unidos' },
    CA: { en: 'Canada', fr: 'Canada', de: 'Kanada', es: 'Canadá' },
    GB: { en: 'United Kingdom', fr: 'Royaume-Uni', de: 'Vereinigtes Königreich', es: 'Reino Unido' },
    DE: { en: 'Germany', fr: 'Allemagne', de: 'Deutschland', es: 'Alemania' },
    FR: { en: 'France', fr: 'France', de: 'Frankreich', es: 'Francia' },
    AU: { en: 'Australia', fr: 'Australie', de: 'Australien', es: 'Australia' },
    NL: { en: 'Netherlands', fr: 'Pays-Bas', de: 'Niederlande', es: 'Países Bajos' },
    BE: { en: 'Belgium', fr: 'Belgique', de: 'Belgien', es: 'Bélgica' },
    CH: { en: 'Switzerland', fr: 'Suisse', de: 'Schweiz', es: 'Suiza' },
}

const AND: Record<ShippingCopyLocale, string> = { en: 'and', fr: 'et', de: 'und', es: 'y' }

export function getShippingCountryNames(locale: ShippingCopyLocale): string[] {
    return SHIPPING_FACTS.countries.map((code) => COUNTRY_NAMES[code]?.[locale] ?? code)
}

export function formatShippingCountryList(locale: ShippingCopyLocale): string {
    const names = getShippingCountryNames(locale)
    if (names.length <= 1) return names.join('')
    return `${names.slice(0, -1).join(', ')} ${AND[locale]} ${names[names.length - 1]}`
}

function range(locale: ShippingCopyLocale, r: DayRange): string {
    switch (locale) {
        case 'fr':
            return `${r.min} à ${r.max}`
        case 'es':
            return `${r.min} a ${r.max}`
        default:
            return `${r.min}–${r.max}`
    }
}

function totalRange(transit: DayRange): DayRange {
    return { min: SHIPPING_FACTS.handling.min + transit.min, max: SHIPPING_FACTS.handling.max + transit.max }
}

type Vars = {
    h: string
    s: string
    e: string
    ts: string
    te: string
    S: string
    E: string
    T: string
    N: number
    list: string
}

function vars(locale: ShippingCopyLocale): Vars {
    const f = SHIPPING_FACTS
    return {
        h: range(locale, f.handling),
        s: range(locale, f.standardTransit),
        e: range(locale, f.expressTransit),
        ts: range(locale, totalRange(f.standardTransit)),
        te: range(locale, totalRange(f.expressTransit)),
        S: formatUsd(f.standardUsd),
        E: formatUsd(f.expressUsd),
        T: formatUsd(f.freeThresholdUsd),
        N: f.countries.length,
        list: formatShippingCountryList(locale),
    }
}

// ─── /shipping page sections ───────────────────────────────────────

export function buildProductionTimeBlocks(locale: ShippingCopyLocale): ShippingCopyBlock[] {
    const v = vars(locale)
    const text = {
        en: `Each item is custom-printed when you order. Production takes ${v.h} business days before the parcel ships.`,
        fr: `Chaque article est imprimé à la commande. La production prend ${v.h} jours ouvrés avant l’expédition du colis.`,
        de: `Jeder Artikel wird bei Bestellung individuell bedruckt. Die Produktion dauert ${v.h} Werktage, bevor das Paket versandt wird.`,
        es: `Cada artículo se imprime a medida al realizar el pedido. La producción tarda de ${v.h} días hábiles antes del envío del paquete.`,
    }[locale]
    return [{ type: 'paragraph', text }]
}

export function buildDeliveryWindowsBlocks(locale: ShippingCopyLocale): ShippingCopyBlock[] {
    const v = vars(locale)
    const c = {
        en: {
            intro: 'After production, carrier delivery times are the same for every country we ship to:',
            std: `Standard Shipping: ${v.s} business days.`,
            exp: `Express Shipping: ${v.e} business days.`,
            total: `Production plus delivery is therefore usually ${v.ts} business days with Standard shipping and ${v.te} business days with Express.`,
        },
        fr: {
            intro: 'Après la production, les délais de livraison du transporteur sont identiques pour tous les pays desservis :',
            std: `Livraison Standard : ${v.s} jours ouvrés.`,
            exp: `Livraison Express : ${v.e} jours ouvrés.`,
            total: `Production et livraison cumulées prennent donc généralement ${v.ts} jours ouvrés en Standard et ${v.te} jours ouvrés en Express.`,
        },
        de: {
            intro: 'Nach der Produktion gelten für alle belieferten Länder dieselben Lieferzeiten:',
            std: `Standardversand: ${v.s} Werktage.`,
            exp: `Expressversand: ${v.e} Werktage.`,
            total: `Produktion und Lieferung dauern zusammen in der Regel ${v.ts} Werktage mit Standardversand und ${v.te} Werktage mit Expressversand.`,
        },
        es: {
            intro: 'Tras la producción, los plazos de entrega del transportista son los mismos para todos los países a los que enviamos:',
            std: `Envío Estándar: de ${v.s} días hábiles.`,
            exp: `Envío Exprés: de ${v.e} días hábiles.`,
            total: `Producción más entrega suelen tardar en total de ${v.ts} días hábiles con envío Estándar y de ${v.te} días hábiles con envío Exprés.`,
        },
    }[locale]
    return [
        { type: 'paragraph', text: c.intro },
        { type: 'list', items: [c.std, c.exp] },
        { type: 'paragraph', text: c.total },
    ]
}

export function buildShippingCostsBlocks(locale: ShippingCopyLocale): ShippingCopyBlock[] {
    const v = vars(locale)
    const c = {
        en: {
            intro: 'Shipping is a flat fee per order, charged in US dollars at checkout, with the same rates for every destination:',
            std: `Standard Shipping: ${v.S} per order — free on orders of ${v.T} or more.`,
            exp: `Express Shipping: ${v.E} per order — ${v.S} on orders of ${v.T} or more.`,
            where: `We ship to ${v.N} countries: ${v.list}. Checkout only accepts delivery addresses in these countries; we do not ship anywhere else.`,
        },
        fr: {
            intro: 'Les frais d’expédition sont un forfait par commande, facturé en dollars américains au moment du paiement, au même tarif pour toutes les destinations :',
            std: `Livraison Standard : ${v.S} par commande — offerte dès ${v.T} d’achat.`,
            exp: `Livraison Express : ${v.E} par commande — ${v.S} dès ${v.T} d’achat.`,
            where: `Nous livrons dans ${v.N} pays : ${v.list}. Le paiement n’accepte que des adresses de livraison dans ces pays ; nous n’expédions nulle part ailleurs.`,
        },
        de: {
            intro: 'Die Versandkosten sind eine Pauschale pro Bestellung, in US-Dollar beim Bezahlvorgang berechnet, mit denselben Tarifen für alle Ziele:',
            std: `Standardversand: ${v.S} pro Bestellung — kostenlos ab ${v.T} Bestellwert.`,
            exp: `Expressversand: ${v.E} pro Bestellung — ${v.S} ab ${v.T} Bestellwert.`,
            where: `Wir liefern in ${v.N} Länder: ${v.list}. Der Bezahlvorgang akzeptiert nur Lieferadressen in diesen Ländern; in andere Länder versenden wir nicht.`,
        },
        es: {
            intro: 'El envío es una tarifa fija por pedido, cobrada en dólares estadounidenses al finalizar la compra, con las mismas tarifas para todos los destinos:',
            std: `Envío Estándar: ${v.S} por pedido — gratis en pedidos de ${v.T} o más.`,
            exp: `Envío Exprés: ${v.E} por pedido — ${v.S} en pedidos de ${v.T} o más.`,
            where: `Enviamos a ${v.N} países: ${v.list}. El pago solo acepta direcciones de entrega en estos países; no enviamos a ningún otro destino (tampoco a España, México ni Latinoamérica).`,
        },
    }[locale]
    return [
        { type: 'paragraph', text: c.intro },
        { type: 'list', items: [c.std, c.exp] },
        { type: 'paragraph', text: c.where },
    ]
}

// ─── Sentences reused by terms, home, success, trust ───────────────

export function buildTermsFulfillmentSentence(locale: ShippingCopyLocale): string {
    const v = vars(locale)
    return {
        en: `Typical production time is ${v.h} business days; delivery then takes ${v.s} business days with Standard shipping or ${v.e} business days with Express, and is available only to the ${v.N} countries listed on our Shipping page.`,
        fr: `Délai de production typique : ${v.h} jours ouvrés ; la livraison prend ensuite ${v.s} jours ouvrés en Standard ou ${v.e} jours ouvrés en Express, uniquement vers les ${v.N} pays listés sur notre page Livraison.`,
        de: `Typische Produktionszeit: ${v.h} Werktage; die Lieferung dauert anschließend ${v.s} Werktage mit Standardversand oder ${v.e} Werktage mit Expressversand und ist nur in die ${v.N} auf unserer Versandseite genannten Länder möglich.`,
        es: `Tiempo de producción típico: de ${v.h} días laborables; la entrega tarda después de ${v.s} días laborables con envío Estándar o de ${v.e} con envío Exprés, y solo está disponible para los ${v.N} países indicados en nuestra página de Envío.`,
    }[locale]
}

export function buildTermsPricingSentence(locale: ShippingCopyLocale): string {
    const v = vars(locale)
    return {
        en: `Shipping is a flat fee per order in US dollars: Standard ${v.S} (free from ${v.T}) or Express ${v.E} (${v.S} from ${v.T}), identical for all ${v.N} countries we deliver to.`,
        fr: `Les frais de livraison sont un forfait par commande en dollars américains : Standard ${v.S} (offerte dès ${v.T}) ou Express ${v.E} (${v.S} dès ${v.T}), identique pour les ${v.N} pays desservis.`,
        de: `Die Versandkosten sind eine Pauschale pro Bestellung in US-Dollar: Standard ${v.S} (kostenlos ab ${v.T}) oder Express ${v.E} (${v.S} ab ${v.T}), identisch für alle ${v.N} belieferten Länder.`,
        es: `Los gastos de envío son una tarifa fija por pedido en dólares estadounidenses: Estándar ${v.S} (gratis desde ${v.T}) o Exprés ${v.E} (${v.S} desde ${v.T}), idéntica para los ${v.N} países a los que enviamos.`,
    }[locale]
}

export function buildHomeShipStepDescription(locale: ShippingCopyLocale): string {
    const v = vars(locale)
    return {
        en: `Your custom product is printed in ${v.h} business days and delivered to ${v.N} countries in ${v.s} more business days (Express ${v.e}).`,
        fr: `Votre produit est imprimé en ${v.h} jours ouvrés puis livré dans ${v.N} pays en ${v.s} jours ouvrés supplémentaires (Express : ${v.e}).`,
        de: `Dein Produkt wird in ${v.h} Werktagen gedruckt und in ${v.N} Länder in weiteren ${v.s} Werktagen geliefert (Express ${v.e}).`,
        es: `Tu producto se imprime en ${v.h} días hábiles y se entrega en ${v.N} países en ${v.s} días hábiles más (Exprés ${v.e}).`,
    }[locale]
}

export function buildSuccessSubtitle(locale: ShippingCopyLocale): string {
    const v = vars(locale)
    return {
        en: `Thank you for your order! Your custom product is being produced and will ship within ${v.h} business days.`,
        fr: `Merci pour votre commande ! Votre produit est en production et sera expédié sous ${v.h} jours ouvrés.`,
        de: `Danke für deine Bestellung! Dein Produkt ist in Produktion und wird innerhalb von ${v.h} Werktagen versendet.`,
        es: `¡Gracias por tu pedido! Tu producto se está fabricando y se enviará en ${v.h} días hábiles.`,
    }[locale]
}

export function buildTrustDeliveryValue(locale: ShippingCopyLocale): string {
    const v = vars(locale)
    return {
        en: `Production ${v.h} + Standard delivery ${v.s} business days (Express ${v.e}).`,
        fr: `Production ${v.h} + livraison Standard ${v.s} jours ouvrés (Express ${v.e}).`,
        de: `Produktion ${v.h} + Standardlieferung ${v.s} Werktage (Express ${v.e}).`,
        es: `Producción ${v.h} + entrega Estándar ${v.s} días hábiles (Exprés ${v.e}).`,
    }[locale]
}

/** Substitutes {standard} {express} {threshold} in cart copy. */
export function fillShippingTokens(template: string): string {
    return template
        .replace(/\{standard\}/g, formatUsd(SHIPPING_FACTS.standardUsd))
        .replace(/\{express\}/g, formatUsd(SHIPPING_FACTS.expressUsd))
        .replace(/\{threshold\}/g, formatUsd(SHIPPING_FACTS.freeThresholdUsd))
}

// ─── JSON-LD (schema.org OfferShippingDetails) ──────────────────────

export function buildOfferShippingDetails(currency: string = SHIPPING_FACTS.currency) {
    const destinations = SHIPPING_FACTS.countries.map((code) => ({
        '@type': 'DefinedRegion',
        addressCountry: code,
    }))
    const handlingTime = {
        '@type': 'QuantitativeValue',
        minValue: SHIPPING_FACTS.handling.min,
        maxValue: SHIPPING_FACTS.handling.max,
        unitCode: 'DAY',
    }
    return SHIPPING_SERVICES_USD.map((svc) => ({
        '@type': 'OfferShippingDetails',
        name: svc.service,
        shippingRate: {
            '@type': 'MonetaryAmount',
            value: svc.priceUsd.toFixed(2),
            currency,
        },
        shippingDestination: destinations,
        deliveryTime: {
            '@type': 'ShippingDeliveryTime',
            handlingTime,
            transitTime: {
                '@type': 'QuantitativeValue',
                minValue: svc.minTransitDays,
                maxValue: svc.maxTransitDays,
                unitCode: 'DAY',
            },
        },
    }))
}
