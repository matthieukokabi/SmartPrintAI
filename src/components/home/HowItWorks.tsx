import { Wand2, Package, Truck } from 'lucide-react'

const steps = [
    {
        icon: Wand2,
        title: 'Describe Your Vision',
        description: 'Type any idea — a pet portrait, abstract art, or a funny quote. Our AI understands it all.',
        gradient: 'from-purple-500 to-violet-500',
    },
    {
        icon: Package,
        title: 'Pick Your Product',
        description: 'Choose from 15+ premium products — t-shirts, hoodies, mugs, canvas prints, and more.',
        gradient: 'from-pink-500 to-rose-500',
    },
    {
        icon: Truck,
        title: 'We Print & Ship',
        description: 'Your custom product is printed on demand and shipped worldwide in 3–7 business days.',
        gradient: 'from-orange-500 to-amber-500',
    },
]

export default function HowItWorks() {
    return (
        <section id="how-it-works" className="py-24 relative">
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                        How It <span className="text-gradient">Works</span>
                    </h2>
                    <p className="text-muted-foreground max-w-lg mx-auto">
                        From idea to doorstep in three simple steps
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {steps.map((step, i) => (
                        <div key={step.title} className="relative group">
                            <div className="glass rounded-2xl p-8 h-full hover:border-purple-500/20 transition-all duration-300 hover:-translate-y-1">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                    <step.icon className="w-6 h-6 text-white" />
                                </div>
                                <div className="text-xs text-purple-400 font-mono mb-2">STEP {i + 1}</div>
                                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
