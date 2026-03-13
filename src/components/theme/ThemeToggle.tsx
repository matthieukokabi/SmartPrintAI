'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
    applyThemeMode,
    getPreferredThemeMode,
    getStoredThemeMode,
    setThemeMode,
    THEME_CHANGE_EVENT,
    type ThemeMode,
} from '@/lib/theme'

const themeModes: Array<{
    mode: ThemeMode
    label: string
    icon: typeof Sun
}> = [
    { mode: 'light', label: 'Light', icon: Sun },
    { mode: 'dark', label: 'Dark', icon: Moon },
]

interface ThemeToggleProps {
    compact?: boolean
    className?: string
}

export default function ThemeToggle({ compact = false, className }: ThemeToggleProps) {
    const [themeMode, setThemeModeState] = useState<ThemeMode>('dark')

    useEffect(() => {
        const syncThemeMode = () => {
            const currentMode = getPreferredThemeMode()
            setThemeModeState(currentMode)
            applyThemeMode(currentMode)
        }

        const handleThemeChange = (event: Event) => {
            const detail = (event as CustomEvent<ThemeMode>).detail
            if (detail) {
                setThemeModeState(detail)
                return
            }

            syncThemeMode()
        }

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        const handleSystemChange = () => {
            if (getStoredThemeMode() === null) {
                syncThemeMode()
            }
        }

        syncThemeMode()
        window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange as EventListener)
        mediaQuery.addEventListener('change', handleSystemChange)

        return () => {
            window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange as EventListener)
            mediaQuery.removeEventListener('change', handleSystemChange)
        }
    }, [])

    return (
        <div
            className={cn(
                'inline-flex items-center rounded-full border border-border/80 bg-card/80 p-1 shadow-[0_18px_44px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl',
                compact ? 'gap-0.5' : 'gap-1',
                className
            )}
        >
            {themeModes.map((item) => {
                const isActive = item.mode === themeMode
                const Icon = item.icon

                return (
                    <button
                        key={item.mode}
                        type="button"
                        onClick={() => setThemeMode(item.mode)}
                        className={cn(
                            'inline-flex items-center rounded-full font-semibold uppercase tracking-[0.18em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                            compact ? 'h-8 w-8 justify-center text-[10px]' : 'gap-2 px-3 py-2 text-[11px]',
                            isActive
                                ? 'bg-foreground text-background shadow-[0_14px_32px_-24px_rgba(15,23,42,0.45)]'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                        aria-pressed={isActive}
                        aria-label={`${item.label} theme`}
                        title={item.label}
                    >
                        <Icon className="h-3.5 w-3.5" />
                        {!compact && item.label}
                    </button>
                )
            })}
        </div>
    )
}
