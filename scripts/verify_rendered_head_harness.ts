import { spawn, spawnSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import {
    parseRenderedHead,
    parseTrustVisibility,
    resolveRenderedLocaleFromPath,
    toPathname,
    type RenderedLocale,
} from '../src/lib/rendered-head'

type TargetName = 'local' | 'prod'
type TrustExpectation = 'required' | 'optional' | 'absent'

type RouteExpectation = {
    path: string
    targets?: TargetName[]
    trustExpectation?: TrustExpectation
}

type ResolvedRouteExpectation = {
    path: string
    canonicalPath: string
    alternatesBasePath: string
    locale: RenderedLocale
    trustExpectation: TrustExpectation
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
    locale: RenderedLocale
    expectedTrustExpectation: TrustExpectation
    expectedTrustMarkers: string[]
    foundTrustMarkers: string[]
    actualTrustVisible: boolean
    failures: string[]
}

type TargetResult = {
    target: TargetName
    baseUrl: string
    routeResults: RouteResult[]
    failures: string[]
}

type TimestampParts = {
    iso: string
    compact: string
    date: string
}

const LOCALES: RenderedLocale[] = ['en', 'fr', 'de', 'es']

const STATIC_ROUTE_EXPECTATIONS: RouteExpectation[] = [
    { path: '/create', trustExpectation: 'required' },
    { path: '/en/create', trustExpectation: 'required' },
    { path: '/fr/create', trustExpectation: 'required' },
    { path: '/de/create', trustExpectation: 'required' },
    { path: '/es/create', trustExpectation: 'required' },
    { path: '/products', trustExpectation: 'required', targets: ['prod'] },
    { path: '/blog', trustExpectation: 'absent' },
    { path: '/en/blog', trustExpectation: 'absent' },
    { path: '/fr/blog', trustExpectation: 'absent' },
    { path: '/de/blog', trustExpectation: 'absent' },
    { path: '/es/blog', trustExpectation: 'absent' },
]

function normalizeBaseUrl(value: string): string {
    return value.trim().replace(/\/+$/, '')
}

function normalizeRoutePath(value: string): string {
    if (!value) {
        return '/'
    }
    const prefixed = value.startsWith('/') ? value : `/${value}`
    const normalized = prefixed.replace(/\/+$/, '')
    return normalized.length > 0 ? normalized : '/'
}

function currentTimestamp(): TimestampParts {
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

function localizedPath(locale: RenderedLocale, basePath: string): string {
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

function parseLocaleAndBasePath(routePath: string): { locale: RenderedLocale; basePath: string } {
    const normalizedPath = normalizeRoutePath(routePath)
    for (const locale of LOCALES) {
        if (normalizedPath === `/${locale}`) {
            return {
                locale,
                basePath: '/',
            }
        }
        if (normalizedPath.startsWith(`/${locale}/`)) {
            const withoutLocale = normalizedPath.replace(new RegExp(`^/${locale}`), '')
            return {
                locale,
                basePath: withoutLocale.length > 0 ? withoutLocale : '/',
            }
        }
    }

    return {
        locale: resolveRenderedLocaleFromPath(normalizedPath),
        basePath: normalizedPath,
    }
}

function expectedCanonicalPath(locale: RenderedLocale, basePath: string): string {
    if (locale === 'en') {
        return basePath
    }
    return localizedPath(locale, basePath)
}

function shouldRunOnTarget(route: RouteExpectation, target: TargetName): boolean {
    if (!route.targets || route.targets.length === 0) {
        return true
    }
    return route.targets.includes(target)
}

function resolveRouteExpectation(route: RouteExpectation): ResolvedRouteExpectation {
    const normalizedPath = normalizeRoutePath(route.path)
    const localeAndBase = parseLocaleAndBasePath(normalizedPath)
    return {
        path: normalizedPath,
        canonicalPath: expectedCanonicalPath(localeAndBase.locale, localeAndBase.basePath),
        alternatesBasePath: localeAndBase.basePath,
        locale: localeAndBase.locale,
        trustExpectation: route.trustExpectation || 'optional',
    }
}

function discoverProductDetailPath(html: string): string | null {
    const patterns = [
        /href=(['"])(\/products\/[^'"?#]+)\1/i,
        /href=(['"])(\/(?:en|fr|de|es)\/products\/[^'"?#]+)\1/i,
        /href=(['"])(https?:\/\/[^'"\\s]+\/products\/[^'"?#]+)\1/i,
    ]

    for (const pattern of patterns) {
        const match = pattern.exec(html)
        if (!match || !match[2]) {
            continue
        }
        const resolved = new URL(match[2], 'https://smartprintai.com')
        const routePath = normalizeRoutePath(resolved.pathname)
        if (routePath === '/products') {
            continue
        }
        if (routePath.startsWith('/products/') || /^\/(en|fr|de|es)\/products\/.+/.test(routePath)) {
            return routePath
        }
    }

    return null
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

async function resolveRouteExpectationsForTarget(target: TargetName, baseUrl: string): Promise<{ routes: ResolvedRouteExpectation[]; failures: string[] }> {
    const failures: string[] = []
    const routes = STATIC_ROUTE_EXPECTATIONS
        .filter((route) => shouldRunOnTarget(route, target))
        .map(resolveRouteExpectation)

    const includeProducts = routes.some((route) => route.path === '/products')
    if (includeProducts) {
        try {
            const productsHtml = await fetchHtml(baseUrl, '/products')
            const discoveredPath = discoverProductDetailPath(productsHtml)
            const fallbackPath = normalizeRoutePath(process.env.SEO_VERIFY_PRODUCT_DETAIL_PATH || '')
            const productDetailPath = discoveredPath || (fallbackPath === '/' ? null : fallbackPath)

            if (!productDetailPath) {
                failures.push(`[${target}] unable to discover product detail route from /products`)
            } else {
                routes.push(
                    resolveRouteExpectation({
                        path: productDetailPath,
                        trustExpectation: 'required',
                        targets: target === 'prod' ? ['prod'] : ['local'],
                    })
                )
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            failures.push(`[${target}] /products discovery failed (${message})`)
        }
    }

    return {
        routes,
        failures,
    }
}

function assertRoute(html: string, route: ResolvedRouteExpectation, htmlArtifact: string): RouteResult {
    const failures: string[] = []
    const parsed = parseRenderedHead(html)
    const canonicalPath = parsed.canonicalHref ? toPathname(parsed.canonicalHref) : null
    const ogPath = parsed.ogUrl ? toPathname(parsed.ogUrl) : null
    const expectedAlt = expectedAlternates(route.alternatesBasePath)
    const actualAlternates: Record<string, string> = {}
    const trustVisibility = parseTrustVisibility(html, route.locale)

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

    if (route.trustExpectation === 'required' && !trustVisibility.isVisible) {
        failures.push(
            `${route.path}: trust strip not fully visible (found ${trustVisibility.foundMarkers.length}/${trustVisibility.requiredMarkers.length} markers)`
        )
    }

    if (route.trustExpectation === 'absent' && trustVisibility.foundMarkers.length > 0) {
        failures.push(`${route.path}: trust markers unexpectedly present on non-money page`)
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
        locale: route.locale,
        expectedTrustExpectation: route.trustExpectation,
        expectedTrustMarkers: trustVisibility.requiredMarkers,
        foundTrustMarkers: trustVisibility.foundMarkers,
        actualTrustVisible: trustVisibility.isVisible,
        failures,
    }
}

async function runTargetAssertions(target: TargetName, baseUrl: string, artifactRoot: string): Promise<TargetResult> {
    const targetDir = path.join(artifactRoot, target)
    await mkdir(targetDir, { recursive: true })

    const routeResults: RouteResult[] = []
    const failures: string[] = []

    const routeResolution = await resolveRouteExpectationsForTarget(target, baseUrl)
    failures.push(...routeResolution.failures)

    for (const route of routeResolution.routes) {
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
                locale: route.locale,
                expectedTrustExpectation: route.trustExpectation,
                expectedTrustMarkers: parseTrustVisibility('', route.locale).requiredMarkers,
                foundTrustMarkers: [],
                actualTrustVisible: false,
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

async function runWithLocalServer(host: string, port: number, artifactRoot: string): Promise<TargetResult> {
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

function readGitCommitSha(): string {
    const resolved = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
        cwd: process.cwd(),
        encoding: 'utf8',
    })
    if (resolved.status !== 0) {
        return 'unknown'
    }
    const value = (resolved.stdout || '').trim()
    return value.length > 0 ? value : 'unknown'
}

function renderMarkdownReport(
    generatedAtIso: string,
    commitSha: string,
    artifactRoot: string,
    summaryFile: string,
    targetResults: TargetResult[],
    failures: string[],
): string {
    const lines: string[] = []
    lines.push('# Wave 4 Rendered Head + Trust Verification Harness')
    lines.push('')
    lines.push(`Generated: ${generatedAtIso}`)
    lines.push(`Commit: \`${commitSha}\``)
    lines.push(`Artifact root: \`${toRelativePath(artifactRoot)}\``)
    lines.push(`Summary JSON: \`${toRelativePath(summaryFile)}\``)
    lines.push('')
    lines.push('## Targets')
    for (const result of targetResults) {
        lines.push(`- \`${result.target}\` -> ${result.baseUrl} (routes: ${result.routeResults.length}, failures: ${result.failures.length})`)
    }
    lines.push('')
    lines.push('## Trust Visibility States')
    for (const result of targetResults) {
        lines.push(`### ${result.target}`)
        for (const routeResult of result.routeResults) {
            lines.push(
                `- \`${routeResult.path}\`: trust=${routeResult.actualTrustVisible ? 'visible' : 'missing'} ` +
                `(expected ${routeResult.expectedTrustExpectation}, markers ${routeResult.foundTrustMarkers.length}/${routeResult.expectedTrustMarkers.length})`
            )
        }
    }
    lines.push('')
    lines.push('## Result')
    if (failures.length === 0) {
        lines.push('- PASS: canonical/hreflang/x-default/og:url and trust visibility assertions passed for all configured targets/routes.')
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
    const includeLocal = (process.env.SEO_VERIFY_INCLUDE_LOCAL || '0').trim() !== '0'
    const includeProd = (process.env.SEO_VERIFY_INCLUDE_PROD || '1').trim() !== '0'
    const prodBaseUrl = normalizeBaseUrl(process.env.SEO_VERIFY_PROD_BASE_URL || 'https://smartprintai.com')
    const commitSha = (process.env.SEO_VERIFY_COMMIT_SHA || '').trim() || readGitCommitSha()

    const artifactRoot = path.resolve(
        process.cwd(),
        process.env.SEO_VERIFY_ARTIFACT_DIR ||
            path.join('docs/reports/artifacts', `wave4-rendered-head-${timestamp.compact}-${commitSha}`),
    )

    const reportFile = path.resolve(
        process.cwd(),
        path.join('docs/reports', `WAVE4_RENDERED_HEAD_VERIFY_${timestamp.compact}_${commitSha}.md`),
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
        commitSha,
        artifactRoot: toRelativePath(artifactRoot),
        routeCount: targetResults.reduce((sum, result) => sum + result.routeResults.length, 0),
        targets: targetResults,
        failures,
    }

    await writeFile(summaryFile, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
    await writeFile(
        reportFile,
        renderMarkdownReport(timestamp.iso, commitSha, artifactRoot, summaryFile, targetResults, failures),
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
