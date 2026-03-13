import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import RevealOnScroll from '@/components/home/RevealOnScroll'
import SectionHeader from '@/components/home/SectionHeader'
import { curatedShowcase } from '@/components/home/curatedShowcase'

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
                <RevealOnScroll>
                    <SectionHeader
                        titleLead={copy.titleLead}
                        titleAccent={copy.titleAccent}
                        subtitle={copy.subtitle}
                    />
                </RevealOnScroll>

                <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                    {cards.map((card, index) => {
                        const featuredCard = index === 0 || index === 5

                        return (
                            <RevealOnScroll
                                key={card.id}
                                direction={index % 2 === 0 ? 'left' : 'right'}
                                delayMs={index * 60}
                            >
                                <Link
                                    href={`/create?prompt=${encodeURIComponent(card.prompt)}`}
                                    className={`group block cursor-pointer ${featuredCard ? 'md:col-span-2 xl:col-span-2' : ''}`}
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
                            </RevealOnScroll>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
