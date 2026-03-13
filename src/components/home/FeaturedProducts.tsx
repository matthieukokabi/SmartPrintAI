import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Shirt } from 'lucide-react'
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
        <section className="relative py-24 sm:py-28">
            <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 xl:grid-cols-[0.82fr_1.18fr] xl:items-start lg:px-8">
                <div className="xl:sticky xl:top-28 xl:self-start">
                    <div className="premium-chip inline-flex rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em]">
                        {copy.pricePrefix}
                    </div>
                    <h2 className="mt-6 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                        {copy.titleLead} <span className="font-editorial text-gradient">{copy.titleAccent}</span>
                    </h2>
                    <p className="premium-muted mt-5 max-w-md text-base leading-7">
                        {copy.subtitle}
                    </p>
                </div>

                {featured.length === 0 ? (
                    <div className="premium-panel rounded-[2rem] p-10 text-center">
                        <p className="premium-muted">{copy.emptyState}</p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {featured.map((product, index) => {
                            const isLeadCard = index === 0

                            return (
                                <Link
                                    key={product.id}
                                    href={`/products/${product.id}`}
                                    className={`premium-panel group overflow-hidden rounded-[2rem] transition-transform duration-300 hover:-translate-y-1 ${isLeadCard ? 'sm:col-span-2 lg:grid lg:grid-cols-[1.05fr_0.95fr]' : ''}`}
                                >
                                    <div className={`relative overflow-hidden ${isLeadCard ? 'aspect-[5/4] lg:aspect-auto lg:min-h-[24rem]' : 'aspect-[4/5]'}`}>
                                        {product.imageUrl ? (
                                            <Image
                                                src={product.imageUrl}
                                                alt={product.name}
                                                fill
                                                sizes={isLeadCard ? '(max-width: 1024px) 100vw, 42vw' : '(max-width: 768px) 50vw, 28vw'}
                                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                                unoptimized
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,hsl(var(--premium-spot)/0.18),transparent_58%),linear-gradient(180deg,hsl(var(--premium-surface-soft))_0%,transparent_100%)]">
                                                <Shirt className="h-10 w-10 text-[hsl(var(--premium-muted))]" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
                                    </div>

                                    <div className={`flex flex-col justify-between p-5 sm:p-6 ${isLeadCard ? 'gap-6' : 'gap-4'}`}>
                                        <div>
                                            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[hsl(var(--premium-muted))]">
                                                {copy.pricePrefix} ${product.sellPrice.toFixed(2)}
                                            </div>
                                            <h3 className={`mt-3 font-semibold tracking-[-0.03em] ${isLeadCard ? 'text-3xl sm:text-[2rem]' : 'text-xl'}`}>
                                                {product.name}
                                            </h3>
                                        </div>

                                        <div className="inline-flex items-center gap-2 text-sm font-medium text-[hsl(var(--premium-ink))]">
                                            <span className="sr-only">{product.name}</span>
                                            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </div>
        </section>
    )
}
