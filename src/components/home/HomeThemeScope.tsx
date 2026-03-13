'use client'

import { LaptopMinimal, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

type HomeThemeMode = 'system' | 'light' | 'dark'

const HOME_THEME_STORAGE_KEY = 'spai_home_theme'

const themeModes: Array<{
    mode: HomeThemeMode
    label: string
    icon: typeof Sun
}> = [
    { mode: 'system', label: 'Auto', icon: LaptopMinimal },
    { mode: 'light', label: 'Light', icon: Sun },
    { mode: 'dark', label: 'Dark', icon: Moon },
]

export default function HomeThemeScope() {
    const [themeMode, setThemeMode] = useState<HomeThemeMode>('system')

    useEffect(() => {
        document.body.classList.add('premium-home')
        const storedTheme = window.localStorage.getItem(HOME_THEME_STORAGE_KEY)

        if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
            setThemeMode(storedTheme)
        }

        return () => {
            document.body.classList.remove('premium-home')
            document.body.classList.remove('premium-home-force-light')
            document.body.classList.remove('premium-home-force-dark')
        }
    }, [])

    useEffect(() => {
        document.body.classList.toggle('premium-home-force-light', themeMode === 'light')
        document.body.classList.toggle('premium-home-force-dark', themeMode === 'dark')

        if (themeMode === 'system') {
            window.localStorage.removeItem(HOME_THEME_STORAGE_KEY)
            return
        }

        window.localStorage.setItem(HOME_THEME_STORAGE_KEY, themeMode)
    }, [themeMode])

    return (
        <div className="premium-chip inline-flex items-center gap-1 rounded-full p-1">
            {themeModes.map((item) => {
                const isActive = item.mode === themeMode
                const Icon = item.icon

                return (
                    <button
                        key={item.mode}
                        type="button"
                        onClick={() => setThemeMode(item.mode)}
                        className={cn(
                            'inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition-all duration-300',
                            isActive
                                ? 'bg-[hsl(var(--premium-ink))] text-[hsl(var(--premium-surface))] shadow-[0_14px_32px_-24px_hsl(var(--premium-shadow)/0.8)]'
                                : 'text-[hsl(var(--premium-muted))] hover:text-[hsl(var(--premium-ink))]'
                        )}
                        aria-pressed={isActive}
                    >
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                    </button>
                )
            })}
        </div>
    )
}
