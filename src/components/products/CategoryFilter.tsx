import Link from 'next/link'

const CATEGORIES = [
    'All',
    'T-Shirts & Tops',
    'Hoodies & Sweatshirts',
    'Bottoms',
    'Dresses',
    'Swimwear',
    'Sportswear',
    'Accessories',
    'Home & Decor',
    'Kids',
] as const

export default function CategoryFilter({ selected }: { selected: string | null }) {
    return (
        <nav aria-label="Product categories" className="flex flex-wrap gap-2 justify-center mb-8">
            {CATEGORIES.map((cat) => {
                const isActive = cat === 'All' ? !selected : selected === cat
                const href = cat === 'All' ? '/products' : `/products?category=${encodeURIComponent(cat)}`
                return (
                    <Link
                        key={cat}
                        href={href}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                            isActive
                                ? 'bg-purple-500/30 text-purple-200 border border-purple-400/60'
                                : 'glass text-muted-foreground hover:text-purple-200 hover:border-purple-400/40'
                        }`}
                    >
                        {cat}
                    </Link>
                )
            })}
        </nav>
    )
}
