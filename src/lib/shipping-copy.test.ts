import { describe, expect, it } from 'vitest'
import {
  SHIPPING_FACTS,
  buildDeliveryWindowsBlocks,
  buildHomeShipStepDescription,
  buildOfferShippingDetails,
  buildProductionTimeBlocks,
  buildShippingCostsBlocks,
  buildSuccessSubtitle,
  buildTermsFulfillmentSentence,
  buildTermsPricingSentence,
  buildTrustDeliveryValue,
  fillShippingTokens,
  formatShippingCountryList,
  getShippingCountryNames,
} from '@/lib/shipping-copy'
import { BASE_CHECKOUT_ALLOWED_COUNTRIES } from '@/lib/product-destination-safety'
import { FREE_SHIPPING_THRESHOLD_USD, getCartShippingUsd, getExpressRateUsd, getStandardRateUsd } from '@/lib/shipping-rates'

const LOCALES = ['en', 'fr', 'de', 'es'] as const
const flat = (blocks: ReturnType<typeof buildShippingCostsBlocks>) =>
  blocks.map((b) => (b.type === 'paragraph' ? b.text : b.items.join(' '))).join(' ')

describe('shipping copy is derived from shipping-rates', () => {
  it('facts mirror the rates file and the checkout country gate', () => {
    expect(SHIPPING_FACTS.standardUsd).toBe(getStandardRateUsd())
    expect(SHIPPING_FACTS.expressUsd).toBe(getExpressRateUsd())
    expect(SHIPPING_FACTS.freeThresholdUsd).toBe(FREE_SHIPPING_THRESHOLD_USD)
    expect(SHIPPING_FACTS.countries).toEqual([...BASE_CHECKOUT_ALLOWED_COUNTRIES])
    expect(SHIPPING_FACTS.countries).toHaveLength(9)
    for (const notShipped of ['ES', 'MX', 'EC', 'PR']) {
      expect(SHIPPING_FACTS.countries).not.toContain(notShipped)
    }
  })

  it('names all nine countries in every locale, and never Spain or Mexico', () => {
    for (const locale of LOCALES) {
      const names = getShippingCountryNames(locale)
      expect(names).toHaveLength(9)
      expect(names.every((n) => n.length > 2)).toBe(true) // no ISO-code fallbacks
      const list = formatShippingCountryList(locale)
      for (const name of names) expect(list).toContain(name)
      expect(list).not.toMatch(/Spain|España|Espagne|Spanien|Mexico|México|Mexique|Mexiko/)
    }
    expect(formatShippingCountryList('es')).toContain('Estados Unidos')
    expect(formatShippingCountryList('fr')).toContain('Royaume-Uni')
  })

  it('shipping page sections carry the real rates and no "calculated at checkout" wording', () => {
    for (const locale of LOCALES) {
      const costs = flat(buildShippingCostsBlocks(locale))
      expect(costs).toContain('$5.99')
      expect(costs).toContain('$12.99')
      expect(costs).toContain('$100')
      expect(costs).toContain(formatShippingCountryList(locale))
      expect(costs.toLowerCase()).not.toMatch(/calculated at checkout|calcul[ée]s au|berechnet werden|se calculan/)
      const windows = flat(buildDeliveryWindowsBlocks(locale))
      expect(windows).toMatch(/5.{1,3}10/)
      expect(windows).toMatch(/2.{1,3}4/)
      expect(windows.toLowerCase()).not.toMatch(/rest of world|reste du monde|übrige welt|resto del mundo|canada|kanada|canadá|european union/)
      expect(flat(buildProductionTimeBlocks(locale))).toMatch(/2.{1,3}5/)
    }
    expect(flat(buildShippingCostsBlocks('es'))).toContain('tampoco a España, México')
  })

  it('derived sentences (terms, home, success, trust) use the same numbers', () => {
    for (const locale of LOCALES) {
      expect(buildTermsPricingSentence(locale)).toContain('$5.99')
      expect(buildTermsPricingSentence(locale)).toContain('$12.99')
      expect(buildTermsFulfillmentSentence(locale)).toMatch(/9/)
      expect(buildHomeShipStepDescription(locale)).toMatch(/9/)
      expect(buildHomeShipStepDescription(locale).toLowerCase()).not.toMatch(/worldwide|monde entier|weltweit|mundialmente/)
      expect(buildSuccessSubtitle(locale)).toMatch(/2.{1,3}5/)
      expect(buildTrustDeliveryValue(locale)).toMatch(/5.{1,3}10/)
    }
  })

  it('cart shipping line: flat standard rate below the threshold, free at or above it', () => {
    expect(getCartShippingUsd(29.99, 1)).toBe(5.99)
    expect(getCartShippingUsd(99.99, 2)).toBe(5.99)
    expect(getCartShippingUsd(100, 1)).toBe(0)
    expect(getCartShippingUsd(250, 3)).toBe(0)
    expect(getCartShippingUsd(0, 0)).toBe(5.99) // empty cart keeps showing the base rate
  })

  it('cart note tokens resolve to the rates', () => {
    expect(fillShippingTokens('{standard} / {express} / {threshold}')).toBe('$5.99 / $12.99 / $100')
  })

  it('JSON-LD shipping details list both services for the nine countries', () => {
    const details = buildOfferShippingDetails('USD')
    expect(details).toHaveLength(2)
    expect(details[0].shippingRate.value).toBe('5.99')
    expect(details[1].shippingRate.value).toBe('12.99')
    for (const d of details) {
      expect(d.shippingDestination.map((r) => r.addressCountry)).toEqual([...BASE_CHECKOUT_ALLOWED_COUNTRIES])
      expect(d.deliveryTime.handlingTime).toMatchObject({ minValue: 2, maxValue: 5 })
    }
    expect(details[0].deliveryTime.transitTime).toMatchObject({ minValue: 5, maxValue: 10 })
    expect(details[1].deliveryTime.transitTime).toMatchObject({ minValue: 2, maxValue: 4 })
  })
})
