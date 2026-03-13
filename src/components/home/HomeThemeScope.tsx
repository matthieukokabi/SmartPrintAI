'use client'

import { useEffect } from 'react'
import ThemeToggle from '@/components/theme/ThemeToggle'

export default function HomeThemeScope() {
    useEffect(() => {
        document.body.classList.add('premium-home')

        return () => {
            document.body.classList.remove('premium-home')
        }
    }, [])

    return <ThemeToggle variant="premium" />
}
