import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { applyTheme, readStoredTheme, THEME_STORAGE_KEY, type Theme } from '../../utils/theme'

// Same localStorage key and (inverted) semantics as the original pages: '1' = open, '0' = collapsed.
const SIDEBAR_STORAGE_KEY = 'dashboard-sidebar-collapsed'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: 'bi-house', end: true },
  { to: '/records', label: 'Patient Records', icon: 'bi-file-earmark-medical', end: false },
  { to: '/analysis', label: 'AI Analysis', icon: 'bi-activity', end: false },
  { to: '/doctor-summary', label: 'Doctor Summary', icon: 'bi-clipboard2-pulse', end: false },
]

function readSidebarOpen(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) !== '0'
  } catch {
    return true
  }
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen)
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme() ?? 'light')

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggleSidebar = () => {
    const next = !sidebarOpen
    setSidebarOpen(next)
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? '1' : '0')
    } catch {
      /* storage unavailable */
    }
  }

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      /* storage unavailable */
    }
  }

  return (
    <>
      {/* Sidebar */}
      <div className="sidebar">
        <nav className="sidebar-nav">
          <div
            className={`sidebar-toggle${sidebarOpen ? ' open' : ''}`}
            id="sidebarToggle"
            role="button"
            tabIndex={0}
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            onClick={toggleSidebar}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                toggleSidebar()
              }
            }}
          >
            <span></span>
          </div>

          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}${sidebarOpen ? ' animate' : ''}`}
              data-tooltip={item.label}
              aria-label={item.label}
            >
              <i className={`bi ${item.icon}`}></i>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Expand button (hidden by style.css, kept for parity) */}
        <button className="sidebar-expand-btn" id="sidebarExpandBtn" aria-label="Expand sidebar" type="button">
          <i className="bi bi-chevron-right"></i>
        </button>

        {/* Top Navigation */}
        <nav className="top-navbar" aria-label="Top controls">
          <div className="top-navbar-inner">
            <button className="theme-toggle" id="themeToggle" aria-label="Toggle theme" type="button" onClick={toggleTheme}>
              <i className={theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill'} id="themeIcon"></i>
            </button>
          </div>
        </nav>

        <div className="content-wrapper">
          <Outlet />
        </div>
      </div>
    </>
  )
}
