import { Wand2, Package, Truck } from 'lucide-react'

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
            <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
                <div className="lg:sticky lg:top-28 lg:self-start">
                    <div className="premium-chip inline-flex rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em]">
                        {copy.stepLabel}
                    </div>
                    <h2 className="mt-6 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                        {copy.titleLead} <span className="font-editorial text-gradient">{copy.titleAccent}</span>
                    </h2>
                    <p className="premium-muted mt-5 max-w-md text-base leading-7">
                        {copy.subtitle}
                    </p>
                </div>

                <div className="relative lg:pl-10">
                    <div className="absolute left-6 top-4 hidden h-[calc(100%-2rem)] w-px bg-[linear-gradient(180deg,transparent,hsl(var(--premium-line-strong)),transparent)] lg:block" />

                    <div className="space-y-5">
                        {steps.map((step, i) => (
                            <article key={step.title} className="premium-panel relative rounded-[2rem] p-6 sm:p-8 lg:ml-12">
                                <div className="absolute left-6 top-7 hidden h-4 w-4 rounded-full border border-[hsl(var(--premium-line-strong))] bg-[hsl(var(--premium-surface))] lg:block" />
                                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.2rem] bg-gradient-to-br ${step.gradient} shadow-[0_22px_48px_-32px_rgba(15,23,42,0.8)]`}>
                                            <step.icon className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[hsl(var(--premium-muted))]">
                                                {copy.stepLabel} {i + 1}
                                            </div>
                                            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{step.title}</h3>
                                        </div>
                                    </div>
                                    <div className="rounded-full border border-[hsl(var(--premium-line)/0.7)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[hsl(var(--premium-muted))]">
                                        0{i + 1}
                                    </div>
                                </div>
                                <p className="premium-muted mt-5 max-w-2xl text-sm leading-7 sm:text-base">
                                    {step.description}
                                </p>
                            </article>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
