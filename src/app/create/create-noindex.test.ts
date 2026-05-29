import { beforeEach, describe, expect, it } from 'vitest'

import { generateMetadata as generateCreateMetadata } from '@/app/create/page'
import { generateMetadata as generateLocalizedCreateMetadata } from '@/app/[locale]/create/page'

function robotsIndex(metadata: { robots?: unknown }): boolean | undefined {
    if (typeof metadata.robots === 'object' && metadata.robots !== null) {
        return (metadata.robots as { index?: boolean }).index
    }
    return undefined
}

function robotsFollow(metadata: { robots?: unknown }): boolean | undefined {
    if (typeof metadata.robots === 'object' && metadata.robots !== null) {
        return (metadata.robots as { follow?: boolean }).follow
    }
    return undefined
}

describe('/create + /[locale]/create noindex parametric variants (GSC Soft 404 fix)', () => {
    beforeEach(() => {
        process.env.NEXT_PUBLIC_APP_URL = 'https://smartprintai.com'
    })

    it('/create with empty searchParams is indexable (canonical /create)', () => {
        const meta = generateCreateMetadata({ searchParams: {} })
        expect(meta.alternates?.canonical).toBe('/create')
        // No explicit robots.index=false → page is indexable.
        expect(robotsIndex(meta)).not.toBe(false)
    })

    it('/create?productId=X gets robots: index=false, follow=true', () => {
        const meta = generateCreateMetadata({ searchParams: { productId: 'cmnvmcegi0023aml2a43u5svs' } })
        expect(meta.alternates?.canonical).toBe('/create')
        expect(robotsIndex(meta)).toBe(false)
        expect(robotsFollow(meta)).toBe(true)
    })

    it('/fr/create with empty searchParams is indexable (canonical /fr/create)', () => {
        const meta = generateLocalizedCreateMetadata({ params: { locale: 'fr' }, searchParams: {} })
        expect(meta.alternates?.canonical).toBe('/fr/create')
        expect(robotsIndex(meta)).not.toBe(false)
    })

    it('/fr/create?utm_source=tiktok gets robots: index=false, follow=true', () => {
        const meta = generateLocalizedCreateMetadata({
            params: { locale: 'fr' },
            searchParams: { utm_source: 'tiktok' },
        })
        expect(meta.alternates?.canonical).toBe('/fr/create')
        expect(robotsIndex(meta)).toBe(false)
        expect(robotsFollow(meta)).toBe(true)
    })
})
