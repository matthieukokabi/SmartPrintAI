'use client'

import { LaptopMinimal, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
    applyThemeMode,
    getStoredThemeMode,
    resolveThemeMode,
    setThemeMode,
    THEME_CHANGE_EVENT,
    type ThemeMode,
} from '@/lib/theme'

const themeModes: Array<{
    mode: ThemeMode
    label: string
    icon: typeof Sun
}> = [
    { mode: 'system', label: 'Auto', icon: LaptopMinimal },
    { mode: 'light', label: 'Light', icon: Sun },
    { mode: 'dark', label: 'Dark', icon: Moon },
]

interface ThemeToggleProps {
    variant?: 'default' | 'premium'
    compact?: boolean
    className?: string
}

export default function ThemeToggle({
    variant = 'default',
    compact = false,
    className,
}: ThemeToggleProps) {
    const [themeMode, setThemeModeState] = useState<ThemeMode>('system')

    useEffect(() => {
        const syncThemeMode = () => {
            const currentMode = getStoredThemeMode()
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
            if (getStoredThemeMode() === 'system') {
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

    const resolvedTheme = resolveThemeMode(themeMode)

    return (
        <div
            className={cn(
                variant === 'premium'
                    ? 'premium-chip inline-flex items-center gap-1 rounded-full p-1'
                    : 'inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/70 p-1 shadow-[0_14px_36px_-28px_rgba(0,0,0,0.35)] backdrop-blur-xl',
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
                            'inline-flex items-center rounded-full font-semibold uppercase tracking-[0.18em] transition-all duration-300',
                            compact ? 'gap-1.5 px-2.5 py-2 text-[10px]' : 'gap-2 px-3 py-2 text-[11px]',
                            isActive
                                ? variant === 'premium'
                                    ? 'bg-[hsl(var(--premium-ink))] text-[hsl(var(--premium-surface))] shadow-[0_14px_32px_-24px_hsl(var(--premium-shadow)/0.8)]'
                                    : 'bg-foreground text-background shadow-[0_14px_32px_-24px_rgba(15,23,42,0.45)]'
                                : variant === 'premium'
                                  ? 'text-[hsl(var(--premium-muted))] hover:text-[hsl(var(--premium-ink))]'
                                  : 'text-muted-foreground hover:text-foreground'
                        )}
                        aria-pressed={isActive}
                        aria-label={`${item.label} theme`}
                        title={item.mode === 'system' ? `Auto (${resolvedTheme})` : item.label}
                    >
                        <Icon className={compact ? 'h-3.5 w-3.5' : 'h-3.5 w-3.5'} />
                        {!compact && item.label}
                    </button>
                )
            })}
        </div>
    )
}
