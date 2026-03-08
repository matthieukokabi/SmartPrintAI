'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, ArrowRight } from 'lucide-react'

export default function Hero() {
    const [prompt, setPrompt] = useState('')
    const router = useRouter()

    const handleCreate = () => {
        if (prompt.trim()) {
            router.push(`/create?prompt=${encodeURIComponent(prompt.trim())}`)
        } else {
            router.push('/create')
        }
    }

    const samplePrompts = [
        'A golden retriever wearing sunglasses, pop art style',
        'Japanese cherry blossoms at sunset, watercolor',
        'Geometric wolf in neon colors',
        'Vintage Van Gogh style starry night over a city',
    ]

    return (
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 bg-grid opacity-50" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000" />

            <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs text-purple-300 mb-8">
                    <Sparkles className="w-3 h-3" />
                    AI-Powered Custom Print On Demand
                </div>

                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-6 leading-[1.1]">
                    Describe it.{' '}
                    <span className="text-gradient">AI creates it.</span>
                    <br />
                    We print it.
                </h1>

                <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
                    Turn your words into stunning custom products. T-shirts, hoodies, mugs, canvas —
                    all designed by AI in seconds. No design skills needed.
                </p>

                {/* Main prompt input */}
                <div className="max-w-2xl mx-auto mb-8">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity" />
                        <div className="relative flex items-center glass rounded-xl overflow-hidden">
                            <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                placeholder="Describe your design... (e.g., a cosmic cat in a space helmet)"
                                className="flex-1 bg-transparent px-6 py-4 text-base outline-none placeholder:text-muted-foreground/50"
                            />
                            <button
                                onClick={handleCreate}
                                className="flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:opacity-90 transition-opacity"
                            >
                                Create
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sample prompts */}
                <div className="flex flex-wrap justify-center gap-2">
                    {samplePrompts.map((sample) => (
                        <button
                            key={sample}
                            onClick={() => { setPrompt(sample); router.push(`/create?prompt=${encodeURIComponent(sample)}`) }}
                            className="px-3 py-1.5 rounded-full text-xs text-muted-foreground glass hover:text-foreground hover:border-purple-500/30 transition-all"
                        >
                            {sample}
                        </button>
                    ))}
                </div>
            </div>
        </section>
    )
}
