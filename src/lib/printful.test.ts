import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('Printful createOrder', () => {
    beforeEach(() => {
        vi.resetModules()
        process.env.PRINTFUL_API_KEY = 'pf_test_key'
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('retries with stitch_color option when Printful requires it', async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        code: 400,
                        result:
                            "Item 0: Item 'stitch_color' option missing or has an invalid value! Allowed values: white, black",
                    }),
                    { status: 400, headers: { 'content-type': 'application/json' } }
                )
            )
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        result: { id: 'pf_order_123' },
                    }),
                    { status: 200, headers: { 'content-type': 'application/json' } }
                )
            )

        vi.stubGlobal('fetch', fetchMock)

        const { printful } = await import('./printful')
        const result = await printful.createOrder({
            email: 'buyer@example.com',
            shippingAddress: {
                name: 'Buyer',
                address1: 'Main St 1',
                city: 'Zurich',
                state_code: 'ZH',
                country_code: 'CH',
                zip: '8000',
            },
            items: [
                {
                    variantId: 4568,
                    quantity: 1,
                    imageUrl: 'https://example.com/design.png',
                },
            ],
        })

        expect(result).toEqual({ id: 'pf_order_123' })
        expect(fetchMock).toHaveBeenCalledTimes(2)

        const retryPayload = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)
        expect(retryPayload.items[0].options).toEqual([{ id: 'stitch_color', value: 'white' }])
    })

    it('preserves existing printful options when provided', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    result: { id: 'pf_order_456' },
                }),
                { status: 200, headers: { 'content-type': 'application/json' } }
            )
        )
        vi.stubGlobal('fetch', fetchMock)

        const { printful } = await import('./printful')
        await printful.createOrder({
            email: 'buyer@example.com',
            shippingAddress: {
                name: 'Buyer',
                address1: 'Main St 1',
                city: 'Zurich',
                state_code: 'ZH',
                country_code: 'CH',
                zip: '8000',
            },
            items: [
                {
                    variantId: 4568,
                    quantity: 1,
                    imageUrl: 'https://example.com/design.png',
                    options: [{ id: 'stitch_color', value: 'black' }],
                },
            ],
        })

        const payload = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)
        expect(payload.items[0].options).toEqual([{ id: 'stitch_color', value: 'black' }])
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })
})
