'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'

interface Props {
    onGenerate: (prompt: string) => void
    onPromptFocus?: () => void
    onPromptStarted?: (promptLength: number) => void
    isLoading: boolean
    initialPrompt?: string
    copy: {
        placeholder: string
        generatingLabel: string
        generateLabel: string
        tip: string
    }
}

export default function PromptInput({
    onGenerate,
    onPromptFocus,
    onPromptStarted,
    isLoading,
    initialPrompt = '',
    copy,
}: Props) {
    const [prompt, setPrompt] = useState(initialPrompt)
    const [hasStarted, setHasStarted] = useState(initialPrompt.trim().length > 0)

    const trackPromptStarted = (trimmedLength: number) => {
        if (hasStarted || trimmedLength <= 0) {
            return
        }
        setHasStarted(true)
        onPromptStarted?.(trimmedLength)
    }

    const handlePromptChange = (nextValue: string) => {
        setPrompt(nextValue)
        trackPromptStarted(nextValue.trim().length)
    }

    const handleGenerate = () => {
        const trimmed = prompt.trim()
        if (trimmed.length < 3) {
            return
        }
        trackPromptStarted(trimmed.length)
        onGenerate(trimmed)
    }

    return (
        <div className="space-y-4">
            <div className="relative group">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#2f6cf3] to-[#26d4b8] blur-lg opacity-20 transition-opacity group-focus-within:opacity-40" />
                <div className="relative">
                    <textarea
                        value={prompt}
                        onChange={(e) => handlePromptChange(e.target.value)}
                        onFocus={onPromptFocus}
                        placeholder={copy.placeholder}
                        rows={3}
                        maxLength={500}
                        className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-base outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-[#2f6cf3]/60 focus:ring-2 focus:ring-[#26d4b8]/20"
                    />
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">{prompt.length}/500</span>
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading || prompt.trim().length < 3}
                            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2f6cf3] to-[#26d4b8] px-6 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:brightness-105 active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#26d4b8]/45 disabled:opacity-50"
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
