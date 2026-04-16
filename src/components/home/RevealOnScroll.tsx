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

export default function RevealOnScroll({
    children,
    className,
    delayMs = 0,
    direction = 'up',
}: RevealOnScrollProps) {
    const ref = useRef<HTMLDivElement | null>(null)
    const [isVisible, setIsVisible] = useState(false)
    const [hasMounted, setHasMounted] = useState(false)

    // Mark as mounted on the client — before this, render fully visible (SSR-safe)
    useEffect(() => {
        setHasMounted(true)
    }, [])

    useEffect(() => {
        if (!hasMounted) return
        const el = ref.current
        if (!el) return

        // Respect prefers-reduced-motion
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (prefersReduced) {
            setIsVisible(true)
            return
        }

        // If element is already in the viewport, reveal immediately (no black flash)
        const rect = el.getBoundingClientRect()
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            setIsVisible(true)
            return
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true)
                    observer.disconnect()
                }
            },
            { threshold: 0.18, rootMargin: '0px 0px -12% 0px' }
        )

        observer.observe(el)
        return () => observer.disconnect()
    }, [hasMounted])

    // Build transform for the hidden state
    const hiddenTransform =
        direction === 'left'
            ? 'translateX(-56px)'
            : direction === 'right'
              ? 'translateX(56px)'
              : 'translateY(44px)'

    // Before client mount: render fully visible (no flash of invisible content)
    // After mount: apply animation classes
    const style: React.CSSProperties = !hasMounted
        ? {}
        : {
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translate(0, 0)' : hiddenTransform,
              transition: `opacity 0.85s cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms, transform 0.85s cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms`,
          }

    return (
        <div
            ref={ref}
            className={cn('motion-reduce:transform-none motion-reduce:opacity-100', className)}
            style={style}
        >
            {children}
        </div>
    )
}
