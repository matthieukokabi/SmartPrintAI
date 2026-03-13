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
        <section className="relative overflow-hidden py-24 sm:py-28">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--premium-spot-alt)/0.08),transparent_42%)]" />
            <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto mb-14 max-w-3xl text-center">
                    <div className="premium-chip inline-flex rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em]">
                        {copy.titleAccent}
                    </div>
                    <h2 className="mt-6 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                        {copy.titleLead} <span className="font-editorial text-gradient">{copy.titleAccent}</span>
                    </h2>
                    <p className="premium-muted mt-5 text-base leading-7">
                        {copy.subtitle}
                    </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                    {cards.map((card, index) => {
                        const featuredCard = index === 0 || index === 5

                        return (
                            <Link
                                key={card.id}
                                href={`/create?prompt=${encodeURIComponent(card.prompt)}`}
                                className={`group cursor-pointer ${featuredCard ? 'md:col-span-2 xl:col-span-2' : ''}`}
                            >
                                <div className="premium-panel overflow-hidden rounded-[2rem] p-3">
                                    <div className={`relative overflow-hidden rounded-[1.65rem] ${featuredCard ? 'aspect-[16/9]' : 'aspect-square'}`}>
                                        {card.imageUrl ? (
                                            <Image
                                                src={card.imageUrl}
                                                alt={card.prompt}
                                                fill
                                                sizes={featuredCard ? '(max-width: 1280px) 100vw, 48vw' : '(max-width: 768px) 45vw, 24vw'}
                                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                                unoptimized
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,hsl(var(--premium-spot)/0.22),transparent_42%),radial-gradient(circle_at_bottom_right,hsl(var(--premium-spot-alt)/0.18),transparent_46%),linear-gradient(180deg,hsl(var(--premium-surface-soft))_0%,transparent_100%)] p-5">
                                                <p className="premium-muted max-w-[14rem] text-center text-xs leading-5">
                                                    {copy.fallbackText}
                                                </p>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
                                        <div className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-white/85">
                                            {card.styleLabel}
                                        </div>
                                        <div className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/78">
                                            {card.audience}
                                        </div>
                                    </div>

                                    <div className="px-2 pb-2 pt-4">
                                        <p className="text-sm leading-6 text-[hsl(var(--premium-ink))]">
                                            &quot;{card.prompt}&quot;
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
