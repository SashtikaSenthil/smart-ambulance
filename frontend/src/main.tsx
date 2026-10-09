import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { MotionConfig } from 'motion/react'

import './index.css'

import App from './App.tsx'
import { ThemeProvider } from './theme/ThemeProvider'
import { applyResolvedTheme, readThemePreference, resolveTheme } from './utils/theme'

// Apply the theme before the first paint (no light flash for dark-mode users).
applyResolvedTheme(resolveTheme(readThemePreference()))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      {/* Respect prefers-reduced-motion everywhere: transforms/layout animations are skipped. */}
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MotionConfig>
    </ThemeProvider>
  </StrictMode>,
)
