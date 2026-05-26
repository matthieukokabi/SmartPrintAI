import { describe, expect, it } from 'vitest'
import { GONE_PRODUCT_IDS } from './gone-products'

describe('GONE_PRODUCT_IDS', () => {
    it('contains the 4 cmmtj* IDs flagged in the GSC 2026-05-23 validation cycle', () => {
        expect(GONE_PRODUCT_IDS.has('cmmtjqrq4000lqwl2uabumkdw')).toBe(true)
        expect(GONE_PRODUCT_IDS.has('cmmtjreet000oqwl2x138srq7')).toBe(true)
        expect(GONE_PRODUCT_IDS.has('cmmtjnf3f0006qwl2outzyuu1')).toBe(true)
        expect(GONE_PRODUCT_IDS.has('cmmtjrkl8000pqwl2sgjrhftq')).toBe(true)
    })

    it('does not match arbitrary live product IDs', () => {
        expect(GONE_PRODUCT_IDS.has('cmmhtq000abcdefghijklmn')).toBe(false)
        expect(GONE_PRODUCT_IDS.has('')).toBe(false)
        expect(GONE_PRODUCT_IDS.has('cmmtjqrq')).toBe(false)
    })
})
