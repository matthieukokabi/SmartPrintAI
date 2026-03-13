export type ThemeMode = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'spai_theme_mode'
export const THEME_CHANGE_EVENT = 'spai-theme-change'

export function isThemeMode(value: string | null): value is ThemeMode {
    return value === 'light' || value === 'dark'
}

function getSystemThemeMode(): ThemeMode {
    if (typeof window === 'undefined') {
        return 'dark'
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function getStoredThemeMode(): ThemeMode | null {
    if (typeof window === 'undefined') {
        return null
    }

    const storedValue = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (storedValue === 'system') {
        window.localStorage.removeItem(THEME_STORAGE_KEY)
        return null
    }

    return isThemeMode(storedValue) ? storedValue : null
}

export function getPreferredThemeMode(): ThemeMode {
    return getStoredThemeMode() ?? getSystemThemeMode()
}

export function applyThemeMode(mode: ThemeMode) {
    if (typeof document === 'undefined') {
        return
    }

    const root = document.documentElement

    root.dataset.themeMode = mode
    root.classList.remove('theme-light', 'theme-dark')
    root.classList.add(mode === 'dark' ? 'theme-dark' : 'theme-light')
    root.style.colorScheme = mode
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
  if (storedValue === 'system') {
    window.localStorage.removeItem(storageKey);
  }
  const mode = storedValue === 'light' || storedValue === 'dark'
    ? storedValue
    : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  root.dataset.themeMode = mode;
  root.classList.remove('theme-light', 'theme-dark');
  root.classList.add(mode === 'dark' ? 'theme-dark' : 'theme-light');
  root.style.colorScheme = mode;
})();`
