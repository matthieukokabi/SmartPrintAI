const PRINTFUL_BASE = 'https://api.printful.com'
const DEFAULT_MOCKUP_POLL_ATTEMPTS = 12
const DEFAULT_MOCKUP_POLL_INTERVAL_MS = 1500

type MockupRecord = { mockup_url: string }
type ProductFileRecord = { type?: string | null }

type MockupTaskResult = {
    status?: string
    mockups?: MockupRecord[]
    task_key?: string
}

type ProductResponse = {
    product?: {
        files?: ProductFileRecord[]
    }
}

type PrintfulOrderItemOption = {
    id: string
    value: string
}

const IGNORED_MOCKUP_PLACEMENTS = new Set(['mockup'])

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
        const placementCandidates = await this.getPlacementCandidates(
            params.productId,
            params.placement
        )
        let lastError: unknown

        for (const placement of placementCandidates) {
            try {
                const create = await this.post<MockupTaskResult>(
                    `/mockup-generator/create-task/${params.productId}`,
                    {
                        variant_ids: [params.productVariantId],
                        format: 'jpg',
                        files: [
                            {
                                placement,
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

                    if (
                        task.status === 'completed' &&
                        Array.isArray(task.mockups) &&
                        task.mockups.length > 0
                    ) {
                        return { mockups: task.mockups }
                    }

                    if (task.status === 'failed') {
                        throw new Error(`Printful mockup task failed for placement: ${placement}`)
                    }
                }

                throw new Error(`Printful mockup task timed out for placement: ${placement}`)
            } catch (error) {
                lastError = error
                if (!this.isInvalidPlacementError(error)) {
                    throw error
                }
            }
        }

        if (lastError instanceof Error) {
            throw lastError
        }
        throw new Error('Printful mockup failed for all placement candidates')
    }

    private async getPlacementCandidates(productId: number, preferredPlacement?: string): Promise<string[]> {
        const candidates: string[] = []
        const pushUnique = (value?: string | null) => {
            if (!value) return
            const placement = value.trim()
            if (!placement || candidates.includes(placement)) return
            if (IGNORED_MOCKUP_PLACEMENTS.has(placement)) return
            candidates.push(placement)
        }

        pushUnique(preferredPlacement)
        pushUnique('front')
        pushUnique('default')

        try {
            const product = await this.get<ProductResponse>(`/products/${productId}`)
            for (const file of product.product?.files ?? []) {
                pushUnique(file.type)
            }
        } catch {
            // fallback candidates above are sufficient if product metadata call fails
        }

        return candidates.length > 0 ? candidates : ['front']
    }

    private isInvalidPlacementError(error: unknown): boolean {
        if (!(error instanceof Error)) return false
        return error.message.includes('"api_error_code":"MG-4"')
    }

    private isMissingStitchColorError(error: unknown): boolean {
        if (!(error instanceof Error)) return false
        return error.message.toLowerCase().includes('stitch_color')
    }

    private ensureStitchColorOption(options: PrintfulOrderItemOption[] = []): PrintfulOrderItemOption[] {
        const normalized = options
            .filter(option => option.id.trim().length > 0 && option.value.trim().length > 0)
            .map(option => ({ id: option.id.trim(), value: option.value.trim() }))

        if (normalized.some(option => option.id === 'stitch_color')) {
            return normalized
        }

        return [...normalized, { id: 'stitch_color', value: 'white' }]
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
            options?: PrintfulOrderItemOption[]
        }>
    }) {
        const buildPayload = (
            itemTransformer?: (item: {
                variantId: number
                quantity: number
                imageUrl: string
                options?: PrintfulOrderItemOption[]
            }) => {
                variantId: number
                quantity: number
                imageUrl: string
                options?: PrintfulOrderItemOption[]
            }
        ) => ({
            recipient: {
                name: params.shippingAddress.name,
                address1: params.shippingAddress.address1,
                city: params.shippingAddress.city,
                state_code: params.shippingAddress.state_code,
                country_code: params.shippingAddress.country_code,
                zip: params.shippingAddress.zip,
                email: params.email,
            },
            items: params.items.map((rawItem) => {
                const item = itemTransformer ? itemTransformer(rawItem) : rawItem
                return {
                    variant_id: item.variantId,
                    quantity: item.quantity,
                    files: [{ type: 'default', url: item.imageUrl }],
                    ...(item.options && item.options.length > 0 ? { options: item.options } : {}),
                }
            }),
        })

        try {
            return await this.post('/orders', buildPayload())
        } catch (error) {
            if (!this.isMissingStitchColorError(error)) {
                throw error
            }

            return this.post(
                '/orders',
                buildPayload((item) => ({
                    ...item,
                    options: this.ensureStitchColorOption(item.options),
                }))
            )
        }
    }
}

export const printful = new PrintfulClient()
