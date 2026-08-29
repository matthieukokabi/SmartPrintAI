import { afterEach, describe, expect, it } from 'vitest'
import { getMetadataBase, getSiteUrl, toAbsoluteUrl } from './site'

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL

afterEach(() => {
    if (originalAppUrl === undefined) {
        delete process.env.NEXT_PUBLIC_APP_URL
    } else {
        process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
    }
})

describe('canonical site origin', () => {
    it('defaults every generated SEO URL to print.zuerifix.tech', () => {
        delete process.env.NEXT_PUBLIC_APP_URL

        expect(getSiteUrl()).toBe('https://print.zuerifix.tech')
        expect(getMetadataBase().origin).toBe('https://print.zuerifix.tech')
        expect(toAbsoluteUrl('/products')).toBe('https://print.zuerifix.tech/products')
    })
})
