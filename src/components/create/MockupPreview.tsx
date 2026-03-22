'use client'

import { Loader2 } from 'lucide-react'
import Image from 'next/image'

interface Props {
    mockupUrl: string | null
    isLoading: boolean
    copy: {
        generatingLabel: string
        placeholderLabel: string
    }
}

export default function MockupPreview({ mockupUrl, isLoading, copy }: Props) {
    if (isLoading) {
        return (
            <div className="aspect-square rounded-2xl glass flex items-center justify-center">
                <div className="text-center space-y-3">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#2f6cf3]" />
                    <p className="text-sm text-muted-foreground">{copy.generatingLabel}</p>
                </div>
            </div>
        )
    }

    if (!mockupUrl) {
        return (
            <div className="aspect-square rounded-2xl glass flex items-center justify-center">
                <div className="text-center px-8">
                    <div className="text-4xl mb-3">👕</div>
                    <p className="text-sm text-muted-foreground">{copy.placeholderLabel}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="aspect-square rounded-2xl overflow-hidden glass relative">
            <Image
                src={mockupUrl}
                alt="Product mockup"
                fill
                className="object-contain p-2"
                unoptimized
            />
        </div>
    )
}
