import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'

interface SampleDesignsCopy {
    titleLead: string
    titleAccent: string
    subtitle: string
    fallbackText: string
}

const defaultCopy: SampleDesignsCopy = {
    titleLead: "See What's",
    titleAccent: 'Possible',
    subtitle: '8 trending prompt ideas inspired by what buyers love. Tap any to reuse it.',
    fallbackText: 'Showcase image is being prepared',
}

const curatedShowcase = [
    {
        id: 'cat-pop',
        prompt: 'Vibrant pop-art cat portrait with halftone texture, neon splashes, centered composition, clean t-shirt graphic',
        styleLabel: 'Pop Art',
        audience: 'Cat Lovers',
    },
    {
        id: 'frenchie-funny',
        prompt: 'Funny little French bulldog wearing sunglasses and a bucket hat, playful cartoon sticker style, bright colors',
        styleLabel: 'Cartoon',
        audience: 'Frenchie Fans',
    },
    {
        id: 'dog-retro',
        prompt: 'Golden retriever smiling in retro 90s sunset stripes, vintage distressed print look, bold and friendly',
        styleLabel: 'Artistic',
        audience: 'Dog Lovers',
    },
    {
        id: 'geisha-watercolor',
        prompt: 'Elegant geisha-inspired portrait with cherry blossoms and lantern glow, watercolor and ink illustration',
        styleLabel: 'Watercolor',
        audience: 'Asian Art',
    },
    {
        id: 'koi-minimal',
        prompt: 'Minimalist koi fish yin-yang circle, Japanese tattoo inspired line art, black and red print style',
        styleLabel: 'Minimalist',
        audience: 'Tattoo Style',
    },
    {
        id: 'boho-celestial',
        prompt: 'Boho celestial moon and stars with subtle constellation details, clean line art for premium tee print',
        styleLabel: 'Minimalist',
        audience: 'Mystic Vibe',
    },
    {
        id: 'wildflower-bloom',
        prompt: 'Hand-painted wildflower bouquet with soft pastel tones and handwritten text Bloom at your pace',
        styleLabel: 'Watercolor',
        audience: 'Floral Trend',
    },
    {
        id: 'mountain-badge',
        prompt: 'Retro mountain adventure badge with pine trees and sunrise, national park poster style t-shirt graphic',
        styleLabel: 'Artistic',
        audience: 'Outdoor Style',
    },
]

interface SampleDesignsProps {
    copy?: SampleDesignsCopy
}

export default async function SampleDesigns({ copy = defaultCopy }: SampleDesignsProps) {
    const seededDesigns = await prisma.design.findMany({
        where: {
            status: 'ready',
            prompt: {
                in: curatedShowcase.map((item) => item.prompt),
            },
            imageUrl: { not: '' },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
            id: true,
            prompt: true,
            imageUrl: true,
        },
    })

    const designByPrompt = new Map<string, { id: string; imageUrl: string }>()
    for (const design of seededDesigns) {
        if (!designByPrompt.has(design.prompt) && design.imageUrl.startsWith('http') && !design.imageUrl.includes('localhost')) {
            designByPrompt.set(design.prompt, { id: design.id, imageUrl: design.imageUrl })
        }
    }

    const cards = curatedShowcase.map((item) => ({
        ...item,
        imageUrl: designByPrompt.get(item.prompt)?.imageUrl || null,
    }))

    return (
        <section className="py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent" />
            <div className="max-w-7xl mx-auto px-4 relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                        {copy.titleLead} <span className="text-gradient">{copy.titleAccent}</span>
                    </h2>
                    <p className="text-muted-foreground max-w-lg mx-auto">
                        {copy.subtitle}
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    {cards.map((card) => {
                        return (
                            <Link
                                key={card.id}
                                href={`/create?prompt=${encodeURIComponent(card.prompt)}`}
                                className="group cursor-pointer"
                            >
                                <div className="aspect-square rounded-2xl bg-gradient-to-br from-purple-600/50 via-pink-600/35 to-cyan-500/50 p-0.5 mb-3">
                                    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-background/90">
                                        {card.imageUrl ? (
                                            <Image
                                                src={card.imageUrl}
                                                alt={card.prompt}
                                                fill
                                                sizes="(max-width: 768px) 45vw, 24vw"
                                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                unoptimized
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.25),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,0.2),transparent_45%)] flex items-center justify-center p-4">
                                                <p className="text-xs text-center text-muted-foreground/90">
                                                    {copy.fallbackText}
                                                </p>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
                                        <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-black/60 text-[10px] uppercase tracking-wide text-purple-200">
                                            {card.styleLabel}
                                        </div>
                                        <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/50 text-[10px] text-white/80">
                                            {card.audience}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-center px-1">
                                    <p className="text-xs text-foreground/90 line-clamp-2">
                                        &quot;{card.prompt}&quot;
                                    </p>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
