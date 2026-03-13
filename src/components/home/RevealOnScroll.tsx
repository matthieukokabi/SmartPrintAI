'use client'

import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
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
    const shouldReduceMotion = useReducedMotion()
    const isInView = useInView(ref, {
        once: true,
        amount: 0.18,
        margin: '0px 0px -12% 0px',
    })

    const hiddenState = shouldReduceMotion
        ? { opacity: 1, x: 0, y: 0 }
        : {
              opacity: 0,
              x:
                  direction === 'left'
                      ? -56
                      : direction === 'right'
                        ? 56
                        : 0,
              y: direction === 'up' ? 44 : 0,
          }

    return (
        <motion.div
            ref={ref}
            className={cn(
                'motion-reduce:transform-none motion-reduce:opacity-100',
                className
            )}
            initial={hiddenState}
            animate={isInView ? { opacity: 1, x: 0, y: 0 } : hiddenState}
            transition={{
                duration: shouldReduceMotion ? 0 : 0.85,
                delay: shouldReduceMotion ? 0 : delayMs / 1000,
                ease: [0.22, 1, 0.36, 1],
            }}
        >
            {children}
        </motion.div>
    )
}
