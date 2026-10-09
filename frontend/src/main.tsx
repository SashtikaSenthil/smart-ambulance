import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

// Same stylesheet stack as the original pages: Bootstrap 5.3 + Bootstrap Icons + legacy CSS.
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './index.css'
import './styles/legacy/style.css'
import './styles/legacy/analytics.css'
import './styles/legacy/live_summary.css'

import App from './App.tsx'
import { applyTheme, readStoredTheme } from './utils/theme'

// Apply the stored theme before the first render (avoids a light-theme flash).
applyTheme(readStoredTheme() ?? 'light')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
