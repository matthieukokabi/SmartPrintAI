import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import {
    discoverProductDetailPathFromHtml,
    resolveProductDetailPath,
    type ProductDetailResolutionStrategy,
} from '../src/lib/lighthouse-product-route'

type CategoryKey = 'performance' | 'accessibility' | 'seo'
type RouteKey = 'home' | 'create' | 'products' | 'productDetail' | 'blog' | 'support'

type Scores = Record<CategoryKey, number>

type LighthouseBudgetConfig = {
    defaultBaseUrl: string
    runsPerRoute: number
    thresholds: Scores
    maxRegression: Scores
    staticRoutes: Record<Exclude<RouteKey, 'productDetail'>, string>
    productDetailFixture: {
        path: string
        fallbackSourcePath?: string
        fallbackPath?: string
    }
}

type ProductDetailResolution = {
    strategy: ProductDetailResolutionStrategy
    configuredFixturePath: string
    selectedPath: string
    discoverySourcePath: string
    fallbackPath: string | null
    warning?: string
}

type RouteTarget = {
    key: RouteKey
    path: string
    url: string
}

type AttemptResult = {
    attempt: number
    scores: Scores
    reportPath: string
}

type RouteAuditResult = {
    key: RouteKey
    path: string
    url: string
    attempts: AttemptResult[]
    finalScores: Scores
}

type LighthouseBaseline = {
    generatedAt: string
    baseUrl: string
    routes: Record<RouteKey, { path: string; scores: Scores }>
}

const CATEGORY_KEYS: CategoryKey[] = ['performance', 'accessibility', 'seo']
const ROUTE_KEYS: RouteKey[] = ['home', 'create', 'products', 'productDetail', 'blog', 'support']

const CONFIG_PATH = path.join(process.cwd(), 'config', 'lighthouse-budget.json')
const BASELINE_PATH = path.join(process.cwd(), 'docs', 'reports', 'LIGHTHOUSE_BASELINE.json')

function nowTimestamp(): { iso: string; compact: string; date: string } {
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

async function readJsonFile<T>(filePath: string): Promise<T> {
    const raw = await readFile(filePath, 'utf8')
    return JSON.parse(raw) as T
}

function normalizeBaseUrl(value: string): string {
    return value.trim().replace(/\/+$/, '')
}

function normalizePath(value: string): string {
    if (!value.startsWith('/')) {
        return `/${value}`
    }
    return value
}

function parseBooleanEnv(value: string | undefined, fallback: boolean): boolean {
    if (!value) {
        return fallback
    }
    const normalized = value.trim().toLowerCase()
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
        return true
    }
    if (['0', 'false', 'no', 'off'].includes(normalized)) {
        return false
    }
    return fallback
}

function median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    if (sorted.length % 2 === 0) {
        return Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(3))
    }
    return Number(sorted[mid].toFixed(3))
}

function extractScores(lhr: { categories?: Record<string, { score?: number | null }> }): Scores {
    return {
        performance: Number((lhr.categories?.performance?.score || 0).toFixed(3)),
        accessibility: Number((lhr.categories?.accessibility?.score || 0).toFixed(3)),
        seo: Number((lhr.categories?.seo?.score || 0).toFixed(3)),
    }
}

async function fetchHtml(url: string): Promise<string> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)
    try {
        const response = await fetch(url, {
            headers: { accept: 'text/html' },
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

async function resolveRouteTargets(
    baseUrl: string,
    config: LighthouseBudgetConfig,
): Promise<{ routeTargets: RouteTarget[]; productDetailResolution: ProductDetailResolution }> {
    const staticTargets: RouteTarget[] = [
        { key: 'home', path: normalizePath(config.staticRoutes.home), url: `${baseUrl}${normalizePath(config.staticRoutes.home)}` },
        { key: 'create', path: normalizePath(config.staticRoutes.create), url: `${baseUrl}${normalizePath(config.staticRoutes.create)}` },
        { key: 'products', path: normalizePath(config.staticRoutes.products), url: `${baseUrl}${normalizePath(config.staticRoutes.products)}` },
        { key: 'blog', path: normalizePath(config.staticRoutes.blog), url: `${baseUrl}${normalizePath(config.staticRoutes.blog)}` },
        { key: 'support', path: normalizePath(config.staticRoutes.support), url: `${baseUrl}${normalizePath(config.staticRoutes.support)}` },
    ]

    const fixturePath = normalizePath(
        (process.env.LIGHTHOUSE_PRODUCT_DETAIL_PATH || config.productDetailFixture.path).trim(),
    )
    const discoverySourcePath = normalizePath(
        (
            process.env.LIGHTHOUSE_PRODUCT_DETAIL_SOURCE_PATH ||
            config.productDetailFixture.fallbackSourcePath ||
            '/products'
        ).trim(),
    )
    const configuredFallbackRaw = (
        process.env.LIGHTHOUSE_PRODUCT_DETAIL_FALLBACK_PATH ||
        config.productDetailFixture.fallbackPath ||
        ''
    ).trim()
    const configuredFallbackPath = configuredFallbackRaw.length > 0 ? normalizePath(configuredFallbackRaw) : null

    let fixtureAvailable = false
    let fixtureError: string | null = null
    try {
        await fetchHtml(`${baseUrl}${fixturePath}`)
        fixtureAvailable = true
    } catch (error) {
        fixtureError = error instanceof Error ? error.message : String(error)
    }

    let discoveredPath: string | null = null
    let discoveryError: string | null = null
    if (!fixtureAvailable) {
        try {
            const discoveryHtml = await fetchHtml(`${baseUrl}${discoverySourcePath}`)
            discoveredPath = discoverProductDetailPathFromHtml(discoveryHtml)
            if (!discoveredPath) {
                discoveryError = 'no matching link found'
            }
        } catch (error) {
            discoveryError = error instanceof Error ? error.message : String(error)
        }
    }

    const resolution = resolveProductDetailPath({
        fixturePath,
        fixtureAvailable,
        fixtureError,
        discoverySourcePath,
        discoveredPath,
        discoveryError,
        fallbackPath: configuredFallbackPath,
    })

    if (resolution.warning) {
        console.warn(`[lighthouse] ${resolution.warning}`)
    }

    const productDetailTarget: RouteTarget = {
        key: 'productDetail',
        path: resolution.path,
        url: `${baseUrl}${resolution.path}`,
    }

    const allTargets = [...staticTargets]
    allTargets.splice(3, 0, productDetailTarget)
    return {
        routeTargets: allTargets,
        productDetailResolution: {
            strategy: resolution.strategy,
            configuredFixturePath: fixturePath,
            selectedPath: resolution.path,
            discoverySourcePath,
            fallbackPath: configuredFallbackPath,
            warning: resolution.warning,
        },
    }
}

function detectChromePath(): string | undefined {
    const envPath = (process.env.LIGHTHOUSE_CHROME_PATH || '').trim()
    if (envPath.length > 0 && existsSync(envPath)) {
        return envPath
    }

    const staticCandidates = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/opt/google/chrome/chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium',
    ]
    for (const candidate of staticCandidates) {
        if (existsSync(candidate)) {
            return candidate
        }
    }

    const commandCandidates = ['google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser', 'chrome']
    for (const command of commandCandidates) {
        const resolved = spawnSync('which', [command], { encoding: 'utf8' })
        if (resolved.status === 0) {
            const binary = (resolved.stdout || '').trim()
            if (binary.length > 0 && existsSync(binary)) {
                return binary
            }
        }
    }

    return undefined
}

async function warmupRoutes(routeTargets: RouteTarget[]): Promise<void> {
    for (const route of routeTargets) {
        await fetchHtml(route.url)
        await delay(250)
    }
}

async function runLighthouseAttempts(
    routeTargets: RouteTarget[],
    runsPerRoute: number,
    artifactRoot: string,
): Promise<RouteAuditResult[]> {
    const chromePath = detectChromePath()
    if (!chromePath) {
        throw new Error(
            'Unable to locate a Chrome/Chromium binary for Lighthouse. Set LIGHTHOUSE_CHROME_PATH to a valid executable.'
        )
    }
    const byRoute = new Map<RouteKey, RouteAuditResult>()
    for (const route of routeTargets) {
        byRoute.set(route.key, {
            key: route.key,
            path: route.path,
            url: route.url,
            attempts: [],
            finalScores: { performance: 0, accessibility: 0, seo: 0 },
        })
    }

    const localLighthouseBinary = path.join(process.cwd(), 'node_modules', '.bin', 'lighthouse')
    const lighthouseCommand = existsSync(localLighthouseBinary) ? localLighthouseBinary : 'npx'
    const lighthouseCommandArgsPrefix = existsSync(localLighthouseBinary) ? [] : ['lighthouse']
    const chromeFlags = [
        '--headless=new',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-features=Translate,BackForwardCache',
        '--window-size=1350,940',
    ].join(' ')

    for (let attempt = 1; attempt <= runsPerRoute; attempt += 1) {
        for (const route of routeTargets) {
            await fetchHtml(route.url)

            const reportFile = path.join(artifactRoot, `${route.key}.attempt-${attempt}.json`)
            const args = [
                ...lighthouseCommandArgsPrefix,
                route.url,
                '--quiet',
                '--output=json',
                `--output-path=${reportFile}`,
                '--only-categories=performance,accessibility,seo',
                '--preset=desktop',
                '--throttling-method=devtools',
                '--max-wait-for-load=45000',
                `--chrome-path=${chromePath}`,
                `--chrome-flags=${chromeFlags}`,
            ]
            const commandResult = spawnSync(lighthouseCommand, args, {
                encoding: 'utf8',
                cwd: process.cwd(),
                env: process.env,
                maxBuffer: 1024 * 1024 * 10,
            })

            if (commandResult.status !== 0) {
                const stdout = (commandResult.stdout || '').trim()
                const stderr = (commandResult.stderr || '').trim()
                throw new Error(
                    `Lighthouse CLI failed for ${route.url} (attempt ${attempt}) with status ${String(commandResult.status)}.\nstdout: ${stdout}\nstderr: ${stderr}`
                )
            }

            const report = await readJsonFile<{ categories?: Record<string, { score?: number | null }> }>(reportFile)
            const scores = extractScores(report)

            const routeResult = byRoute.get(route.key)
            if (!routeResult) {
                throw new Error(`Internal error: missing route bucket for ${route.key}`)
            }
            routeResult.attempts.push({
                attempt,
                scores,
                reportPath: toRelativePath(reportFile),
            })
        }
    }

    const completed = Array.from(byRoute.values())
    for (const route of completed) {
        const performanceScores = route.attempts.map((attempt) => attempt.scores.performance)
        const accessibilityScores = route.attempts.map((attempt) => attempt.scores.accessibility)
        const seoScores = route.attempts.map((attempt) => attempt.scores.seo)
        route.finalScores = {
            performance: median(performanceScores),
            accessibility: median(accessibilityScores),
            seo: median(seoScores),
        }
    }

    return completed
}

function buildBaseline(routeResults: RouteAuditResult[], baseUrl: string, generatedAt: string): LighthouseBaseline {
    const routes = {} as Record<RouteKey, { path: string; scores: Scores }>
    for (const key of ROUTE_KEYS) {
        const result = routeResults.find((route) => route.key === key)
        if (!result) {
            throw new Error(`Missing route result for baseline key ${key}`)
        }
        routes[key] = {
            path: result.path,
            scores: result.finalScores,
        }
    }
    return {
        generatedAt,
        baseUrl,
        routes,
    }
}

function evaluateBudgets(
    routeResults: RouteAuditResult[],
    config: LighthouseBudgetConfig,
    baseline: LighthouseBaseline | null,
): string[] {
    const failures: string[] = []
    for (const route of routeResults) {
        for (const category of CATEGORY_KEYS) {
            const score = route.finalScores[category]
            const threshold = config.thresholds[category]
            if (score < threshold) {
                failures.push(
                    `${route.key} (${route.path}) ${category} score ${score.toFixed(3)} below threshold ${threshold.toFixed(3)}`
                )
            }

            if (!baseline) {
                continue
            }
            const baselineRoute = baseline.routes[route.key]
            if (!baselineRoute) {
                failures.push(`Baseline missing route key '${route.key}'`)
                continue
            }
            const baselineScore = baselineRoute.scores[category]
            const allowedDrop = config.maxRegression[category]
            const floor = Number((baselineScore - allowedDrop).toFixed(3))
            if (score < floor) {
                failures.push(
                    `${route.key} (${route.path}) ${category} score ${score.toFixed(3)} regressed below baseline floor ${floor.toFixed(3)} (baseline ${baselineScore.toFixed(3)})`
                )
            }
        }
    }
    return failures
}

function buildMarkdownReport(
    generatedAt: string,
    baseUrl: string,
    artifactRoot: string,
    summaryFile: string,
    requireFixture: boolean,
    productDetailResolution: ProductDetailResolution,
    routeResults: RouteAuditResult[],
    failures: string[],
): string {
    const lines: string[] = []
    lines.push('# Wave 3 Lighthouse Budget Gate')
    lines.push('')
    lines.push(`Generated: ${generatedAt}`)
    lines.push(`Base URL: ${baseUrl}`)
    lines.push(`Artifact root: \`${toRelativePath(artifactRoot)}\``)
    lines.push(`Summary JSON: \`${toRelativePath(summaryFile)}\``)
    lines.push('')
    lines.push('## Product Detail Route Resolution')
    lines.push(`- deterministic fixture required: \`${requireFixture ? 'yes' : 'no'}\``)
    lines.push(`- strategy: \`${productDetailResolution.strategy}\``)
    lines.push(`- configured fixture: \`${productDetailResolution.configuredFixturePath}\``)
    lines.push(`- selected route: \`${productDetailResolution.selectedPath}\``)
    lines.push(`- fallback discovery source: \`${productDetailResolution.discoverySourcePath}\``)
    if (productDetailResolution.fallbackPath) {
        lines.push(`- configured fallback route: \`${productDetailResolution.fallbackPath}\``)
    }
    if (productDetailResolution.warning) {
        lines.push(`- warning: ${productDetailResolution.warning}`)
    }
    lines.push('')
    lines.push('## Route Scores (Median)')
    for (const route of routeResults) {
        lines.push(
            `- \`${route.key}\` (${route.path}) -> perf ${route.finalScores.performance.toFixed(3)}, a11y ${route.finalScores.accessibility.toFixed(3)}, seo ${route.finalScores.seo.toFixed(3)}`
        )
    }
    lines.push('')
    lines.push('## Result')
    if (failures.length === 0) {
        lines.push('- PASS: Lighthouse thresholds and regression budgets passed.')
    } else {
        lines.push('- FAIL: Lighthouse budget gate failed.')
        for (const failure of failures) {
            lines.push(`- ${failure}`)
        }
    }
    lines.push('')
    return lines.join('\n')
}

async function main(): Promise<void> {
    const timestamp = nowTimestamp()
    const config = await readJsonFile<LighthouseBudgetConfig>(CONFIG_PATH)
    const baseUrl = normalizeBaseUrl(process.env.LIGHTHOUSE_BASE_URL || config.defaultBaseUrl)
    const runsPerRoute = Number(process.env.LIGHTHOUSE_RUNS || config.runsPerRoute)
    const requireFixture = parseBooleanEnv(process.env.LIGHTHOUSE_REQUIRE_FIXTURE, true)
    const updateBaseline = (process.env.LIGHTHOUSE_UPDATE_BASELINE || '0').trim() === '1'
    const artifactRoot = path.resolve(
        process.cwd(),
        process.env.LIGHTHOUSE_ARTIFACT_DIR || path.join('docs/reports/artifacts', `lighthouse-${timestamp.compact}`),
    )
    const reportFile = path.resolve(
        process.cwd(),
        path.join('docs/reports', `WAVE3_LIGHTHOUSE_GATE_${timestamp.compact}.md`),
    )
    const summaryFile = path.join(artifactRoot, 'summary.json')

    if (Number.isNaN(runsPerRoute) || runsPerRoute < 1) {
        throw new Error(`Invalid LIGHTHOUSE_RUNS value: ${String(runsPerRoute)}`)
    }

    await mkdir(artifactRoot, { recursive: true })
    await mkdir(path.dirname(reportFile), { recursive: true })

    const { routeTargets, productDetailResolution } = await resolveRouteTargets(baseUrl, config)
    if (requireFixture && productDetailResolution.strategy !== 'fixture') {
        throw new Error(
            `Deterministic Lighthouse fixture route is required for gate-critical checks, but resolved strategy was '${productDetailResolution.strategy}' (selected '${productDetailResolution.selectedPath}' from source '${productDetailResolution.discoverySourcePath}'). Ensure productDetailFixture.path resolves successfully or set LIGHTHOUSE_REQUIRE_FIXTURE=0 for non-gating diagnostics.`
        )
    }
    await warmupRoutes(routeTargets)
    const routeResults = await runLighthouseAttempts(routeTargets, runsPerRoute, artifactRoot)

    let baseline: LighthouseBaseline | null = null
    if (existsSync(BASELINE_PATH)) {
        baseline = await readJsonFile<LighthouseBaseline>(BASELINE_PATH)
    }

    const failures = evaluateBudgets(routeResults, config, baseline)

    const summary = {
        generatedAt: timestamp.iso,
        generatedDate: timestamp.date,
        baseUrl,
        runsPerRoute,
        artifactRoot: toRelativePath(artifactRoot),
        requireFixture,
        productDetailResolution,
        routeResults,
        failures,
    }

    await writeFile(summaryFile, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
    await writeFile(
        reportFile,
        buildMarkdownReport(
            timestamp.iso,
            baseUrl,
            artifactRoot,
            summaryFile,
            requireFixture,
            productDetailResolution,
            routeResults,
            failures,
        ),
        'utf8',
    )

    if (updateBaseline || !baseline) {
        const newBaseline = buildBaseline(routeResults, baseUrl, timestamp.iso)
        await mkdir(path.dirname(BASELINE_PATH), { recursive: true })
        await writeFile(BASELINE_PATH, `${JSON.stringify(newBaseline, null, 2)}\n`, 'utf8')
        console.log(`Updated Lighthouse baseline: ${toRelativePath(BASELINE_PATH)}`)
    }

    console.log(`Lighthouse budget report: ${toRelativePath(reportFile)}`)
    console.log(`Lighthouse budget artifacts: ${toRelativePath(artifactRoot)}`)

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
