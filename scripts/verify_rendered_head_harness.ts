import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { parseRenderedHead, toPathname } from '../src/lib/rendered-head'

type Locale = 'en' | 'fr' | 'de' | 'es'

type RouteExpectation = {
    path: string
    canonicalPath: string
    alternatesBasePath: string
}

type RouteResult = {
    path: string
    htmlArtifact: string | null
    expectedCanonicalPath: string
    actualCanonicalPath: string | null
    expectedOgPath: string
    actualOgPath: string | null
    expectedAlternates: Record<string, string>
    actualAlternates: Record<string, string>
    failures: string[]
}

type TargetResult = {
    target: 'local' | 'prod'
    baseUrl: string
    routeResults: RouteResult[]
    failures: string[]
}

const LOCALES: Locale[] = ['en', 'fr', 'de', 'es']

const ROUTE_EXPECTATIONS: RouteExpectation[] = [
    { path: '/create', canonicalPath: '/create', alternatesBasePath: '/create' },
    { path: '/en/create', canonicalPath: '/create', alternatesBasePath: '/create' },
    { path: '/fr/create', canonicalPath: '/fr/create', alternatesBasePath: '/create' },
    { path: '/de/create', canonicalPath: '/de/create', alternatesBasePath: '/create' },
    { path: '/es/create', canonicalPath: '/es/create', alternatesBasePath: '/create' },
    { path: '/blog', canonicalPath: '/blog', alternatesBasePath: '/blog' },
    { path: '/en/blog', canonicalPath: '/blog', alternatesBasePath: '/blog' },
    { path: '/fr/blog', canonicalPath: '/fr/blog', alternatesBasePath: '/blog' },
    { path: '/support', canonicalPath: '/support', alternatesBasePath: '/support' },
    { path: '/en/support', canonicalPath: '/support', alternatesBasePath: '/support' },
    { path: '/fr/support', canonicalPath: '/fr/support', alternatesBasePath: '/support' },
]

function normalizeBaseUrl(value: string): string {
    return value.trim().replace(/\/+$/, '')
}

function currentTimestamp(): { iso: string; compact: string; date: string } {
    const now = new Date()
    const yyyy = String(now.getFullYear())
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const hh = String(now.getHours()).padStart(2, '0')
    const min = String(now.getMinutes()).padStart(2, '0')
    const sec = String(now.getSeconds()).padStart(2, '0')
    return {
        iso: now.toISOString(),
        compact: `${yyyy}-${mm}-${dd}_${hh}-${min}-${sec}`,
        date: `${yyyy}-${mm}-${dd}`,
    }
}

function toRelativePath(filePath: string): string {
    return path.relative(process.cwd(), filePath).split(path.sep).join('/')
}

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

function artifactFileName(routePath: string): string {
    if (routePath === '/') {
        return '_root'
    }
    return routePath.replace(/^\/+/, '').replace(/\/+/g, '_')
}

async function fetchHtml(baseUrl: string, routePath: string): Promise<string> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20_000)
    try {
        const url = `${baseUrl}${routePath}`
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

async function waitForServer(baseUrl: string, readinessPath: string): Promise<void> {
    let lastError = 'unknown'
    for (let attempt = 0; attempt < 60; attempt += 1) {
        try {
            await fetchHtml(baseUrl, readinessPath)
            return
        } catch (error) {
            lastError = error instanceof Error ? error.message : String(error)
            await delay(500)
        }
    }
    throw new Error(`Local server did not become ready at ${baseUrl}${readinessPath}. Last error: ${lastError}`)
}

function assertRoute(html: string, route: RouteExpectation, htmlArtifact: string): RouteResult {
    const failures: string[] = []
    const parsed = parseRenderedHead(html)
    const canonicalPath = parsed.canonicalHref ? toPathname(parsed.canonicalHref) : null
    const ogPath = parsed.ogUrl ? toPathname(parsed.ogUrl) : null
    const expectedAlt = expectedAlternates(route.alternatesBasePath)
    const actualAlternates: Record<string, string> = {}

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
        const href = parsed.alternates[locale]
        if (!href) {
            failures.push(`${route.path}: missing alternate for locale '${locale}'`)
            continue
        }
        const alternatePath = toPathname(href)
        actualAlternates[locale] = alternatePath
        if (alternatePath !== expectedAlt[locale]) {
            failures.push(
                `${route.path}: alternate '${locale}' mismatch (expected ${expectedAlt[locale]}, got ${alternatePath})`
            )
        }
    }

    const xDefaultHref = parsed.alternates['x-default']
    if (!xDefaultHref) {
        failures.push(`${route.path}: missing alternate for locale 'x-default'`)
    } else {
        const xDefaultPath = toPathname(xDefaultHref)
        actualAlternates['x-default'] = xDefaultPath
        if (xDefaultPath !== expectedAlt['x-default']) {
            failures.push(
                `${route.path}: alternate 'x-default' mismatch (expected ${expectedAlt['x-default']}, got ${xDefaultPath})`
            )
        }
    }

    return {
        path: route.path,
        htmlArtifact,
        expectedCanonicalPath: route.canonicalPath,
        actualCanonicalPath: canonicalPath,
        expectedOgPath: route.canonicalPath,
        actualOgPath: ogPath,
        expectedAlternates: expectedAlt,
        actualAlternates,
        failures,
    }
}

async function runTargetAssertions(target: 'local' | 'prod', baseUrl: string, artifactRoot: string): Promise<TargetResult> {
    const targetDir = path.join(artifactRoot, target)
    await mkdir(targetDir, { recursive: true })

    const routeResults: RouteResult[] = []
    const failures: string[] = []

    for (const route of ROUTE_EXPECTATIONS) {
        const fileBase = artifactFileName(route.path)
        const htmlFile = path.join(targetDir, `${fileBase}.html`)
        try {
            const html = await fetchHtml(baseUrl, route.path)
            await writeFile(htmlFile, html, 'utf8')
            const routeResult = assertRoute(html, route, toRelativePath(htmlFile))
            routeResults.push(routeResult)
            for (const failure of routeResult.failures) {
                failures.push(`[${target}] ${failure}`)
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            const errorFile = path.join(targetDir, `${fileBase}.error.txt`)
            await writeFile(errorFile, errorMessage, 'utf8')
            routeResults.push({
                path: route.path,
                htmlArtifact: null,
                expectedCanonicalPath: route.canonicalPath,
                actualCanonicalPath: null,
                expectedOgPath: route.canonicalPath,
                actualOgPath: null,
                expectedAlternates: expectedAlternates(route.alternatesBasePath),
                actualAlternates: {},
                failures: [`${route.path}: fetch failure (${errorMessage})`],
            })
            failures.push(`[${target}] ${route.path}: fetch failure (${errorMessage})`)
        }
    }

    return {
        target,
        baseUrl,
        routeResults,
        failures,
    }
}

async function runWithLocalServer(
    host: string,
    port: number,
    artifactRoot: string,
): Promise<TargetResult> {
    const baseUrl = `http://${host}:${port}`
    const child = spawn('npm', ['run', 'start'], {
        env: {
            ...process.env,
            HOSTNAME: host,
            PORT: String(port),
        },
        stdio: 'pipe',
    })

    child.stdout.on('data', (chunk) => process.stdout.write(chunk))
    child.stderr.on('data', (chunk) => process.stderr.write(chunk))

    try {
        await waitForServer(baseUrl, '/create')
        return await runTargetAssertions('local', baseUrl, artifactRoot)
    } finally {
        child.kill('SIGTERM')
        await delay(400)
        if (!child.killed) {
            child.kill('SIGKILL')
        }
    }
}

function renderMarkdownReport(
    generatedAtIso: string,
    artifactRoot: string,
    summaryFile: string,
    targetResults: TargetResult[],
    failures: string[],
): string {
    const lines: string[] = []
    lines.push('# Wave 3 Rendered HTML Verification Harness')
    lines.push('')
    lines.push(`Generated: ${generatedAtIso}`)
    lines.push(`Artifact root: \`${toRelativePath(artifactRoot)}\``)
    lines.push(`Summary JSON: \`${toRelativePath(summaryFile)}\``)
    lines.push('')
    lines.push('## Targets')
    for (const result of targetResults) {
        lines.push(`- \`${result.target}\` -> ${result.baseUrl} (routes: ${result.routeResults.length}, failures: ${result.failures.length})`)
    }
    lines.push('')
    lines.push('## Route Snapshot Artifacts')
    lines.push('- Raw rendered HTML for each route is stored per target in the artifact root.')
    lines.push('- Filenames map to routes, for example `_root.html`, `create.html`, `fr_create.html`.')
    lines.push('')
    lines.push('## Result')
    if (failures.length === 0) {
        lines.push('- PASS: canonical/hreflang/og:url assertions passed for all configured targets and routes.')
    } else {
        lines.push('- FAIL: one or more assertions failed.')
        for (const failure of failures) {
            lines.push(`- ${failure}`)
        }
    }
    lines.push('')
    return lines.join('\n')
}

async function main(): Promise<void> {
    const timestamp = currentTimestamp()
    const localHost = (process.env.SEO_VERIFY_LOCAL_HOST || '127.0.0.1').trim()
    const localPort = Number(process.env.SEO_VERIFY_LOCAL_PORT || '3301')
    const includeLocal = (process.env.SEO_VERIFY_INCLUDE_LOCAL || '1').trim() !== '0'
    const includeProd = (process.env.SEO_VERIFY_INCLUDE_PROD || '1').trim() !== '0'
    const prodBaseUrl = normalizeBaseUrl(process.env.SEO_VERIFY_PROD_BASE_URL || 'https://smartprintai.com')
    const artifactRoot = path.resolve(
        process.cwd(),
        process.env.SEO_VERIFY_ARTIFACT_DIR || path.join('docs/reports/artifacts', `wave3-rendered-head-${timestamp.compact}`),
    )
    const reportFile = path.resolve(
        process.cwd(),
        path.join('docs/reports', `WAVE3_RENDERED_HEAD_VERIFY_${timestamp.compact}.md`),
    )
    const summaryFile = path.join(artifactRoot, 'summary.json')

    if (!includeLocal && !includeProd) {
        throw new Error('Nothing to verify: both SEO_VERIFY_INCLUDE_LOCAL and SEO_VERIFY_INCLUDE_PROD are disabled.')
    }

    await mkdir(artifactRoot, { recursive: true })
    await mkdir(path.dirname(reportFile), { recursive: true })

    const targetResults: TargetResult[] = []

    if (includeLocal) {
        targetResults.push(await runWithLocalServer(localHost, localPort, artifactRoot))
    }
    if (includeProd) {
        targetResults.push(await runTargetAssertions('prod', prodBaseUrl, artifactRoot))
    }

    const failures = targetResults.flatMap((result) => result.failures)

    const summary = {
        generatedAt: timestamp.iso,
        generatedDate: timestamp.date,
        artifactRoot: toRelativePath(artifactRoot),
        routeCount: ROUTE_EXPECTATIONS.length,
        targets: targetResults,
        failures,
    }

    await writeFile(summaryFile, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
    await writeFile(
        reportFile,
        renderMarkdownReport(timestamp.iso, artifactRoot, summaryFile, targetResults, failures),
        'utf8',
    )

    console.log(`Rendered-head verification report: ${toRelativePath(reportFile)}`)
    console.log(`Rendered-head verification artifacts: ${toRelativePath(artifactRoot)}`)

    if (failures.length > 0) {
        for (const failure of failures) {
            console.error(`- ${failure}`)
        }
        process.exit(1)
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
})
