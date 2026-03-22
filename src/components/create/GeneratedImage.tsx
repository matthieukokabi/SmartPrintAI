'use client'

import { RefreshCw } from 'lucide-react'
import Image from 'next/image'

interface Props {
    imageUrl: string | null
    isLoading: boolean
    onRegenerate: () => void
    copy: {
        creatingLabel: string
        creatingSubLabel: string
        placeholderLabel: string
        regenerateLabel: string
    }
}

export default function GeneratedImage({ imageUrl, isLoading, onRegenerate, copy }: Props) {
    if (isLoading) {
        return (
            <div className="aspect-square rounded-2xl glass flex items-center justify-center overflow-hidden">
                <div className="text-center space-y-4">
                    <div
                        className="mx-auto h-16 w-16 animate-spin rounded-full bg-gradient-to-r from-[#2f6cf3] to-[#26d4b8]"
                        style={{ clipPath: 'inset(0 0 50% 0)' }}
                    />
                    <div>
                        <p className="text-sm font-medium">{copy.creatingLabel}</p>
                        <p className="text-xs text-muted-foreground mt-1">{copy.creatingSubLabel}</p>
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
                    <p className="text-sm text-muted-foreground">{copy.placeholderLabel}</p>
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
                {copy.regenerateLabel}
            </button>
        </div>
    )
}
