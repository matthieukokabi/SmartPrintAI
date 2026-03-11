'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'

interface Props {
    onGenerate: (prompt: string) => void
    isLoading: boolean
    initialPrompt?: string
    copy: {
        placeholder: string
        generatingLabel: string
        generateLabel: string
        tip: string
    }
}

export default function PromptInput({ onGenerate, isLoading, initialPrompt = '', copy }: Props) {
    const [prompt, setPrompt] = useState(initialPrompt)

    return (
        <div className="space-y-4">
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-lg opacity-20 group-focus-within:opacity-40 transition-opacity" />
                <div className="relative">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={copy.placeholder}
                        rows={3}
                        maxLength={500}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-base outline-none focus:border-purple-500/50 resize-none placeholder:text-muted-foreground/40 transition-colors"
                    />
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">{prompt.length}/500</span>
                        <button
                            onClick={() => prompt.trim().length >= 3 && onGenerate(prompt.trim())}
                            disabled={isLoading || prompt.trim().length < 3}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {copy.generatingLabel}
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    {copy.generateLabel}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
            <p className="text-xs text-muted-foreground/60">
                💡 {copy.tip}
            </p>
        </div>
    )
}
