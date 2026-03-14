import { afterEach, describe, expect, it } from 'vitest'
import { resolveGelatoStoreId, resolveGelatoTemplateMappings } from './gelato-template-mapping'

const ORIGINAL_ENV = {
    GELATO_STORE_ID: process.env.GELATO_STORE_ID,
    GELATO_TEMPLATE_MAP_JSON: process.env.GELATO_TEMPLATE_MAP_JSON,
}

afterEach(() => {
    if (ORIGINAL_ENV.GELATO_STORE_ID === undefined) {
        delete process.env.GELATO_STORE_ID
    } else {
        process.env.GELATO_STORE_ID = ORIGINAL_ENV.GELATO_STORE_ID
    }

    if (ORIGINAL_ENV.GELATO_TEMPLATE_MAP_JSON === undefined) {
        delete process.env.GELATO_TEMPLATE_MAP_JSON
    } else {
        process.env.GELATO_TEMPLATE_MAP_JSON = ORIGINAL_ENV.GELATO_TEMPLATE_MAP_JSON
    }
})

describe('gelato template mapping defaults', () => {
    it('returns project default store id when env override is missing', () => {
        delete process.env.GELATO_STORE_ID
        expect(resolveGelatoStoreId()).toBe('25a81457-8265-4597-9d9c-21cb5bf276fb')
    })

    it('returns default 5 template entries when map override is missing', () => {
        delete process.env.GELATO_TEMPLATE_MAP_JSON
        const entries = resolveGelatoTemplateMappings()

        expect(entries).toHaveLength(5)
        expect(entries.map((entry) => entry.templateId)).toContain('069fcba0-4c7f-4785-bf23-ecaa1c57c683')
    })
})

describe('gelato template mapping env override', () => {
    it('parses templates from GELATO_TEMPLATE_MAP_JSON object shape', () => {
        process.env.GELATO_TEMPLATE_MAP_JSON = JSON.stringify({
            templates: [
                {
                    templateName: 'Override',
                    templateId: 'template-1',
                    productType: 'mug',
                    printAreaPlaceholder: 'front',
                },
            ],
        })

        const entries = resolveGelatoTemplateMappings()
        expect(entries).toEqual([
            {
                templateName: 'Override',
                templateId: 'template-1',
                productType: 'mug',
                printAreaPlaceholder: 'front',
            },
        ])
    })

    it('throws on invalid JSON', () => {
        process.env.GELATO_TEMPLATE_MAP_JSON = '{not-json}'
        expect(() => resolveGelatoTemplateMappings()).toThrowError(/invalid gelato_template_map_json/i)
    })
})
