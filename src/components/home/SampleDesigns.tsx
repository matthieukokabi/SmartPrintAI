const samples = [
    { prompt: 'Cosmic cat astronaut', style: 'Pop Art', color: 'from-purple-600 to-blue-600' },
    { prompt: 'Mountain sunset landscape', style: 'Watercolor', color: 'from-orange-500 to-pink-500' },
    { prompt: 'Geometric wolf portrait', style: 'Minimalist', color: 'from-cyan-500 to-teal-500' },
    { prompt: 'Retro VW van on beach', style: 'Artistic', color: 'from-yellow-500 to-red-500' },
]

export default function SampleDesigns() {
    return (
        <section className="py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent" />
            <div className="max-w-6xl mx-auto px-4 relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                        See What&apos;s <span className="text-gradient">Possible</span>
                    </h2>
                    <p className="text-muted-foreground max-w-lg mx-auto">
                        Real designs created by our AI from simple text prompts
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {samples.map((sample) => (
                        <div key={sample.prompt} className="group cursor-pointer">
                            <div className={`aspect-square rounded-2xl bg-gradient-to-br ${sample.color} p-0.5`}>
                                <div className="w-full h-full rounded-2xl bg-background/90 flex items-center justify-center p-6">
                                    <p className="text-sm text-center text-muted-foreground group-hover:text-foreground transition-colors">
                                        &quot;{sample.prompt}&quot;
                                    </p>
                                </div>
                            </div>
                            <div className="mt-2 text-center">
                                <span className="text-xs text-purple-400">{sample.style}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
