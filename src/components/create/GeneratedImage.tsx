'use client'

import { RefreshCw } from 'lucide-react'
import Image from 'next/image'

interface Props {
    imageUrl: string | null
    isLoading: boolean
    onRegenerate: () => void
}

export default function GeneratedImage({ imageUrl, isLoading, onRegenerate }: Props) {
    if (isLoading) {
        return (
            <div className="aspect-square rounded-2xl glass flex items-center justify-center overflow-hidden">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-spin mx-auto" style={{ clipPath: 'inset(0 0 50% 0)' }} />
                    <div>
                        <p className="text-sm font-medium">Creating your design...</p>
                        <p className="text-xs text-muted-foreground mt-1">This usually takes 5–15 seconds</p>
                    </div>
                </div>
            </div>
        )
    }

    if (!imageUrl) {
        return (
            <div className="aspect-square rounded-2xl glass flex items-center justify-center">
                <div className="text-center px-8">
                    <div className="text-5xl mb-4">🎨</div>
                    <p className="text-sm text-muted-foreground">Your AI-generated design will appear here</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <div className="aspect-square rounded-2xl overflow-hidden glass relative group">
                <Image
                    src={imageUrl}
                    alt="Generated design"
                    fill
                    className="object-contain p-4"
                    unoptimized
                />
            </div>
            <button
                onClick={onRegenerate}
                className="flex items-center gap-2 px-4 py-2 rounded-xl glass text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-center"
            >
                <RefreshCw className="w-3.5 h-3.5" />
                Not happy? Regenerate
            </button>
        </div>
    )
}
