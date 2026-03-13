import Link from 'next/link'
import Image from 'next/image'
import { Shirt } from 'lucide-react'

interface Props {
    id: string
    name: string
    sellPrice: number
    category: string
    imageUrl?: string
    href?: string
}

export default function ProductCard({ id, name, sellPrice, category, imageUrl, href }: Props) {
    const hasImage = Boolean(imageUrl?.trim())
    const productHref = href ?? `/products/${id}`

    return (
        <Link
            href={productHref}
            className="glass group block rounded-[1.75rem] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-foreground/10"
        >
            <div className="relative mb-4 aspect-square overflow-hidden rounded-[1.35rem] bg-secondary/55 transition-colors duration-300 group-hover:bg-secondary/80">
                {hasImage ? (
                    <Image
                        src={imageUrl!}
                        alt={name}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                    />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <Shirt className="h-12 w-12 text-muted-foreground transition-colors group-hover:text-[hsl(var(--brand-end))]" />
                    </div>
                )}
            </div>
            <h3 className="font-semibold truncate">{name}</h3>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">{category}</p>
            <p className="mt-2 text-sm font-medium text-[hsl(var(--brand-start))]">${sellPrice.toFixed(2)}</p>
        </Link>
    )
}
