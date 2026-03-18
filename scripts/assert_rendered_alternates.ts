import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { parseRenderedHead, toPathname } from '../src/lib/rendered-head'

type Locale = 'en' | 'fr' | 'de' | 'es'

type RouteAssertion = {
    path: string
    canonicalPath: string
    alternatesBasePath: string
}

const ROUTE_ASSERTIONS: RouteAssertion[] = [
    { path: '/create', canonicalPath: '/create', alternatesBasePath: '/create' },
    { path: '/en/create', canonicalPath: '/create', alternatesBasePath: '/create' },
    { path: '/fr/create', canonicalPath: '/fr/create', alternatesBasePath: '/create' },
    { path: '/de/create', canonicalPath: '/de/create', alternatesBasePath: '/create' },
    { path: '/es/create', canonicalPath: '/es/create', alternatesBasePath: '/create' },
    { path: '/fr/blog', canonicalPath: '/fr/blog', alternatesBasePath: '/blog' },
    { path: '/fr/support', canonicalPath: '/fr/support', alternatesBasePath: '/support' },
]

const LOCALES: Locale[] = ['en', 'fr', 'de', 'es']

function localizedPath(locale: Locale, basePath: string): string {
    if (locale === 'en') {
        return basePath
    }
    if (basePath === '/') {
        return `/${locale}`
    }
    return `/${locale}${basePath}`
}

function expectedAlternates(basePath: string): Record<string, string> {
    return {
        en: localizedPath('en', basePath),
        fr: localizedPath('fr', basePath),
        de: localizedPath('de', basePath),
        es: localizedPath('es', basePath),
        'x-default': basePath,
    }
}

async function fetchHtml(baseUrl: string, path: string): Promise<string> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    try {
        const url = `${baseUrl}${path}`
        const response = await fetch(url, {
            headers: {
                accept: 'text/html',
            },
            signal: controller.signal,
        })
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} for ${url}`)
        }
        return await response.text()
    } finally {
        clearTimeout(timeout)
    }
}

async function waitForServer(baseUrl: string): Promise<void> {
    let lastError: string | null = null
    for (let attempt = 0; attempt < 50; attempt += 1) {
        try {
            await fetchHtml(baseUrl, '/')
            return
        } catch (error) {
            lastError = error instanceof Error ? error.message : String(error)
            await delay(400)
        }
    }
    throw new Error(`Local server did not become ready at ${baseUrl}. Last error: ${lastError || 'unknown'}`)
}

async function runAssertions(baseUrl: string): Promise<void> {
    const failures: string[] = []

    for (const route of ROUTE_ASSERTIONS) {
        const html = await fetchHtml(baseUrl, route.path)
        const parsed = parseRenderedHead(html)
        const canonicalPath = parsed.canonicalHref ? toPathname(parsed.canonicalHref) : null
        const ogPath = parsed.ogUrl ? toPathname(parsed.ogUrl) : null
        const expectedAlt = expectedAlternates(route.alternatesBasePath)

        if (!canonicalPath) {
            failures.push(`${route.path}: missing canonical tag`)
        } else if (canonicalPath !== route.canonicalPath) {
            failures.push(`${route.path}: canonical mismatch (expected ${route.canonicalPath}, got ${canonicalPath})`)
        }

        if (!ogPath) {
            failures.push(`${route.path}: missing og:url`)
        } else if (ogPath !== route.canonicalPath) {
            failures.push(`${route.path}: og:url mismatch (expected ${route.canonicalPath}, got ${ogPath})`)
        }

        for (const locale of LOCALES) {
            const actualHref = parsed.alternates[locale]
            if (!actualHref) {
                failures.push(`${route.path}: missing alternate for locale '${locale}'`)
                continue
            }
            const actualPath = toPathname(actualHref)
            if (actualPath !== expectedAlt[locale]) {
                failures.push(
                    `${route.path}: alternate '${locale}' mismatch (expected ${expectedAlt[locale]}, got ${actualPath})`
                )
            }
        }

        const xDefaultHref = parsed.alternates['x-default']
        if (!xDefaultHref) {
            failures.push(`${route.path}: missing alternate for locale 'x-default'`)
        } else {
            const xDefaultPath = toPathname(xDefaultHref)
            if (xDefaultPath !== expectedAlt['x-default']) {
                failures.push(
                    `${route.path}: alternate 'x-default' mismatch (expected ${expectedAlt['x-default']}, got ${xDefaultPath})`
                )
            }
        }
    }

    if (failures.length > 0) {
        console.error('Rendered head assertions failed:')
        for (const failure of failures) {
            console.error(`- ${failure}`)
        }
        process.exit(1)
    }

    console.log(`Rendered head assertions passed for ${ROUTE_ASSERTIONS.length} routes at ${baseUrl}`)
}

async function main(): Promise<void> {
    const baseUrlFromEnv = (process.env.SEO_ASSERT_BASE_URL || '').trim().replace(/\/+$/, '')
    if (baseUrlFromEnv.length > 0) {
        await runAssertions(baseUrlFromEnv)
        return
    }

    const port = Number(process.env.SEO_ASSERT_PORT || '3301')
    const hostname = process.env.SEO_ASSERT_HOST || '127.0.0.1'
    const baseUrl = `http://${hostname}:${port}`

    const child = spawn('npm', ['run', 'start'], {
        env: {
            ...process.env,
            PORT: String(port),
            HOSTNAME: hostname,
        },
        stdio: 'pipe',
    })

    child.stdout.on('data', (chunk) => {
        process.stdout.write(chunk)
    })
    child.stderr.on('data', (chunk) => {
        process.stderr.write(chunk)
    })

    try {
        await waitForServer(baseUrl)
        await runAssertions(baseUrl)
    } finally {
        child.kill('SIGTERM')
        await delay(300)
        if (!child.killed) {
            child.kill('SIGKILL')
        }
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
})
