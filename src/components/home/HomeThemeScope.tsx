'use client'

import { useEffect } from 'react'

export default function HomeThemeScope() {
    useEffect(() => {
        document.body.classList.add('premium-home')

        return () => {
            document.body.classList.remove('premium-home')
        }
    }, [])

    return null
}
