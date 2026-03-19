import { describe, expect, it, vi } from 'vitest'
import { isGootenPreviewUrl, waitForRemoteImageAvailability } from './remote-image'

function mockResponse(status: number, contentType: string | null = null): {
    ok: boolean
    status: number
    headers: { get(name: string): string | null }
} {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: {
            get(name: string) {
                if (name.toLowerCase() !== 'content-type') {
                    return null
                }
                return contentType
            },
        },
    }
}

describe('remote image availability', () => {
    it('accepts gooten preview URLs served from amazon s3', () => {
        expect(
            isGootenPreviewUrl(
                'https://s3.amazonaws.com/gooten-imgmanip/live/preview/4a2ebd3a-0d36-4bb1-982c-cfda2392250f/x.png'
            )
        ).toBe(true)
        expect(isGootenPreviewUrl('https://files.cdn.printful.com/mockup.png')).toBe(false)
    })

    it('returns ready on first successful image HEAD response', async () => {
        const fetchImpl = vi.fn().mockResolvedValue(mockResponse(200, 'image/png'))
        const sleepImpl = vi.fn().mockResolvedValue(undefined)

        const result = await waitForRemoteImageAvailability(
            'https://s3.amazonaws.com/gooten-imgmanip/live/preview/test.png',
            { fetchImpl, sleepImpl, maxAttempts: 3, delayMs: 10 }
        )

        expect(result).toEqual({
            ready: true,
            attempts: 1,
            lastStatus: 200,
            lastContentType: 'image/png',
        })
        expect(fetchImpl).toHaveBeenCalledTimes(1)
        expect(sleepImpl).not.toHaveBeenCalled()
    })

    it('retries transient non-image states until preview is ready', async () => {
        const fetchImpl = vi
            .fn()
            .mockResolvedValueOnce(mockResponse(403, 'application/xml'))
            .mockResolvedValueOnce(mockResponse(200, 'image/png'))
        const sleepImpl = vi.fn().mockResolvedValue(undefined)

        const result = await waitForRemoteImageAvailability(
            'https://s3.amazonaws.com/gooten-imgmanip/live/preview/test.png',
            { fetchImpl, sleepImpl, maxAttempts: 3, delayMs: 10 }
        )

        expect(result).toEqual({
            ready: true,
            attempts: 2,
            lastStatus: 200,
            lastContentType: 'image/png',
        })
        expect(fetchImpl).toHaveBeenCalledTimes(2)
        expect(sleepImpl).toHaveBeenCalledTimes(1)
    })

    it('returns not-ready after retry budget is exhausted', async () => {
        const fetchImpl = vi
            .fn()
            .mockResolvedValueOnce(mockResponse(403, 'application/xml'))
            .mockResolvedValueOnce(mockResponse(403, 'application/xml'))
        const sleepImpl = vi.fn().mockResolvedValue(undefined)

        const result = await waitForRemoteImageAvailability(
            'https://s3.amazonaws.com/gooten-imgmanip/live/preview/test.png',
            { fetchImpl, sleepImpl, maxAttempts: 2, delayMs: 10 }
        )

        expect(result).toEqual({
            ready: false,
            attempts: 2,
            lastStatus: 403,
            lastContentType: 'application/xml',
        })
        expect(fetchImpl).toHaveBeenCalledTimes(2)
        expect(sleepImpl).toHaveBeenCalledTimes(1)
    })
})
