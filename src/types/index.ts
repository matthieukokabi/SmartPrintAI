export interface Product {
    id: string
    name: string
    printfulId: string
    description: string
    category: string
    basePrice: number
    sellPrice: number
    sizes: string[]
    colors: ProductColor[]
    imageUrl: string
    printArea: { width: number; height: number; dpi: number }
    active: boolean
}

export interface ProductColor {
    name: string
    hex: string
    printfulVariantId: number
    previewImageUrl?: string | null
}

export interface Design {
    id: string
    userId?: string
    sessionId?: string
    prompt: string
    style: string
    imageUrl: string
    status: string
    createdAt: string
}

export interface Mockup {
    id: string
    designId: string
    productId: string
    color: string
    mockupUrl: string
}

export interface Order {
    id: string
    email: string
    status: string
    subtotal: number
    shippingCost: number
    total: number
    createdAt: string
    items: OrderItem[]
}

export interface OrderItem {
    id: string
    productId: string
    designId: string
    size: string
    color: string
    quantity: number
    price: number
}

export type DesignStyle = 'artistic' | 'watercolor' | 'cartoon' | 'minimalist' | 'pop-art' | 'photorealistic'

export const DESIGN_STYLES: { value: DesignStyle; label: string; emoji: string }[] = [
    { value: 'artistic', label: 'Artistic', emoji: '🎨' },
    { value: 'watercolor', label: 'Watercolor', emoji: '💧' },
    { value: 'cartoon', label: 'Cartoon', emoji: '✏️' },
    { value: 'minimalist', label: 'Minimalist', emoji: '⬜' },
    { value: 'pop-art', label: 'Pop Art', emoji: '💥' },
    { value: 'photorealistic', label: 'Photorealistic', emoji: '📷' },
]
