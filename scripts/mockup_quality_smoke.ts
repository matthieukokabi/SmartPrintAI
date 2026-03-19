import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { analyzeMockupArtifactRisk } from '../src/lib/mockup-quality'

type ProductColor = {
    name?: unknown
}

type Product = {
    id?: unknown
    name?: unknown
    printfulId?: unknown
    colors?: unknown
}

type MockupTarget = {
    label: 'hoodie' | 'cap'
    productId: string
    productName: string
    color: string
}

type JsonObject = Record<string, unknown>

const baseUrl = (process.env.MOCKUP_SMOKE_BASE_URL || 'https://smartprintai.com').trim().replace(/\/$/, '')
const prompt =
    (process.env.MOCKUP_SMOKE_PROMPT || 'Cyber tiger emblem, neon blue/orange, transparent background, no text, centered composition').trim()
const style = (process.env.MOCKUP_SMOKE_STYLE || 'artistic').trim()
const preferredColor = (process.env.MOCKUP_SMOKE_COLOR || 'black').trim().toLowerCase()
const reportFile = (process.env.MOCKUP_SMOKE_REPORT_FILE || '').trim()
const requestTimeoutMs = Number(process.env.MOCKUP_SMOKE_TIMEOUT_MS || 45000)
const maxMockupAttempts = Number(process.env.MOCKUP_SMOKE_MAX_ATTEMPTS || 4)

function asNonEmptyString(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null
    }
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
}

function parseProducts(payload: unknown): Product[] {
    if (Array.isArray(payload)) {
        return payload
    }
    if (typeof payload === 'object' && payload !== null && Array.isArray((payload as JsonObject).products)) {
        return (payload as { products: Product[] }).products
    }
    return []
}

function parseColorNames(product: Product): string[] {
    if (!Array.isArray(product.colors)) {
        return []
    }

    const names: string[] = []
    for (const color of product.colors as ProductColor[]) {
        const value = asNonEmptyString(color?.name)
        if (!value) {
            continue
        }
        names.push(value.toLowerCase())
    }
    return names
}

function pickGootenProduct(
    products: Product[],
    productIdOverride: string | null,
    nameMatchers: RegExp[],
    preferredColorName: string
): MockupTarget | null {
    const gootenProducts = products.filter((product) => {
        const printfulId = asNonEmptyString(product.printfulId)
        return Boolean(printfulId && printfulId.startsWith('gooten:'))
    })

    if (productIdOverride) {
        const byId = gootenProducts.find((product) => asNonEmptyString(product.id) === productIdOverride)
        if (!byId) {
            return null
        }
        const id = asNonEmptyString(byId.id)
        const name = asNonEmptyString(byId.name)
        if (!id || !name) {
            return null
        }
        const colors = parseColorNames(byId)
        const color = colors.includes(preferredColorName) ? preferredColorName : colors[0]
        if (!color) {
            return null
        }
        return {
            label: /cap|beanie/i.test(name) ? 'cap' : 'hoodie',
            productId: id,
            productName: name,
            color,
        }
    }

    for (const matcher of nameMatchers) {
        const product = gootenProducts.find((candidate) => {
            const name = asNonEmptyString(candidate.name)
            if (!name || !matcher.test(name)) {
                return false
            }
            const colors = parseColorNames(candidate)
            return colors.length > 0
        })
        if (!product) {
            continue
        }
        const id = asNonEmptyString(product.id)
        const name = asNonEmptyString(product.name)
        if (!id || !name) {
            continue
        }
        const colors = parseColorNames(product)
        const color = colors.includes(preferredColorName) ? preferredColorName : colors[0]
        if (!color) {
            continue
        }
        return {
            label: /cap|beanie/i.test(name) ? 'cap' : 'hoodie',
            productId: id,
            productName: name,
            color,
        }
    }

    return null
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => {
        controller.abort()
    }, requestTimeoutMs)

    try {
        return await fetch(url, {
            ...init,
            signal: controller.signal,
        })
    } finally {
        clearTimeout(timer)
    }
}

async function fetchJson(pathname: string, init: RequestInit = {}): Promise<{ status: number; body: unknown; headers: Headers }> {
    const response = await fetchWithTimeout(`${baseUrl}${pathname}`, init)
    const body = await response.json().catch(() => null)
    return { status: response.status, body, headers: response.headers }
}

async function fetchBuffer(url: string): Promise<Buffer> {
    const response = await fetchWithTimeout(url)
    if (!response.ok) {
        throw new Error(`image fetch failed (${response.status}) for ${url}`)
    }
    return Buffer.from(await response.arrayBuffer())
}

function parseRetryAfter(headers: Headers): number {
    const retryAfterRaw = headers.get('retry-after')
    const retryAfter = Number(retryAfterRaw || '0')
    return Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 4
}

async function sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms))
}

async function requestMockupWithRetry(
    designId: string,
    target: MockupTarget
): Promise<{ status: number; body: unknown; attempts: number }> {
    for (let attempt = 1; attempt <= maxMockupAttempts; attempt += 1) {
        const response = await fetchJson('/api/mockup', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                designId,
                productId: target.productId,
                color: target.color,
            }),
        })
        if (response.status !== 429 || attempt === maxMockupAttempts) {
            return { status: response.status, body: response.body, attempts: attempt }
        }
        const retryAfterSec = parseRetryAfter(response.headers)
        await sleep((retryAfterSec + 1) * 1000)
    }

    return { status: 500, body: { error: 'mockup request retry exhausted' }, attempts: maxMockupAttempts }
}

function printStep(message: string, data?: unknown): void {
    if (data === undefined) {
        console.log(`[mockup-quality] ${message}`)
        return
    }
    console.log(`[mockup-quality] ${message}: ${JSON.stringify(data)}`)
}

async function main() {
    printStep('starting', { baseUrl, style, preferredColor, maxMockupAttempts })

    const generate = await fetchJson('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt, style }),
    })
    if (generate.status !== 200 || typeof generate.body !== 'object' || generate.body === null) {
        throw new Error(`generate failed with status ${generate.status}`)
    }
    const designId = asNonEmptyString((generate.body as JsonObject).designId)
    const imageUrl = asNonEmptyString((generate.body as JsonObject).imageUrl)
    if (!designId || !imageUrl) {
        throw new Error('generate response missing designId/imageUrl')
    }
    printStep('generated', { designId, imageUrl })

    const generatedImage = await fetchBuffer(imageUrl)
    const generatedAnalysis = await analyzeMockupArtifactRisk(generatedImage)
    printStep('generated_analysis', generatedAnalysis)

    const productsResponse = await fetchJson('/api/products')
    if (productsResponse.status !== 200) {
        throw new Error(`products fetch failed with status ${productsResponse.status}`)
    }
    const products = parseProducts(productsResponse.body)

    const hoodieTarget = pickGootenProduct(
        products,
        asNonEmptyString(process.env.MOCKUP_SMOKE_HOODIE_PRODUCT_ID),
        [/hoodies? \(no-zip/i, /hoodies?/i, /pullover/i],
        preferredColor
    )
    const capTarget = pickGootenProduct(
        products,
        asNonEmptyString(process.env.MOCKUP_SMOKE_CAP_PRODUCT_ID),
        [/dad caps?/i, /caps?/i, /beanies?/i],
        preferredColor
    )

    if (!hoodieTarget) {
        throw new Error('unable to find gooten hoodie target with available colors')
    }
    if (!capTarget) {
        throw new Error('unable to find gooten cap target with available colors')
    }

    const targets: MockupTarget[] = [
        { ...hoodieTarget, label: 'hoodie' },
        { ...capTarget, label: 'cap' },
    ]
    printStep('targets', targets)

    const results: Array<Record<string, unknown>> = []
    let hasFailure = false

    for (const target of targets) {
        const mockupResponse = await requestMockupWithRetry(designId, target)
        if (mockupResponse.status !== 200 || typeof mockupResponse.body !== 'object' || mockupResponse.body === null) {
            hasFailure = true
            results.push({
                target: target.label,
                productId: target.productId,
                productName: target.productName,
                status: mockupResponse.status,
                attempts: mockupResponse.attempts,
                error: (mockupResponse.body as JsonObject | null)?.error || 'mockup request failed',
            })
            continue
        }

        const mockupUrl = asNonEmptyString((mockupResponse.body as JsonObject).mockupUrl)
        if (!mockupUrl) {
            hasFailure = true
            results.push({
                target: target.label,
                productId: target.productId,
                productName: target.productName,
                status: mockupResponse.status,
                attempts: mockupResponse.attempts,
                error: 'mockup response missing mockupUrl',
            })
            continue
        }

        const mockupImage = await fetchBuffer(mockupUrl)
        const analysis = await analyzeMockupArtifactRisk(mockupImage)
        if (analysis.suspiciousMatte) {
            hasFailure = true
        }

        results.push({
            target: target.label,
            productId: target.productId,
            productName: target.productName,
            color: target.color,
            status: mockupResponse.status,
            attempts: mockupResponse.attempts,
            mockupUrl,
            analysis,
        })
    }

    const summary = {
        baseUrl,
        designId,
        imageUrl,
        generatedAnalysis,
        results,
        passed: !hasFailure,
        checkedAt: new Date().toISOString(),
    }

    if (reportFile) {
        await fs.mkdir(path.dirname(reportFile), { recursive: true }).catch(() => null)
        await fs.writeFile(reportFile, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
    }

    console.log(JSON.stringify(summary, null, 2))

    if (hasFailure) {
        process.exitCode = 1
    }
}

main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[mockup-quality] failed: ${message}`)
    process.exitCode = 1
})
