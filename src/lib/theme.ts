export type ThemeMode = 'system' | 'light' | 'dark'

export const THEME_STORAGE_KEY = 'spai_theme_mode'
export const THEME_CHANGE_EVENT = 'spai-theme-change'

export function isThemeMode(value: string | null): value is ThemeMode {
    return value === 'system' || value === 'light' || value === 'dark'
}

export function resolveThemeMode(mode: ThemeMode): 'light' | 'dark' {
    if (typeof window === 'undefined') {
        return 'dark'
    }

    if (mode === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }

    return mode
}

export function getStoredThemeMode(): ThemeMode {
    if (typeof window === 'undefined') {
        return 'system'
    }

    const storedValue = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeMode(storedValue) ? storedValue : 'system'
}

export function applyThemeMode(mode: ThemeMode) {
    if (typeof document === 'undefined') {
        return
    }

    const resolvedTheme = resolveThemeMode(mode)
    const root = document.documentElement

    root.dataset.themeMode = mode
    root.classList.remove('theme-light', 'theme-dark')
    root.classList.add(resolvedTheme === 'dark' ? 'theme-dark' : 'theme-light')
    root.style.colorScheme = resolvedTheme
}

export function setThemeMode(mode: ThemeMode) {
    if (typeof window === 'undefined') {
        return
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, mode)
    applyThemeMode(mode)
    window.dispatchEvent(new CustomEvent<ThemeMode>(THEME_CHANGE_EVENT, { detail: mode }))
}

export const THEME_INIT_SCRIPT = `(() => {
  const storageKey = '${THEME_STORAGE_KEY}';
  const root = document.documentElement;
  const storedValue = window.localStorage.getItem(storageKey);
  const mode = storedValue === 'light' || storedValue === 'dark' || storedValue === 'system' ? storedValue : 'system';
  const resolvedTheme = mode === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : mode;

  root.dataset.themeMode = mode;
  root.classList.remove('theme-light', 'theme-dark');
  root.classList.add(resolvedTheme === 'dark' ? 'theme-dark' : 'theme-light');
  root.style.colorScheme = resolvedTheme;
})();`
