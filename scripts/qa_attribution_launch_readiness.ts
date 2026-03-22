import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
    buildAttributionContext,
    normalizeAttributionFromParams,
} from '../src/lib/analytics-attribution'
import {
    buildCreateEntryFunnelReport,
} from '../src/lib/create-entry-funnel-report'
import {
    buildHomepageFunnelReport,
    type HomepageFunnelEventRecord,
} from '../src/lib/homepage-funnel-report'

type QaCase = {
    name: string
    visitorId: string
    landingPathWithQuery: string
    referrer: string
    userAgent: string
    expected: {
        utm_source: string
        utm_medium: string
        utm_campaign: string
    }
}

const ORIGIN = 'https://smartprintai.com'

const QA_CASES: QaCase[] = [
    {
        name: 'Meta paid social (canonical)',
        visitorId: 'qa_meta_001',
        landingPathWithQuery: '/?utm_source=meta&utm_medium=paid_social&utm_campaign=social_conversion_us_creators_drop1_2026_03',
        referrer: 'https://instagram.com/smartprintai',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        expected: {
            utm_source: 'meta',
            utm_medium: 'paid_social',
            utm_campaign: 'social_conversion_us_creators_drop1_2026_03',
        },
    },
    {
        name: 'Google paid search (canonical)',
        visitorId: 'qa_google_001',
        landingPathWithQuery: '/?utm_source=google&utm_medium=paid_search&utm_campaign=search_conversion_us_intent_high_2026_03',
        referrer: 'https://google.com/search?q=ai+print+on+demand',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        expected: {
            utm_source: 'google',
            utm_medium: 'paid_search',
            utm_campaign: 'search_conversion_us_intent_high_2026_03',
        },
    },
    {
        name: 'TikTok paid social (canonical)',
        visitorId: 'qa_tiktok_001',
        landingPathWithQuery: '/?utm_source=tiktok&utm_medium=paid_social&utm_campaign=social_conversion_us_genz_hook1_2026_03',
        referrer: 'https://tiktok.com/@smartprintai',
        userAgent: 'Mozilla/5.0 (Linux; Android 14)',
        expected: {
            utm_source: 'tiktok',
            utm_medium: 'paid_social',
            utm_campaign: 'social_conversion_us_genz_hook1_2026_03',
        },
    },
    {
        name: 'X organic social (canonical)',
        visitorId: 'qa_x_001',
        landingPathWithQuery: '/?utm_source=x&utm_medium=organic_social&utm_campaign=social_awareness_global_launch_2026_03',
        referrer: 'https://x.com/smartprintai',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)',
        expected: {
            utm_source: 'x',
            utm_medium: 'organic_social',
            utm_campaign: 'social_awareness_global_launch_2026_03',
        },
    },
    {
        name: 'Alias normalization facebook/twitter/cpc',
        visitorId: 'qa_alias_001',
        landingPathWithQuery: '/?utm_source=facebook&utm_medium=cpc&utm_campaign=Social Conversion Us Alias Check 2026 03',
        referrer: 'https://twitter.com/smartprintai',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)',
        expected: {
            utm_source: 'meta',
            utm_medium: 'paid_search',
            utm_campaign: 'social_conversion_us_alias_check_2026_03',
        },
    },
]

function toNowIso(index: number): string {
    return new Date(Date.now() + (index * 1_000)).toISOString()
}

function makeRecord(params: {
    eventName: HomepageFunnelEventRecord['eventName']
    eventParams: Record<string, unknown>
    path: string
    pageVariant: string
    userAgent: string
    createdAt: string
}): HomepageFunnelEventRecord {
    return {
        eventName: params.eventName,
        params: params.eventParams,
        path: params.path,
        pageVariant: params.pageVariant,
        locale: 'en',
        userAgent: params.userAgent,
        deviceType: 'unknown',
        createdAt: params.createdAt,
    }
}

function assertCondition(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(message)
    }
}

function summarizeBucket(rows: Array<{ value: string; homepageViews?: number; createPageViews?: number }>): string {
    if (rows.length === 0) {
        return 'none'
    }
    return rows
        .map((row) => {
            const count = typeof row.homepageViews === 'number'
                ? row.homepageViews
                : (row.createPageViews || 0)
            return `${row.value}:${count}`
        })
        .join(', ')
}

async function main() {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'spai-attribution-qa-'))
    const logPath = path.join(tempDir, 'events.jsonl')
    const records: HomepageFunnelEventRecord[] = []

    QA_CASES.forEach((testCase, index) => {
        const landingUrl = new URL(testCase.landingPathWithQuery, ORIGIN)
        const attribution = buildAttributionContext({
            visitorId: testCase.visitorId,
            search: landingUrl.search,
            pathname: landingUrl.pathname,
            referrer: testCase.referrer,
            origin: ORIGIN,
            userAgent: testCase.userAgent,
        })
        const normalized = normalizeAttributionFromParams(attribution)

        assertCondition(
            normalized.utm_source === testCase.expected.utm_source,
            `[${testCase.name}] expected utm_source=${testCase.expected.utm_source}, got ${normalized.utm_source}`
        )
        assertCondition(
            normalized.utm_medium === testCase.expected.utm_medium,
            `[${testCase.name}] expected utm_medium=${testCase.expected.utm_medium}, got ${normalized.utm_medium}`
        )
        assertCondition(
            normalized.utm_campaign === testCase.expected.utm_campaign,
            `[${testCase.name}] expected utm_campaign=${testCase.expected.utm_campaign}, got ${normalized.utm_campaign}`
        )

        const baseParams = {
            ...attribution,
        }

        records.push(
            makeRecord({
                eventName: 'homepage_viewed',
                eventParams: baseParams,
                path: landingUrl.pathname,
                pageVariant: 'variant_a',
                userAgent: testCase.userAgent,
                createdAt: toNowIso(index),
            }),
            makeRecord({
                eventName: 'homepage_to_create_clicked',
                eventParams: {
                    ...baseParams,
                    cta_location: 'hero_primary_create',
                    destination: '/create',
                },
                path: landingUrl.pathname,
                pageVariant: 'variant_a',
                userAgent: testCase.userAgent,
                createdAt: toNowIso(index + 20),
            }),
            makeRecord({
                eventName: 'create_flow_started',
                eventParams: {
                    ...baseParams,
                    entrypoint: 'homepage',
                    referrer_path: '/',
                },
                path: '/create',
                pageVariant: 'variant_a',
                userAgent: testCase.userAgent,
                createdAt: toNowIso(index + 40),
            }),
            makeRecord({
                eventName: 'create_page_viewed',
                eventParams: {
                    ...baseParams,
                    entrypoint: 'homepage',
                    referrer_path: '/',
                },
                path: '/create',
                pageVariant: 'variant_a',
                userAgent: testCase.userAgent,
                createdAt: toNowIso(index + 60),
            }),
            makeRecord({
                eventName: 'create_prompt_started',
                eventParams: {
                    ...baseParams,
                    entrypoint: 'homepage',
                    prompt_length_bucket: '11_30',
                },
                path: '/create',
                pageVariant: 'variant_a',
                userAgent: testCase.userAgent,
                createdAt: toNowIso(index + 80),
            }),
            makeRecord({
                eventName: 'create_generation_started',
                eventParams: {
                    ...baseParams,
                    entrypoint: 'homepage',
                    prompt_length_bucket: '11_30',
                    template_type: 'artistic',
                    has_reference_image: false,
                },
                path: '/create',
                pageVariant: 'variant_a',
                userAgent: testCase.userAgent,
                createdAt: toNowIso(index + 100),
            }),
        )
    })

    await writeFile(logPath, `${records.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8')

    const homepageReport = await buildHomepageFunnelReport(logPath)
    const createReport = await buildCreateEntryFunnelReport(logPath)

    QA_CASES.forEach((testCase) => {
        const homepageBucket = homepageReport.attributionBreakdown.utmSource.find(
            (row) => row.value === testCase.expected.utm_source
        )
        assertCondition(
            !!homepageBucket && homepageBucket.homepageViews >= 1,
            `[${testCase.name}] homepage bucket missing for ${testCase.expected.utm_source}`
        )

        const createBucket = createReport.attributionBreakdown.utmSource.find(
            (row) => row.value === testCase.expected.utm_source
        )
        assertCondition(
            !!createBucket && createBucket.createPageViews >= 1,
            `[${testCase.name}] create bucket missing for ${testCase.expected.utm_source}`
        )
    })

    const noisyHomepageBuckets = homepageReport.attributionBreakdown.utmSource.filter((row) =>
        row.value === 'unknown' || row.value === 'direct' || row.value === 'internal'
    )
    const noisyHomepageViews = noisyHomepageBuckets.reduce((sum, row) => sum + row.homepageViews, 0)
    assertCondition(
        noisyHomepageViews === 0,
        `Tagged QA traffic leaked into fallback homepage buckets: ${summarizeBucket(noisyHomepageBuckets)}`
    )

    const noisyCreateBuckets = createReport.attributionBreakdown.utmSource.filter((row) =>
        row.value === 'unknown' || row.value === 'direct' || row.value === 'internal'
    )
    const noisyCreateViews = noisyCreateBuckets.reduce((sum, row) => sum + row.createPageViews, 0)
    assertCondition(
        noisyCreateViews === 0,
        `Tagged QA traffic leaked into fallback create buckets: ${summarizeBucket(noisyCreateBuckets)}`
    )

    console.log('SmartPrintAI Attribution QA (Controlled Tagged Pass)')
    console.log(`Cases validated: ${QA_CASES.length}`)
    for (const testCase of QA_CASES) {
        console.log(`- ${testCase.name}: source=${testCase.expected.utm_source}, medium=${testCase.expected.utm_medium}, campaign=${testCase.expected.utm_campaign}`)
    }
    console.log('')
    console.log('Homepage utm_source buckets:', summarizeBucket(homepageReport.attributionBreakdown.utmSource))
    console.log('Create utm_source buckets:', summarizeBucket(createReport.attributionBreakdown.utmSource))
    console.log('Result: PASS (tagged traffic stayed out of unknown/direct/internal buckets)')
}

void main().catch((error) => {
    console.error('SmartPrintAI Attribution QA failed')
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
})
