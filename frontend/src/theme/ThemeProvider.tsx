import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { applyResolvedTheme, readThemePreference, resolveTheme, writeThemePreference, type ThemePreference } from '../utils/theme'
import { ThemeContext } from './themeContext'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readThemePreference)
  const [systemDark, setSystemDark] = useState(() => resolveTheme('system') === 'dark')

  // Follow OS changes while in "system" mode.
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const resolved = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference

  useEffect(() => {
    applyResolvedTheme(resolved)
  }, [resolved])

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    writeThemePreference(next)
  }, [])

  const value = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved, setPreference])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
