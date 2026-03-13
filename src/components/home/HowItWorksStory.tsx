'use client'

import Image from 'next/image'
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import { type LucideIcon, Package, Truck, Wand2 } from 'lucide-react'
import { useRef, useState } from 'react'
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
    const sectionRef = useRef<HTMLDivElement | null>(null)
    const shouldReduceMotion = useReducedMotion() ?? false
    const [activeStep, setActiveStep] = useState(0)

    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ['start 70%', 'end 38%'],
    })

    const progress = useSpring(scrollYProgress, {
        stiffness: 120,
        damping: 24,
        mass: 0.4,
    })

    useMotionValueEvent(scrollYProgress, 'change', (value) => {
        const nextStep = value < 0.3 ? 0 : value < 0.65 ? 1 : 2
        setActiveStep((current) => (current === nextStep ? current : nextStep))
    })

    const haloScale = useTransform(progress, [0, 1], shouldReduceMotion ? [1, 1] : [0.96, 1.08])
    const haloOpacity = useTransform(progress, [0, 0.45, 1], shouldReduceMotion ? [0.22, 0.22, 0.22] : [0.18, 0.3, 0.22])
    const progressScaleX = useTransform(progress, [0, 1], [0.12, 1])

    const steps = copy.steps.map((step, index) => ({
        ...step,
        imageUrl: media[index]?.imageUrl ?? null,
        icon: stepVisuals[index].icon,
        gradient: stepVisuals[index].gradient,
        index,
    }))

    const activeStage = steps[activeStep]

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

                <div ref={sectionRef} className="relative mt-16 hidden min-h-[190vh] lg:block">
                    <div className="sticky top-24 grid h-[78vh] items-center gap-10 lg:grid-cols-[0.84fr_1.16fr] xl:gap-16">
                        <div className="space-y-5">
                            {steps.map((step, index) => {
                                const isActive = activeStep === index

                                return (
                                    <motion.article
                                        key={step.title}
                                        className={cn(
                                            'premium-panel relative overflow-hidden rounded-[2rem] p-6 xl:p-7',
                                            isActive && 'ring-1 ring-[hsl(var(--premium-line-strong))]'
                                        )}
                                        animate={{
                                            opacity: isActive ? 1 : 0.52,
                                            y: isActive ? 0 : 10,
                                            scale: isActive ? 1 : 0.975,
                                        }}
                                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
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
                                    </motion.article>
                                )
                            })}
                        </div>

                        <div className="relative h-[43rem]">
                            <div className="premium-panel absolute inset-0 overflow-hidden rounded-[2.7rem] p-6 xl:p-7">
                                <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--premium-line-strong))] to-transparent" />
                                <div className="absolute inset-[1.35rem] rounded-[2rem] border border-[hsl(var(--premium-line)/0.55)] bg-[radial-gradient(circle_at_50%_32%,hsl(var(--premium-spot-alt)/0.12),transparent_22%),radial-gradient(circle_at_50%_62%,hsl(var(--premium-spot)/0.12),transparent_28%),linear-gradient(180deg,hsl(var(--premium-surface))_0%,hsl(var(--premium-surface-soft)/0.96)_100%)]" />

                                <motion.div
                                    className="absolute left-1/2 top-[44%] h-[24rem] w-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[hsl(var(--premium-line)/0.4)] bg-[radial-gradient(circle,hsl(var(--premium-surface)/0.45),transparent_70%)]"
                                    style={{ scale: haloScale, opacity: haloOpacity }}
                                />

                                <div className="absolute inset-x-0 top-6 flex justify-between px-8">
                                    {steps.map((step) => (
                                        <div
                                            key={`${step.title}-dot`}
                                            className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--premium-spot))] shadow-[0_0_28px_hsl(var(--premium-spot)/0.6)]"
                                        />
                                    ))}
                                </div>

                                <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                                    {steps.map((step, index) => {
                                        const stageState = getStageState(index, activeStep, shouldReduceMotion)

                                        return (
                                            <motion.div
                                                key={step.title}
                                                className={cn(
                                                    'absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2',
                                                    index === activeStep ? 'z-30 w-[21rem] xl:w-[23rem]' : 'z-20 w-[13rem] xl:w-[14rem]'
                                                )}
                                                animate={stageState}
                                                transition={{ duration: shouldReduceMotion ? 0 : 0.8, ease: [0.22, 1, 0.36, 1] }}
                                            >
                                                <StageCard
                                                    step={step}
                                                    label={`${copy.stepLabel} ${index + 1}`}
                                                    active={index === activeStep}
                                                />
                                            </motion.div>
                                        )
                                    })}
                                </div>

                                <div className="absolute inset-x-7 bottom-7">
                                    <div className="premium-panel-soft rounded-[1.7rem] px-5 py-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[hsl(var(--premium-muted))]">
                                                    {copy.stepLabel} {activeStep + 1}
                                                </div>
                                                <h4 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                                                    {activeStage.title}
                                                </h4>
                                            </div>

                                            <div className={`flex h-11 w-11 items-center justify-center rounded-[1rem] bg-gradient-to-br ${activeStage.gradient}`}>
                                                <activeStage.icon className="h-5 w-5 text-white" />
                                            </div>
                                        </div>

                                        <p className="premium-muted mt-3 max-w-lg text-sm leading-7">
                                            {activeStage.description}
                                        </p>

                                        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[hsl(var(--premium-line)/0.5)]">
                                            <motion.div
                                                className="h-full origin-left rounded-full bg-gradient-to-r from-[hsl(var(--premium-spot))] to-[hsl(var(--premium-spot-alt))]"
                                                style={{ scaleX: progressScaleX }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

interface StageCardProps {
    step: {
        title: string
        imageUrl: string | null
        icon: LucideIcon
        gradient: string
    }
    label: string
    active: boolean
}

function StageCard({ step, label, active }: StageCardProps) {
    const Icon = step.icon

    return (
        <div className="premium-panel-soft overflow-hidden rounded-[2rem] p-3 shadow-[0_28px_80px_-42px_hsl(var(--premium-shadow)/0.72)]">
            <div
                className={cn(
                    'relative overflow-hidden border border-[hsl(var(--premium-line)/0.62)] bg-[linear-gradient(180deg,hsl(var(--premium-surface))_0%,transparent_100%)]',
                    active ? 'aspect-[4/5] rounded-[1.6rem]' : 'aspect-[4/5] rounded-[1.35rem]'
                )}
            >
                {step.imageUrl ? (
                    <>
                        <Image
                            src={step.imageUrl}
                            alt={step.title}
                            fill
                            sizes={active ? '368px' : '224px'}
                            className="object-cover"
                            unoptimized
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
                    </>
                ) : (
                    <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,hsl(var(--premium-spot)/0.22),transparent_24%),radial-gradient(circle_at_70%_30%,hsl(var(--premium-spot-alt)/0.18),transparent_28%),linear-gradient(180deg,hsl(var(--premium-surface-soft))_0%,transparent_100%)]">
                        <Icon className="h-12 w-12 text-[hsl(var(--premium-ink))]" />
                    </div>
                )}

                <div className="absolute left-3 top-3 flex items-center gap-2">
                    <div className="rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/86">
                        {label}
                    </div>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${step.gradient} shadow-[0_14px_28px_-18px_rgba(15,23,42,0.9)]`}>
                        <Icon className="h-3.5 w-3.5 text-white" />
                    </div>
                </div>

                {active ? (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-4 pb-4 pt-10">
                        <p className="text-lg font-semibold tracking-[-0.03em] text-white">
                            {step.title}
                        </p>
                    </div>
                ) : null}
            </div>
        </div>
    )
}

function getStageState(index: number, activeStep: number, shouldReduceMotion: boolean) {
    const delta = index - activeStep

    if (delta === 0) {
        return {
            x: 0,
            y: shouldReduceMotion ? 0 : -18,
            rotate: 0,
            scale: 1,
            opacity: 1,
        }
    }

    if (delta < 0) {
        return {
            x: shouldReduceMotion ? -56 : -198,
            y: shouldReduceMotion ? 26 : 74,
            rotate: shouldReduceMotion ? -4 : -12,
            scale: 0.78,
            opacity: 0.34,
        }
    }

    return {
        x: shouldReduceMotion ? 56 : 198,
        y: shouldReduceMotion ? -24 : -58,
        rotate: shouldReduceMotion ? 4 : 12,
        scale: 0.8,
        opacity: 0.3,
    }
}
