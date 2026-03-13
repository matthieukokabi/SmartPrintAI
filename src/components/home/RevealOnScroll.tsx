'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type RevealDirection = 'up' | 'left' | 'right'

interface RevealOnScrollProps {
    children: React.ReactNode
    className?: string
    delayMs?: number
    direction?: RevealDirection
}

const hiddenClassByDirection: Record<RevealDirection, string> = {
    up: 'translate-y-10',
    left: '-translate-x-12',
    right: 'translate-x-12',
}

export default function RevealOnScroll({
    children,
    className,
    delayMs = 0,
    direction = 'up',
}: RevealOnScrollProps) {
    const ref = useRef<HTMLDivElement | null>(null)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const node = ref.current
        if (!node) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return
                setIsVisible(true)
                observer.unobserve(node)
            },
            {
                threshold: 0.18,
                rootMargin: '0px 0px -12% 0px',
            }
        )

        observer.observe(node)

        return () => observer.disconnect()
    }, [])

    return (
        <div
            ref={ref}
            className={cn(
                'transition-all duration-700 ease-out motion-reduce:transform-none motion-reduce:opacity-100',
                isVisible ? 'translate-x-0 translate-y-0 opacity-100' : cn('opacity-0', hiddenClassByDirection[direction]),
                className
            )}
            style={{ transitionDelay: `${delayMs}ms` }}
        >
            {children}
        </div>
    )
}
