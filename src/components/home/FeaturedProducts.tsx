import Link from 'next/link'
import Image from 'next/image'
import { Shirt } from 'lucide-react'
import { prisma } from '@/lib/prisma'

interface FeaturedProductsCopy {
    titleLead: string
    titleAccent: string
    subtitle: string
    emptyState: string
    pricePrefix: string
}

const defaultCopy: FeaturedProductsCopy = {
    titleLead: 'Print On',
    titleAccent: 'Anything',
    subtitle: 'Your AI-generated designs on premium, high-quality products',
    emptyState: 'Products will appear here after catalog sync.',
    pricePrefix: 'from',
}

interface FeaturedProductsProps {
    copy?: FeaturedProductsCopy
}

export default async function FeaturedProducts({ copy = defaultCopy }: FeaturedProductsProps) {
    const featured = await prisma.product.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
        take: 6,
        select: {
            id: true,
            name: true,
            sellPrice: true,
            imageUrl: true,
        },
    })

    return (
        <section className="py-24">
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                        {copy.titleLead} <span className="text-gradient">{copy.titleAccent}</span>
                    </h2>
                    <p className="text-muted-foreground max-w-lg mx-auto">
                        {copy.subtitle}
                    </p>
                </div>

                {featured.length === 0 ? (
                    <div className="glass rounded-2xl p-10 text-center">
                        <p className="text-muted-foreground">{copy.emptyState}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {featured.map((product) => (
                            <Link
                                key={product.id}
                                href={`/products/${product.id}`}
                                className="glass rounded-2xl p-4 hover:border-purple-500/20 transition-all duration-300 hover:-translate-y-1 group"
                            >
                                <div className="relative aspect-square rounded-xl overflow-hidden bg-white/5 mb-4">
                                    {product.imageUrl ? (
                                        <Image
                                            src={product.imageUrl}
                                            alt={product.name}
                                            fill
                                            sizes="(max-width: 768px) 50vw, 33vw"
                                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                                            unoptimized
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Shirt className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                                <h3 className="font-semibold mb-1 truncate">{product.name}</h3>
                                <p className="text-sm text-purple-400 font-medium">{copy.pricePrefix} ${product.sellPrice.toFixed(2)}</p>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </section>
    )
}
