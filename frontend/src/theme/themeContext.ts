import { createContext, useContext } from 'react'
import type { ResolvedTheme, ThemePreference } from '../utils/theme'

export interface ThemeContextValue {
  preference: ThemePreference
  resolved: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  preference: 'system',
  resolved: 'light',
  setPreference: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}
