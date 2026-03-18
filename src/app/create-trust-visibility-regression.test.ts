import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const DEFAULT_CREATE_PAGE_PATH = path.join(process.cwd(), 'src', 'app', 'create', 'page.tsx')
const LOCALIZED_CREATE_PAGE_PATH = path.join(process.cwd(), 'src', 'app', '[locale]', 'create', 'page.tsx')
const CREATE_CLIENT_PATH = path.join(process.cwd(), 'src', 'components', 'create', 'CreatePageClient.tsx')
const TRUST_STRIP_SNIPPET = '<TrustSignalStrip locale={locale} className="mb-8" />'

function readSource(filePath: string): string {
    return fs.readFileSync(filePath, 'utf8')
}

describe('Wave 4 create trust visibility regression', () => {
    it('keeps trust-strip content in SSR fallback for default and localized create routes', () => {
        const defaultCreatePageSource = readSource(DEFAULT_CREATE_PAGE_PATH)
        const localizedCreatePageSource = readSource(LOCALIZED_CREATE_PAGE_PATH)

        expect(defaultCreatePageSource).toContain('fallback={')
        expect(defaultCreatePageSource).toContain(TRUST_STRIP_SNIPPET)

        expect(localizedCreatePageSource).toContain('fallback={')
        expect(localizedCreatePageSource).toContain(TRUST_STRIP_SNIPPET)
    })

    it('keeps trust-strip content in hydrated create client output', () => {
        const createClientSource = readSource(CREATE_CLIENT_PATH)

        expect(createClientSource).toContain(TRUST_STRIP_SNIPPET)
    })
})
