import Link from 'next/link'
import Image from 'next/image'
import { Shirt } from 'lucide-react'

interface Props {
    id: string
    name: string
    sellPrice: number
    category: string
    imageUrl?: string
}

export default function ProductCard({ id, name, sellPrice, category, imageUrl }: Props) {
    const hasImage = Boolean(imageUrl?.trim())

    return (
        <Link
            href={`/products/${id}`}
            className="glass rounded-2xl p-6 hover:border-purple-500/20 transition-all duration-300 hover:-translate-y-1 group block"
        >
            <div className="relative aspect-square rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:bg-white/10 transition-colors overflow-hidden">
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
                    <Shirt className="w-12 h-12 text-muted-foreground group-hover:text-purple-400 transition-colors" />
                )}
            </div>
            <h3 className="font-semibold truncate">{name}</h3>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">{category}</p>
            <p className="text-sm text-purple-400 font-medium mt-2">${sellPrice.toFixed(2)}</p>
        </Link>
    )
}
