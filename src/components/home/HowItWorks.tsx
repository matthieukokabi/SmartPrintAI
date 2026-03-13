import { Wand2, Package, Truck } from 'lucide-react'
import RevealOnScroll from '@/components/home/RevealOnScroll'
import SectionHeader from '@/components/home/SectionHeader'

type StepCopy = {
    title: string
    description: string
}

interface HowItWorksCopy {
    titleLead: string
    titleAccent: string
    subtitle: string
    stepLabel: string
    steps: [StepCopy, StepCopy, StepCopy]
}

const defaultCopy: HowItWorksCopy = {
    titleLead: 'How It',
    titleAccent: 'Works',
    subtitle: 'From idea to doorstep in three simple steps',
    stepLabel: 'STEP',
    steps: [
        {
            title: 'Describe Your Vision',
            description: 'Type any idea - a pet portrait, abstract art, or a funny quote. Our AI understands it all.',
        },
        {
            title: 'Pick Your Product',
            description: 'Choose from 15+ premium products - t-shirts, hoodies, mugs, canvas prints, and more.',
        },
        {
            title: 'We Print & Ship',
            description: 'Your custom product is printed on demand and shipped worldwide in 3-7 business days.',
        },
    ],
}

const stepVisuals = [
    {
        icon: Wand2,
        gradient: 'from-purple-500 to-violet-500',
    },
    {
        icon: Package,
        gradient: 'from-pink-500 to-rose-500',
    },
    {
        icon: Truck,
        gradient: 'from-orange-500 to-amber-500',
    },
]

interface HowItWorksProps {
    copy?: HowItWorksCopy
}

export default function HowItWorks({ copy = defaultCopy }: HowItWorksProps) {
    const steps = copy.steps.map((step, index) => ({
        ...step,
        icon: stepVisuals[index].icon,
        gradient: stepVisuals[index].gradient,
    }))

    return (
        <section id="how-it-works" className="relative py-24 sm:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <RevealOnScroll>
                    <SectionHeader
                        titleLead={copy.titleLead}
                        titleAccent={copy.titleAccent}
                        subtitle={copy.subtitle}
                    />
                </RevealOnScroll>

                <div className="mt-14 grid gap-5 lg:grid-cols-3">
                    {steps.map((step, i) => (
                        <RevealOnScroll
                            key={step.title}
                            direction={i === 0 ? 'left' : i === 1 ? 'up' : 'right'}
                            delayMs={i * 90}
                        >
                            <article className="premium-panel relative h-full rounded-[2rem] p-6 sm:p-8">
                                <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--premium-line-strong))] to-transparent" />
                                <div className={`flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-gradient-to-br ${step.gradient} shadow-[0_22px_48px_-32px_rgba(15,23,42,0.8)]`}>
                                    <step.icon className="h-6 w-6 text-white" />
                                </div>
                                <div className="mt-6 flex items-center justify-between gap-3">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[hsl(var(--premium-muted))]">
                                        {copy.stepLabel} {i + 1}
                                    </div>
                                    <div className="rounded-full border border-[hsl(var(--premium-line)/0.7)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[hsl(var(--premium-muted))]">
                                        0{i + 1}
                                    </div>
                                </div>
                                <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">{step.title}</h3>
                                <p className="premium-muted mt-4 text-sm leading-7 sm:text-base">
                                    {step.description}
                                </p>
                            </article>
                        </RevealOnScroll>
                    ))}
                </div>
            </div>
        </section>
    )
}
