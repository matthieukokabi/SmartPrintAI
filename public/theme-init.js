(() => {
  try {
    const storageKey = 'spai_theme_mode';
    const root = document.documentElement;
    const storedValue = window.localStorage.getItem(storageKey);
    if (storedValue === 'system') {
      window.localStorage.removeItem(storageKey);
    }

    const mode =
      storedValue === 'light' || storedValue === 'dark'
        ? storedValue
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';

    root.dataset.themeMode = mode;
    root.classList.remove('theme-light', 'theme-dark');
    root.classList.add(mode === 'dark' ? 'theme-dark' : 'theme-light');
    root.style.colorScheme = mode;
  } catch {
    // Keep rendering resilient when storage APIs are blocked.
  }
})();

