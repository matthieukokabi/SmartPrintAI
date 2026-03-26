import { isMockupEligibleProduct } from '@/lib/mockup-eligibility'
import { detectProductProvider } from '@/lib/product-provider'

type ProductLike = {
    printfulId?: string | null
    name?: string | null
    printArea?: unknown
}

export function isBlockedGootenReadyToBuyProduct(product: ProductLike): boolean {
    if (detectProductProvider(product.printfulId) !== 'gooten') {
        return false
    }

    return !isMockupEligibleProduct({
        name: product.name,
        printfulId: product.printfulId,
        printArea: product.printArea,
    })
}

export function splitBlockedGootenReadyToBuyProducts<T extends ProductLike>(products: T[]): {
    blocked: T[]
    sellable: T[]
} {
    const blocked: T[] = []
    const sellable: T[] = []

    for (const product of products) {
        if (isBlockedGootenReadyToBuyProduct(product)) {
            blocked.push(product)
            continue
        }
        sellable.push(product)
    }

    return { blocked, sellable }
}
