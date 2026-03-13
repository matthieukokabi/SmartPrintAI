'use client'

import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { type LucideIcon, Package, Truck, Wand2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import RevealOnScroll from '@/components/home/RevealOnScroll'
import SectionHeader from '@/components/home/SectionHeader'
import { cn } from '@/lib/utils'

type StepCopy = {
    title: string
    description: string
}

interface HowItWorksStoryProps {
    copy: {
        titleLead: string
        titleAccent: string
        subtitle: string
        stepLabel: string
        steps: [StepCopy, StepCopy, StepCopy]
    }
    media: Array<{
        title: string
        imageUrl: string | null
    }>
}

const stepVisuals = [
    {
        icon: Wand2,
        gradient: 'from-orange-500 via-amber-400 to-sky-400',
    },
    {
        icon: Package,
        gradient: 'from-sky-500 via-cyan-400 to-orange-300',
    },
    {
        icon: Truck,
        gradient: 'from-orange-500 via-rose-400 to-indigo-400',
    },
]

export default function HowItWorksStory({ copy, media }: HowItWorksStoryProps) {
    const [activeStep, setActiveStep] = useState(0)
    const stepRefs = useRef<Array<HTMLElement | null>>([])

    const steps = copy.steps.map((step, index) => ({
        ...step,
        imageUrl: media[index]?.imageUrl ?? null,
        icon: stepVisuals[index].icon,
        gradient: stepVisuals[index].gradient,
    }))

    useEffect(() => {
        const nodes = stepRefs.current.filter((node): node is HTMLElement => node !== null)
        if (!nodes.length) return

        const observer = new IntersectionObserver(
            (entries) => {
                const visibleEntries = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)

                const bestEntry = visibleEntries[0]
                if (!bestEntry) return

                const nextIndex = Number((bestEntry.target as HTMLElement).dataset.stepIndex)
                if (Number.isNaN(nextIndex)) return
                setActiveStep((current) => (current === nextIndex ? current : nextIndex))
            },
            {
                threshold: [0.25, 0.45, 0.65],
                rootMargin: '-14% 0px -36% 0px',
            }
        )

        nodes.forEach((node) => observer.observe(node))

        return () => observer.disconnect()
    }, [steps.length])

    const activeStage = steps[activeStep] ?? steps[0]

    return (
        <section id="how-it-works" className="relative overflow-hidden py-24 sm:py-28">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,hsl(var(--premium-spot)/0.1),transparent_24%),radial-gradient(circle_at_82%_26%,hsl(var(--premium-spot-alt)/0.1),transparent_24%)]" />

            <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <RevealOnScroll>
                    <SectionHeader
                        titleLead={copy.titleLead}
                        titleAccent={copy.titleAccent}
                        subtitle={copy.subtitle}
                    />
                </RevealOnScroll>

                <div className="mt-14 grid gap-5 lg:hidden">
                    {steps.map((step, index) => (
                        <RevealOnScroll
                            key={step.title}
                            direction={index % 2 === 0 ? 'left' : 'right'}
                            delayMs={index * 90}
                        >
                            <article className="premium-panel overflow-hidden rounded-[2rem] p-4 sm:p-5">
                                <div className="relative overflow-hidden rounded-[1.7rem] border border-[hsl(var(--premium-line)/0.65)] bg-[radial-gradient(circle_at_top,hsl(var(--premium-spot)/0.16),transparent_45%),linear-gradient(180deg,hsl(var(--premium-surface))_0%,transparent_100%)] p-3">
                                    <div className="flex items-center justify-between gap-3 px-2 pb-3">
                                        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[hsl(var(--premium-muted))]">
                                            {copy.stepLabel} {index + 1}
                                        </div>
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-[1rem] bg-gradient-to-br ${step.gradient}`}>
                                            <step.icon className="h-4 w-4 text-white" />
                                        </div>
                                    </div>

                                    <div className="relative aspect-[4/3] overflow-hidden rounded-[1.35rem] bg-[linear-gradient(180deg,hsl(var(--premium-surface-soft))_0%,transparent_100%)]">
                                        {step.imageUrl ? (
                                            <>
                                                <Image
                                                    src={step.imageUrl}
                                                    alt={step.title}
                                                    fill
                                                    sizes="100vw"
                                                    className="object-cover"
                                                    unoptimized
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
                                            </>
                                        ) : (
                                            <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,hsl(var(--premium-spot)/0.22),transparent_24%),radial-gradient(circle_at_70%_30%,hsl(var(--premium-spot-alt)/0.18),transparent_28%),linear-gradient(180deg,hsl(var(--premium-surface-soft))_0%,transparent_100%)]">
                                                <step.icon className="h-10 w-10 text-[hsl(var(--premium-ink))]" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="px-2 pb-2 pt-5">
                                    <h3 className="text-2xl font-semibold tracking-[-0.03em]">{step.title}</h3>
                                    <p className="premium-muted mt-4 text-sm leading-7 sm:text-base">
                                        {step.description}
                                    </p>
                                </div>
                            </article>
                        </RevealOnScroll>
                    ))}
                </div>

                <div className="mt-16 hidden items-start gap-10 lg:grid lg:grid-cols-[0.84fr_1.16fr] xl:gap-16">
                    <div className="space-y-7 xl:space-y-8">
                        {steps.map((step, index) => {
                            const isActive = activeStep === index

                            return (
                                <RevealOnScroll
                                    key={step.title}
                                    direction="left"
                                    delayMs={index * 70}
                                >
                                    <article
                                        ref={(node) => {
                                            stepRefs.current[index] = node
                                        }}
                                        data-step-index={index}
                                        className={cn(
                                            'premium-panel relative min-h-[18rem] overflow-hidden rounded-[2rem] p-6 transition-all duration-500 xl:p-7',
                                            isActive
                                                ? 'ring-1 ring-[hsl(var(--premium-line-strong))] shadow-[0_30px_90px_-52px_hsl(var(--premium-shadow)/0.72)]'
                                                : 'opacity-70'
                                        )}
                                    >
                                        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--premium-line-strong))] to-transparent" />
                                        <div className="flex items-start justify-between gap-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-gradient-to-br ${step.gradient} shadow-[0_24px_54px_-34px_rgba(15,23,42,0.85)]`}>
                                                    <step.icon className="h-6 w-6 text-white" />
                                                </div>
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[hsl(var(--premium-muted))]">
                                                    {copy.stepLabel} {index + 1}
                                                </div>
                                            </div>

                                            <div className="rounded-full border border-[hsl(var(--premium-line)/0.72)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--premium-muted))]">
                                                0{index + 1}
                                            </div>
                                        </div>

                                        <h3 className="mt-6 text-[2rem] font-semibold leading-tight tracking-[-0.04em]">
                                            {step.title}
                                        </h3>
                                        <p className="premium-muted mt-4 max-w-xl text-base leading-8">
                                            {step.description}
                                        </p>
                                    </article>
                                </RevealOnScroll>
                            )
                        })}
                    </div>

                    <RevealOnScroll direction="right" className="sticky top-28">
                        <div className="premium-panel relative overflow-hidden rounded-[2.8rem] p-4 xl:p-5">
                            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--premium-line-strong))] to-transparent" />
                            <div className="absolute inset-[1rem] rounded-[2.2rem] border border-[hsl(var(--premium-line)/0.55)] bg-[radial-gradient(circle_at_50%_24%,hsl(var(--premium-spot-alt)/0.12),transparent_24%),radial-gradient(circle_at_50%_70%,hsl(var(--premium-spot)/0.12),transparent_30%),linear-gradient(180deg,hsl(var(--premium-surface))_0%,hsl(var(--premium-surface-soft)/0.96)_100%)]" />

                            <div className="relative h-[40rem] overflow-hidden rounded-[2.2rem]">
                                <div className="absolute inset-x-6 top-6 z-20 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="rounded-full bg-black/48 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/88">
                                            {copy.stepLabel} {activeStep + 1}
                                        </div>
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${activeStage.gradient} shadow-[0_18px_38px_-24px_rgba(15,23,42,0.92)]`}>
                                            <activeStage.icon className="h-4.5 w-4.5 text-white" />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {steps.map((step, index) => (
                                            <div
                                                key={`${step.title}-progress`}
                                                className={cn(
                                                    'h-2 rounded-full transition-all duration-500',
                                                    index === activeStep
                                                        ? 'w-10 bg-gradient-to-r from-orange-400 to-sky-400'
                                                        : 'w-2 bg-white/25'
                                                )}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="absolute inset-0">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={activeStage.title}
                                            initial={{ opacity: 0, y: 24, scale: 1.04 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -18, scale: 0.985 }}
                                            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                                            className="absolute inset-0"
                                        >
                                            <StagePreview step={activeStage} />
                                        </motion.div>
                                    </AnimatePresence>
                                </div>

                                <div className="absolute inset-x-6 bottom-6 z-20">
                                    <div className="premium-panel-soft rounded-[1.85rem] px-5 py-5 backdrop-blur-xl">
                                        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[hsl(var(--premium-muted))]">
                                            {copy.stepLabel} {activeStep + 1}
                                        </div>
                                        <h4 className="mt-3 text-[2rem] font-semibold tracking-[-0.04em]">
                                            {activeStage.title}
                                        </h4>
                                        <p className="premium-muted mt-3 max-w-lg text-sm leading-7">
                                            {activeStage.description}
                                        </p>
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

interface StagePreviewProps {
    step: {
        title: string
        imageUrl: string | null
        icon: LucideIcon
        gradient: string
    }
}

function StagePreview({ step }: StagePreviewProps) {
    const Icon = step.icon

    return (
        <div className="relative h-full w-full overflow-hidden rounded-[2.2rem]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,hsl(var(--premium-spot-alt)/0.16),transparent_18%),radial-gradient(circle_at_30%_72%,hsl(var(--premium-spot)/0.14),transparent_22%),linear-gradient(180deg,hsl(var(--premium-surface-soft)/0.82)_0%,transparent_100%)]" />

            <div className="absolute inset-x-[9%] top-[11%] bottom-[20%] overflow-hidden rounded-[2.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] shadow-[0_38px_110px_-60px_rgba(0,0,0,0.78)]">
                {step.imageUrl ? (
                    <Image
                        src={step.imageUrl}
                        alt={step.title}
                        fill
                        sizes="(max-width: 1536px) 46vw, 680px"
                        className="object-cover"
                        unoptimized
                    />
                ) : (
                    <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,hsl(var(--premium-spot)/0.2),transparent_24%),radial-gradient(circle_at_70%_30%,hsl(var(--premium-spot-alt)/0.18),transparent_26%),linear-gradient(180deg,hsl(var(--premium-surface-soft))_0%,transparent_100%)]">
                        <Icon className="h-16 w-16 text-[hsl(var(--premium-ink))]" />
                    </div>
                )}

                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,15,30,0.02)_0%,rgba(8,15,30,0.08)_48%,rgba(8,15,30,0.3)_100%)]" />
            </div>

            <div className="absolute right-[10%] top-[17%] h-3 w-3 rounded-full bg-[hsl(var(--premium-spot))] shadow-[0_0_24px_hsl(var(--premium-spot)/0.75)]" />
            <div className="absolute left-[12%] top-[24%] h-2.5 w-2.5 rounded-full bg-[hsl(var(--premium-spot-alt))] shadow-[0_0_22px_hsl(var(--premium-spot-alt)/0.75)]" />
            <div className="absolute left-[16%] bottom-[26%] h-20 w-20 rounded-full bg-[radial-gradient(circle,hsl(var(--premium-spot)/0.18),transparent_72%)] blur-2xl" />
        </div>
    )
}
