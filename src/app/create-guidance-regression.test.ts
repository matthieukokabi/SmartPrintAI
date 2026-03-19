import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const CREATE_CLIENT_PATH = path.join(process.cwd(), 'src', 'components', 'create', 'CreatePageClient.tsx')
const CREATE_GUIDANCE_LIB_PATH = path.join(process.cwd(), 'src', 'lib', 'create-product-guidance.ts')

function readSource(filePath: string): string {
    return fs.readFileSync(filePath, 'utf8')
}

describe('Wave 9 create product-guidance regression', () => {
    it('keeps contextual product guidance block in create client', () => {
        const createClientSource = readSource(CREATE_CLIENT_PATH)

        expect(createClientSource).toContain("getCreateProductPromptGuidance")
        expect(createClientSource).toContain(
            'const productPromptGuidance = product ? getCreateProductPromptGuidance(product) : null'
        )
        expect(createClientSource).toContain('{productPromptGuidance && (')
        expect(createClientSource).toContain('{productPromptGuidance.title}')
        expect(createClientSource).toContain('{productPromptGuidance.checklist.map((item) => (')
        expect(createClientSource).toContain('{productPromptGuidance.example}')
    })

    it('keeps all product guidance profiles in resolver', () => {
        const guidanceSource = readSource(CREATE_GUIDANCE_LIB_PATH)

        expect(guidanceSource).toContain("small_area")
        expect(guidanceSource).toContain("all_over")
        expect(guidanceSource).toContain("drinkware")
        expect(guidanceSource).toContain("standard")
        expect(guidanceSource).toContain('resolveGuidanceProfile')
    })
})
