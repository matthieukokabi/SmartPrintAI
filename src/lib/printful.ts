const PRINTFUL_BASE = 'https://api.printful.com'
const DEFAULT_MOCKUP_POLL_ATTEMPTS = 12
const DEFAULT_MOCKUP_POLL_INTERVAL_MS = 1500

type MockupRecord = { mockup_url: string }

type MockupTaskResult = {
    status?: string
    mockups?: MockupRecord[]
    task_key?: string
}

class PrintfulClient {
    private headers: Record<string, string>

    constructor() {
        this.headers = {
            'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
            'Content-Type': 'application/json',
        }
    }

    async get<T>(path: string): Promise<T> {
        const res = await fetch(`${PRINTFUL_BASE}${path}`, { headers: this.headers })
        if (!res.ok) throw new Error(`Printful API error: ${res.status} ${await res.text()}`)
        const data = await res.json()
        return data.result
    }

    async post<T>(path: string, body: unknown): Promise<T> {
        const res = await fetch(`${PRINTFUL_BASE}${path}`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error(`Printful API error: ${res.status} ${await res.text()}`)
        const data = await res.json()
        return data.result
    }

    async generateMockup(params: {
        productId: number
        productVariantId: number
        imageUrl: string
        placement?: string
    }) {
        const create = await this.post<MockupTaskResult>(
            `/mockup-generator/create-task/${params.productId}`,
            {
                variant_ids: [params.productVariantId],
                format: 'jpg',
                files: [
                    {
                        placement: params.placement || 'front',
                        image_url: params.imageUrl,
                        position: {
                            area_width: 1800,
                            area_height: 2100,
                            width: 1800,
                            height: 1800,
                            top: 150,
                            left: 0,
                        },
                    },
                ],
            }
        )

        if (Array.isArray(create.mockups) && create.mockups.length > 0) {
            return { mockups: create.mockups }
        }

        const taskKey = create.task_key
        if (!taskKey) {
            throw new Error('Printful mockup task key missing')
        }

        for (let attempt = 0; attempt < DEFAULT_MOCKUP_POLL_ATTEMPTS; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, DEFAULT_MOCKUP_POLL_INTERVAL_MS))
            const task = await this.get<MockupTaskResult>(
                `/mockup-generator/task?task_key=${encodeURIComponent(taskKey)}`
            )

            if (task.status === 'completed' && Array.isArray(task.mockups) && task.mockups.length > 0) {
                return { mockups: task.mockups }
            }

            if (task.status === 'failed') {
                throw new Error('Printful mockup task failed')
            }
        }

        throw new Error('Printful mockup task timed out')
    }

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
            variantId: number
            quantity: number
            imageUrl: string
        }>
    }) {
        return this.post('/orders', {
            recipient: {
                name: params.shippingAddress.name,
                address1: params.shippingAddress.address1,
                city: params.shippingAddress.city,
                state_code: params.shippingAddress.state_code,
                country_code: params.shippingAddress.country_code,
                zip: params.shippingAddress.zip,
                email: params.email,
            },
            items: params.items.map(item => ({
                variant_id: item.variantId,
                quantity: item.quantity,
                files: [{ type: 'default', url: item.imageUrl }],
            })),
        })
    }
}

export const printful = new PrintfulClient()
