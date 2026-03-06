const PRINTFUL_BASE = 'https://api.printful.com'

class PrintfulClient {
    private headers: Record<string, string>

    constructor() {
        this.headers = {
            Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
            'Content-Type': 'application/json',
            'X-PF-Store-Id': process.env.PRINTFUL_STORE_ID || '',
        }
    }

    async get<T>(path: string): Promise<T> {
        const res = await fetch(`${PRINTFUL_BASE}${path}`, { headers: this.headers })
        if (!res.ok) throw new Error(`Printful API error: ${res.status} ${await res.text()}`)
        const data = await res.json()
        return data.result ?? data.data ?? data
    }

    async post<T>(path: string, body: unknown): Promise<T> {
        const res = await fetch(`${PRINTFUL_BASE}${path}`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error(`Printful API error: ${res.status} ${await res.text()}`)
        const data = await res.json()
        return data.result ?? data.data ?? data
    }

    // V2: Create mockup generation task
    async createMockupTask(params: {
        productId: number
        variantIds: number[]
        imageUrl: string
        placement?: string
    }) {
        return this.post<{ task_key: string; status: string }>(
            '/v2/mockup-generator/tasks',
            {
                product_id: params.productId,
                variant_ids: params.variantIds,
                format: 'jpg',
                designs: [
                    {
                        placement: params.placement || 'front',
                        image_url: params.imageUrl,
                        type: 'image/png',
                    },
                ],
            }
        )
    }

    // V2: Poll mockup task for result
    async getMockupTask(taskKey: string) {
        return this.get<{
            status: string
            mockups?: Array<{ placement: string; variant_ids: number[]; mockup_url: string }>
        }>(`/v2/mockup-generator/tasks?task_key=${taskKey}`)
    }

    // V2: Wait for mockup to complete (poll with timeout)
    async waitForMockup(taskKey: string, timeoutMs = 30000): Promise<string> {
        const startTime = Date.now()
        while (Date.now() - startTime < timeoutMs) {
            const result = await this.getMockupTask(taskKey)
            if (result.status === 'completed' && result.mockups?.length) {
                return result.mockups[0].mockup_url
            }
            if (result.status === 'failed') {
                throw new Error('Mockup generation failed')
            }
            await new Promise((r) => setTimeout(r, 2000))
        }
        throw new Error('Mockup generation timed out')
    }

    // V2: Get catalog products
    async getProducts() {
        return this.get<any[]>('/v2/catalog/products')
    }

    // V2: Get product variants
    async getProductVariants(productId: number) {
        return this.get<any[]>(`/v2/catalog/products/${productId}/variants`)
    }

    // V2: Create order (draft)
    async createOrder(params: {
        email: string
        shippingAddress: {
            name: string
            address1: string
            city: string
            state_code: string
            country_code: string
            zip: string
        }
        items: Array<{
            catalogVariantId: number
            quantity: number
            imageUrl: string
            placement?: string
        }>
    }) {
        return this.post('/v2/orders', {
            recipient: {
                name: params.shippingAddress.name,
                address1: params.shippingAddress.address1,
                city: params.shippingAddress.city,
                state_code: params.shippingAddress.state_code,
                country_code: params.shippingAddress.country_code,
                zip: params.shippingAddress.zip,
                email: params.email,
            },
            order_items: params.items.map((item) => ({
                source: 'catalog',
                catalog_variant_id: item.catalogVariantId,
                quantity: item.quantity,
                designs: [
                    {
                        placement: item.placement || 'front',
                        layers: [{ type: 'file', url: item.imageUrl }],
                    },
                ],
            })),
        })
    }

    // V2: Confirm an order
    async confirmOrder(orderId: string) {
        return this.post(`/v2/orders/${orderId}/confirm`, {})
    }

    // V2: Upload file
    async uploadFile(imageUrl: string) {
        return this.post<{ id: number; url: string }>('/v2/files', {
            url: imageUrl,
        })
    }
}

export const printful = new PrintfulClient()
