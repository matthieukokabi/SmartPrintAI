import { readFile } from 'node:fs/promises'
import path from 'node:path'

type LighthouseSummary = {
    failures?: string[]
    routeResults?: Array<{ key?: string; path?: string }>
    productDetailResolution?: {
        strategy?: string
        configuredFixturePath?: string
        selectedPath?: string
        discoverySourcePath?: string
    }
}

type RenderedRouteSummary = {
    path?: string
    expectedTrustExpectation?: 'required' | 'optional' | 'absent'
    actualTrustVisible?: boolean
}

type RenderedTargetSummary = {
    target?: string
    routeResults?: RenderedRouteSummary[]
}

type RenderedSummary = {
    failures?: string[]
    targets?: RenderedTargetSummary[]
}

type TrendSummary = {
    status?: 'pass' | 'warmup' | 'fail'
    warmup?: {
        active?: boolean
        minBaseline?: number
        lighthouseBaselineCount?: number
        renderedBaselineCount?: number
        remaining?: {
            lighthouse?: number
            rendered?: number
        }
    }
    findings?: Array<{ metric?: string }>
}

type GuardrailOptions = {
    requireProdTarget: boolean
}

function toAbsolutePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
        return filePath
    }
    return path.join(process.cwd(), filePath)
}

function toRelativePath(filePath: string): string {
    return path.relative(process.cwd(), filePath).split(path.sep).join('/')
}

function requiredEnvPath(name: string): string {
    const value = (process.env[name] || '').trim()
    if (!value) {
        throw new Error(`Missing required environment variable ${name}.`)
    }
    return toAbsolutePath(value)
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

async function readJsonFile<T>(filePath: string, label: string): Promise<T> {
    try {
        const raw = await readFile(filePath, 'utf8')
        return JSON.parse(raw) as T
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(`Unable to read ${label} summary at ${toRelativePath(filePath)} (${message}).`)
    }
}

function assertLighthouse(summary: LighthouseSummary): string[] {
    const failures: string[] = []
    const resolution = summary.productDetailResolution
    const strategy = (resolution?.strategy || '').trim()

    if ((summary.failures || []).length > 0) {
        failures.push(`Lighthouse budget gate reported ${(summary.failures || []).length} failure(s).`)
    }

    if (strategy !== 'fixture') {
        failures.push(
            `Deterministic fixture route is required for CI, but Lighthouse used strategy '${strategy || 'unknown'}' (selected '${resolution?.selectedPath || 'unknown'}' from '${resolution?.discoverySourcePath || 'unknown'}').`
        )
    }

    const hasProductDetailRoute = (summary.routeResults || []).some((route) => route.key === 'productDetail')
    if (!hasProductDetailRoute) {
        failures.push('Lighthouse summary is missing productDetail route results.')
    }

    if (
        resolution?.configuredFixturePath &&
        resolution?.selectedPath &&
        strategy === 'fixture' &&
        resolution.selectedPath !== resolution.configuredFixturePath
    ) {
        failures.push(
            `Lighthouse fixture mismatch: selected '${resolution.selectedPath}' does not match configured '${resolution.configuredFixturePath}'.`
        )
    }

    return failures
}

function assertRendered(summary: RenderedSummary, options: GuardrailOptions): string[] {
    const failures: string[] = []
    const summaryFailures = summary.failures || []
    if (summaryFailures.length > 0) {
        failures.push(`Rendered semantic harness reported ${summaryFailures.length} failure(s).`)
    }

    const targets = summary.targets || []
    const selectedTargets = options.requireProdTarget ? targets.filter((target) => target.target === 'prod') : targets

    if (options.requireProdTarget && selectedTargets.length === 0) {
        failures.push('Rendered semantic harness must include a production target in CI.')
    }

    const requiredRoutes = selectedTargets
        .flatMap((target) => target.routeResults || [])
        .filter((route) => route.expectedTrustExpectation === 'required')

    if (requiredRoutes.length === 0) {
        failures.push(
            options.requireProdTarget
                ? 'Rendered semantic harness did not evaluate any production required-trust routes.'
                : 'Rendered semantic harness did not evaluate any required-trust routes.'
        )
    }

    const missingTrustRoutes = requiredRoutes.filter((route) => route.actualTrustVisible !== true)
    if (missingTrustRoutes.length > 0) {
        failures.push(
            options.requireProdTarget
                ? `Rendered semantic harness found ${missingTrustRoutes.length} production required-trust route(s) without visible trust markers.`
                : `Rendered semantic harness found ${missingTrustRoutes.length} required-trust route(s) without visible trust markers.`
        )
    }

    return failures
}

function assertTrend(summary: TrendSummary): { failures: string[]; notes: string[] } {
    const failures: string[] = []
    const notes: string[] = []
    const status = summary.status || 'unknown'
    const findingCount = (summary.findings || []).length
    const warmupActive = summary.warmup?.active === true

    if (status === 'pass') {
        return { failures, notes }
    }

    if (status === 'warmup') {
        const remainingLighthouse = summary.warmup?.remaining?.lighthouse ?? 0
        const remainingRendered = summary.warmup?.remaining?.rendered ?? 0
        notes.push(
            `Trend gate in warmup mode (remaining lighthouse=${remainingLighthouse}, rendered=${remainingRendered}).`
        )
        return { failures, notes }
    }

    if (status === 'fail') {
        failures.push(
            `Trend gate reported 'fail' with ${findingCount} finding(s) (warmupActive=${String(warmupActive)}).`
        )
        return { failures, notes }
    }

    failures.push(`Trend gate returned unsupported status '${status}'.`)
    return { failures, notes }
}

async function main(): Promise<void> {
    const options: GuardrailOptions = {
        requireProdTarget: parseBooleanEnv(process.env.CI_GUARD_REQUIRE_PROD_TARGET, true),
    }

    const lighthouseSummaryPath = requiredEnvPath('CI_GUARD_LIGHTHOUSE_SUMMARY')
    const renderedSummaryPath = requiredEnvPath('CI_GUARD_RENDERED_SUMMARY')
    const trendSummaryPath = requiredEnvPath('CI_GUARD_TREND_SUMMARY')

    const [lighthouseSummary, renderedSummary, trendSummary] = await Promise.all([
        readJsonFile<LighthouseSummary>(lighthouseSummaryPath, 'lighthouse'),
        readJsonFile<RenderedSummary>(renderedSummaryPath, 'rendered'),
        readJsonFile<TrendSummary>(trendSummaryPath, 'trend'),
    ])

    const failures = [
        ...assertLighthouse(lighthouseSummary),
        ...assertRendered(renderedSummary, options),
    ]
    const trendAssertion = assertTrend(trendSummary)
    failures.push(...trendAssertion.failures)

    console.log('CI quality guardrail summaries:')
    console.log(`- lighthouse: ${toRelativePath(lighthouseSummaryPath)}`)
    console.log(`- rendered: ${toRelativePath(renderedSummaryPath)}`)
    console.log(`- trend: ${toRelativePath(trendSummaryPath)}`)
    console.log(`- prod target required: ${options.requireProdTarget ? 'yes' : 'no'}`)

    for (const note of trendAssertion.notes) {
        console.log(`- note: ${note}`)
    }

    if (failures.length > 0) {
        for (const failure of failures) {
            console.error(`- ${failure}`)
        }
        process.exit(1)
    }

    console.log('CI quality release guardrails passed.')
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
})
