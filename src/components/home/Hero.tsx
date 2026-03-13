'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Package, Shirt, Sparkles, Wand2 } from 'lucide-react'
import RevealOnScroll from '@/components/home/RevealOnScroll'

type HeroCopy = {
    badge: string
    titleLead: string
    titleAccent: string
    titleTail: string
    subtitle: string
    inputPlaceholder: string
    createButton: string
    samplePrompts: string[]
}

const defaultCopy: HeroCopy = {
    badge: 'AI-Powered Custom Print On Demand',
    titleLead: 'Describe it.',
    titleAccent: 'AI creates it.',
    titleTail: 'We print it.',
    subtitle:
        'Turn your words into stunning custom products. T-shirts, hoodies, mugs, canvas - all designed by AI in seconds. No design skills needed.',
    inputPlaceholder: 'Describe your design... (e.g., a cosmic cat in a space helmet)',
    createButton: 'Create',
    samplePrompts: [
        'A golden retriever wearing sunglasses, pop art style',
        'Japanese cherry blossoms at sunset, watercolor',
        'Geometric wolf in neon colors',
        'Vintage Van Gogh style starry night over a city',
    ],
}

interface HeroProps {
    copy?: HeroCopy
}

export default function Hero({ copy = defaultCopy }: HeroProps) {
    const [prompt, setPrompt] = useState('')
    const router = useRouter()
    const activePrompt = prompt.trim() || copy.samplePrompts[0]

    const handleCreate = () => {
        if (prompt.trim()) {
            router.push(`/create?prompt=${encodeURIComponent(prompt.trim())}`)
        } else {
            router.push('/create')
        }
    }

    return (
        <section className="relative overflow-hidden pb-20 pt-8 sm:pb-24 sm:pt-10 lg:pb-28">
            <div className="premium-gridFade absolute inset-0" />
            <div className="absolute left-[8%] top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,hsl(var(--premium-spot)/0.18),transparent_68%)] blur-3xl" />
            <div className="absolute bottom-0 right-[8%] h-80 w-80 rounded-full bg-[radial-gradient(circle,hsl(var(--premium-spot-alt)/0.18),transparent_70%)] blur-3xl" />

            <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <RevealOnScroll>
                    <div className="mx-auto max-w-4xl text-center">
                        <div className="premium-chip inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em]">
                            <Sparkles className="h-3.5 w-3.5" />
                            {copy.badge}
                        </div>

                        <h1 className="mx-auto mt-8 max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.05em] sm:text-6xl lg:text-7xl xl:text-[5.5rem]">
                            <span className="block">{copy.titleLead}</span>
                            <span className="font-editorial text-gradient block">{copy.titleAccent}</span>
                            <span className="block">{copy.titleTail}</span>
                        </h1>

                        <p className="premium-muted mx-auto mt-6 max-w-2xl text-base leading-7 sm:text-lg sm:leading-8">
                            {copy.subtitle}
                        </p>
                    </div>
                </RevealOnScroll>

                <div className="mt-12 grid gap-6 xl:grid-cols-[0.82fr_1.18fr] xl:items-start">
                    <RevealOnScroll direction="left">
                        <div className="premium-panel rounded-[2.2rem] p-4 sm:p-5">
                            <div className="premium-inputShell flex flex-col overflow-hidden rounded-[1.65rem] p-2 shadow-[0_14px_38px_-26px_rgba(0,0,0,0.45)] sm:flex-row sm:items-center">
                                <input
                                    type="text"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                    placeholder={copy.inputPlaceholder}
                                    className="premium-input min-h-[3.75rem] flex-1 px-4 text-base outline-none sm:px-5"
                                />
                                <button
                                    onClick={handleCreate}
                                    className="premium-primaryButton inline-flex items-center justify-center gap-2 rounded-[1.3rem] px-5 py-3 text-sm font-semibold transition-transform duration-300 sm:px-6"
                                >
                                    {copy.createButton}
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="mt-4 grid gap-2">
                                {copy.samplePrompts.map((sample, index) => (
                                    <button
                                        key={sample}
                                        onClick={() => setPrompt(sample)}
                                        className={`premium-chip rounded-full px-4 py-2.5 text-left text-xs leading-5 transition-colors hover:text-[hsl(var(--premium-ink))] ${index === 0 ? 'text-[hsl(var(--premium-ink))]' : ''}`}
                                    >
                                        {sample}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </RevealOnScroll>

                    <RevealOnScroll direction="right" delayMs={90}>
                        <div className="premium-panel relative rounded-[2.4rem] p-5 sm:p-6">
                            <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--premium-line-strong))] to-transparent" />
                            <div className="premium-panel-soft rounded-[1.6rem] p-4 sm:p-5">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[hsl(var(--premium-muted))]">
                                        <Wand2 className="h-3.5 w-3.5" />
                                        {copy.createButton}
                                    </div>
                                    <div className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--premium-spot))]" />
                                </div>
                                <p className="mt-4 text-sm leading-6 text-[hsl(var(--premium-ink))] sm:text-[15px]">
                                    {activePrompt}
                                </p>
                            </div>

                            <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                                <div className="premium-panel-soft flex flex-col justify-between rounded-[1.8rem] p-4">
                                    <div className="rounded-[1.5rem] border border-[hsl(var(--premium-line)/0.6)] bg-[radial-gradient(circle_at_top,hsl(var(--premium-spot-alt)/0.18),transparent_58%),linear-gradient(160deg,hsl(var(--premium-surface))_0%,transparent_100%)] p-4">
                                        <div className="aspect-[5/4] rounded-[1.35rem] bg-[linear-gradient(180deg,hsl(var(--premium-surface-soft))_0%,transparent_100%),radial-gradient(circle_at_22%_22%,hsl(var(--premium-spot)/0.24),transparent_30%),radial-gradient(circle_at_76%_28%,hsl(var(--premium-spot-alt)/0.28),transparent_32%)]" />
                                    </div>
                                    <div className="mt-4 grid grid-cols-3 gap-2">
                                        <div className="h-3 rounded-full bg-[hsl(var(--premium-line))]" />
                                        <div className="h-3 rounded-full bg-[hsl(var(--premium-line-strong))]" />
                                        <div className="h-3 rounded-full bg-[hsl(var(--premium-line))]" />
                                    </div>
                                </div>

                                <div className="grid gap-4">
                                    <div className="premium-panel-soft flex aspect-square flex-col justify-between rounded-[1.6rem] p-4">
                                        <Shirt className="h-5 w-5 text-[hsl(var(--premium-spot-alt))]" />
                                        <div className="rounded-[1.4rem] border border-[hsl(var(--premium-line)/0.6)] bg-[linear-gradient(180deg,hsl(var(--premium-surface))_0%,transparent_100%),radial-gradient(circle_at_50%_15%,hsl(var(--premium-spot)/0.26),transparent_36%)] p-4">
                                            <div className="aspect-square rounded-[1.2rem] bg-[linear-gradient(145deg,hsl(var(--premium-surface-soft))_0%,transparent_100%)]" />
                                        </div>
                                    </div>

                                    <div className="premium-panel-soft flex min-h-[15rem] flex-col justify-between rounded-[1.6rem] p-4">
                                        <Package className="h-5 w-5 text-[hsl(var(--premium-spot))]" />
                                        <div className="space-y-3">
                                            {copy.samplePrompts.slice(1, 4).map((sample) => (
                                                <div
                                                    key={sample}
                                                    className="rounded-full border border-[hsl(var(--premium-line)/0.6)] px-3 py-2 text-[11px] leading-5 text-[hsl(var(--premium-muted))]"
                                                >
                                                    {sample}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </RevealOnScroll>
                </div>
            </div>
        </section>
    )
}
