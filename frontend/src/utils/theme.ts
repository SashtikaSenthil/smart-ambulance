// Theme handling identical to the original pages: 'dashboard-theme' in localStorage, body.theme-dark class.

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'dashboard-theme'

export function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'dark' || stored === 'light' ? stored : null
  } catch {
    return null
  }
}

export function applyTheme(theme: Theme) {
  document.body.classList.toggle('theme-dark', theme === 'dark')
}
