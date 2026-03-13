'use client'

import Image from 'next/image'
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import { type LucideIcon, Package, Sparkles, Truck, Wand2 } from 'lucide-react'
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
        orbitClass: 'left-8 top-10',
    },
    {
        icon: Package,
        gradient: 'from-sky-500 via-cyan-400 to-orange-300',
        orbitClass: 'right-10 top-14',
    },
    {
        icon: Truck,
        gradient: 'from-orange-500 via-rose-400 to-indigo-400',
        orbitClass: 'bottom-12 left-1/2 -translate-x-1/2',
    },
]

export default function HowItWorksStory({ copy, media }: HowItWorksStoryProps) {
    const sectionRef = useRef<HTMLDivElement | null>(null)
    const shouldReduceMotion = useReducedMotion()
    const [activeStep, setActiveStep] = useState(0)

    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ['start start', 'end end'],
    })

    const progress = useSpring(scrollYProgress, {
        stiffness: 120,
        damping: 26,
        mass: 0.35,
    })

    useMotionValueEvent(scrollYProgress, 'change', (value) => {
        if (value < 0.34) {
            setActiveStep(0)
            return
        }

        if (value < 0.68) {
            setActiveStep(1)
            return
        }

        setActiveStep(2)
    })

    const haloScale = useTransform(progress, [0, 1], shouldReduceMotion ? [1, 1] : [0.88, 1.14])
    const haloOpacity = useTransform(progress, [0, 0.4, 1], shouldReduceMotion ? [0.24, 0.24, 0.24] : [0.2, 0.34, 0.22])

    const steps = copy.steps.map((step, index) => ({
        ...step,
        imageUrl: media[index]?.imageUrl ?? null,
        icon: stepVisuals[index].icon,
        gradient: stepVisuals[index].gradient,
        orbitClass: stepVisuals[index].orbitClass,
    }))

    const cardOneX = useTransform(progress, [0, 0.22, 0.55, 1], shouldReduceMotion ? [-36, -28, -22, -18] : [-250, -92, -40, -18])
    const cardOneY = useTransform(progress, [0, 0.22, 0.55, 1], shouldReduceMotion ? [18, 10, 6, 4] : [68, 20, -12, -18])
    const cardOneRotate = useTransform(progress, [0, 0.22, 0.55, 1], shouldReduceMotion ? [-4, -3, -2, -1] : [-13, -7, -3, -1])
    const cardOneScale = useTransform(progress, [0, 0.22, 0.55, 1], [0.86, 0.95, 1, 0.98])
    const cardOneOpacity = useTransform(progress, [0, 0.18, 0.55, 1], [0.2, 1, 0.95, 0.72])

    const cardTwoX = useTransform(progress, [0, 0.25, 0.56, 1], shouldReduceMotion ? [38, 28, 18, 10] : [260, 110, 32, 10])
    const cardTwoY = useTransform(progress, [0, 0.25, 0.56, 1], shouldReduceMotion ? [-14, -10, -6, -2] : [-64, -22, -8, -2])
    const cardTwoRotate = useTransform(progress, [0, 0.25, 0.56, 1], shouldReduceMotion ? [5, 4, 2, 0] : [12, 7, 3, 0])
    const cardTwoScale = useTransform(progress, [0, 0.25, 0.56, 1], [0.84, 0.94, 1, 0.99])
    const cardTwoOpacity = useTransform(progress, [0.08, 0.3, 0.7, 1], [0.1, 1, 0.98, 0.78])

    const cardThreeX = useTransform(progress, [0, 0.55, 0.82, 1], shouldReduceMotion ? [0, 0, 0, 0] : [0, 0, 0, 0])
    const cardThreeY = useTransform(progress, [0, 0.56, 0.82, 1], shouldReduceMotion ? [34, 22, 10, 6] : [220, 160, 16, -8])
    const cardThreeRotate = useTransform(progress, [0.4, 0.82, 1], shouldReduceMotion ? [0, 0, 0] : [4, 1, 0])
    const cardThreeScale = useTransform(progress, [0.4, 0.82, 1], [0.84, 1, 1.03])
    const cardThreeOpacity = useTransform(progress, [0.38, 0.58, 0.88, 1], [0, 0.34, 1, 1])

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

                <div ref={sectionRef} className="relative mt-16 hidden min-h-[220vh] lg:block">
                    <div className="sticky top-24 grid h-[78vh] items-center gap-10 lg:grid-cols-[0.86fr_1.14fr] xl:gap-16">
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
                                            opacity: isActive ? 1 : 0.54,
                                            y: isActive ? 0 : 8,
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

                        <div className="relative h-[42rem]">
                            <div className="premium-panel absolute inset-0 overflow-hidden rounded-[2.6rem] p-6 xl:p-7">
                                <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--premium-line-strong))] to-transparent" />
                                <div className="absolute inset-[1.35rem] rounded-[2rem] border border-[hsl(var(--premium-line)/0.55)] bg-[radial-gradient(circle_at_50%_36%,hsl(var(--premium-spot-alt)/0.14),transparent_24%),radial-gradient(circle_at_50%_60%,hsl(var(--premium-spot)/0.14),transparent_34%),linear-gradient(180deg,hsl(var(--premium-surface))_0%,hsl(var(--premium-surface-soft)/0.96)_100%)]" />

                                <motion.div
                                    className="absolute left-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[hsl(var(--premium-line)/0.45)] bg-[radial-gradient(circle,hsl(var(--premium-surface)/0.45),transparent_70%)]"
                                    style={{ scale: haloScale, opacity: haloOpacity }}
                                />

                                {steps.map((step) => (
                                    <div
                                        key={`${step.title}-orb`}
                                        className={cn(
                                            'absolute h-2.5 w-2.5 rounded-full bg-[hsl(var(--premium-spot))] shadow-[0_0_28px_hsl(var(--premium-spot)/0.6)]',
                                            step.orbitClass
                                        )}
                                    />
                                ))}

                                <div className="absolute inset-0">
                                    <motion.article
                                        className="premium-panel-soft absolute left-1/2 top-1/2 z-10 -ml-[9.5rem] -mt-[12rem] w-[19rem] overflow-hidden rounded-[2rem] p-3"
                                        style={{
                                            x: cardOneX,
                                            y: cardOneY,
                                            rotate: cardOneRotate,
                                            scale: cardOneScale,
                                            opacity: cardOneOpacity,
                                        }}
                                    >
                                        <VisualCard
                                            imageUrl={steps[0]?.imageUrl ?? null}
                                            label={`${copy.stepLabel} 1`}
                                            title={steps[0]?.title ?? ''}
                                            description={steps[0]?.description ?? ''}
                                            icon={steps[0]?.icon ?? Sparkles}
                                            gradient={steps[0]?.gradient ?? stepVisuals[0].gradient}
                                        />
                                    </motion.article>

                                    <motion.article
                                        className="premium-panel-soft absolute left-1/2 top-1/2 z-20 -ml-[9.5rem] -mt-[12rem] w-[19rem] overflow-hidden rounded-[2rem] p-3"
                                        style={{
                                            x: cardTwoX,
                                            y: cardTwoY,
                                            rotate: cardTwoRotate,
                                            scale: cardTwoScale,
                                            opacity: cardTwoOpacity,
                                        }}
                                    >
                                        <VisualCard
                                            imageUrl={steps[1]?.imageUrl ?? null}
                                            label={`${copy.stepLabel} 2`}
                                            title={steps[1]?.title ?? ''}
                                            description={steps[1]?.description ?? ''}
                                            icon={steps[1]?.icon ?? Package}
                                            gradient={steps[1]?.gradient ?? stepVisuals[1].gradient}
                                        />
                                    </motion.article>

                                    <motion.article
                                        className="premium-panel-soft absolute left-1/2 top-1/2 z-30 -ml-[9.5rem] -mt-[12rem] w-[19rem] overflow-hidden rounded-[2rem] p-3"
                                        style={{
                                            x: cardThreeX,
                                            y: cardThreeY,
                                            rotate: cardThreeRotate,
                                            scale: cardThreeScale,
                                            opacity: cardThreeOpacity,
                                        }}
                                    >
                                        <VisualCard
                                            imageUrl={steps[2]?.imageUrl ?? null}
                                            label={`${copy.stepLabel} 3`}
                                            title={steps[2]?.title ?? ''}
                                            description={steps[2]?.description ?? ''}
                                            icon={steps[2]?.icon ?? Truck}
                                            gradient={steps[2]?.gradient ?? stepVisuals[2].gradient}
                                        />
                                    </motion.article>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

interface VisualCardProps {
    imageUrl: string | null
    label: string
    title: string
    description: string
    icon: LucideIcon
    gradient: string
}

function VisualCard({ imageUrl, label, title, description, icon: Icon, gradient }: VisualCardProps) {
    return (
        <>
            <div className="flex items-center justify-between gap-3 px-2 pb-3 pt-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[hsl(var(--premium-muted))]">
                    {label}
                </div>
                <div className={`flex h-9 w-9 items-center justify-center rounded-[0.95rem] bg-gradient-to-br ${gradient}`}>
                    <Icon className="h-4 w-4 text-white" />
                </div>
            </div>

            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.55rem] border border-[hsl(var(--premium-line)/0.6)] bg-[linear-gradient(180deg,hsl(var(--premium-surface))_0%,transparent_100%)]">
                {imageUrl ? (
                    <>
                        <Image
                            src={imageUrl}
                            alt={title}
                            fill
                            sizes="320px"
                            className="object-cover"
                            unoptimized
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/8 to-transparent" />
                    </>
                ) : (
                    <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,hsl(var(--premium-spot)/0.22),transparent_24%),radial-gradient(circle_at_70%_30%,hsl(var(--premium-spot-alt)/0.18),transparent_28%),linear-gradient(180deg,hsl(var(--premium-surface-soft))_0%,transparent_100%)]">
                        <Icon className="h-10 w-10 text-[hsl(var(--premium-ink))]" />
                    </div>
                )}
            </div>

            <div className="px-2 pb-2 pt-4">
                <h4 className="text-lg font-semibold tracking-[-0.03em]">{title}</h4>
                <p className="premium-muted mt-2 text-sm leading-6">
                    {description}
                </p>
            </div>
        </>
    )
}
