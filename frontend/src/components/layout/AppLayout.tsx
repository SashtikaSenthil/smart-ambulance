import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useOutlet } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ReactLenis, useLenis } from 'lenis/react'
import { Ambulance, CaretDoubleLeft, CaretDoubleRight, Desktop, Moon, Sun } from '@phosphor-icons/react'
import { useTheme } from '../../theme/themeContext'
import type { ThemePreference } from '../../utils/theme'
import { IconButton } from '../ui/Button'
import { cn } from '../ui/cn'
import { LiveDot } from '../ui/Feedback'
import { EASE_OUT } from '../ui/motion'
import { SegmentedControl } from '../ui/SegmentedControl'
import { ErrorBoundary } from './ErrorBoundary'
import { NAV_ITEMS } from './navigation'

// Same localStorage key and semantics as the original app: '1' = expanded, '0' = collapsed.
const SIDEBAR_STORAGE_KEY = 'dashboard-sidebar-collapsed'

function readSidebarOpen(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) !== '0'
  } catch {
    return true
  }
}

const THEME_OPTIONS: { value: ThemePreference; label: ReactNode; ariaLabel: string }[] = [
  { value: 'light', label: <Sun size={15} weight="bold" aria-hidden />, ariaLabel: 'Light theme' },
  { value: 'dark', label: <Moon size={15} weight="bold" aria-hidden />, ariaLabel: 'Dark theme' },
  { value: 'system', label: <Desktop size={15} weight="bold" aria-hidden />, ariaLabel: 'Match system theme' },
]

const NEXT_THEME: Record<ThemePreference, ThemePreference> = { system: 'light', light: 'dark', dark: 'system' }
const THEME_ICON = { light: Sun, dark: Moon, system: Desktop }

export function AppLayout() {
  const reduceMotion = useReducedMotion()
  const content = <Shell />
  // Inertial smooth scroll; native scrolling when the user prefers reduced motion.
  if (reduceMotion) return content
  return (
    <ReactLenis root options={{ lerp: 0.11, smoothWheel: true, wheelMultiplier: 1, syncTouch: false }}>
      {content}
    </ReactLenis>
  )
}

function Shell() {
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen)
  const location = useLocation()

  const toggleSidebar = () => {
    const next = !sidebarOpen
    setSidebarOpen(next)
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? '1' : '0')
    } catch {
      /* storage unavailable */
    }
  }

  return (
    <div className="min-h-[100dvh]" style={{ ['--sidebar-w' as string]: sidebarOpen ? '248px' : '76px' }}>
      <a
        href="#main"
        className="fixed top-3 left-3 z-[60] -translate-y-20 rounded-[var(--radius-control)] bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>

      <DesktopSidebar open={sidebarOpen} onToggle={toggleSidebar} />
      <MobileTopBar />

      <main id="main" className="min-w-0 pb-safe-nav lg:pb-0 lg:pl-[var(--sidebar-w)]">
        <div className="mx-auto w-full max-w-[1440px] px-4 pt-5 pb-10 sm:px-6 sm:pt-7 lg:px-10 lg:pt-10 lg:pb-16">
          <ScrollToTop pathname={location.pathname} />
          <ErrorBoundary resetKey={location.pathname}>
            <RouteTransition pathname={location.pathname} />
          </ErrorBoundary>
        </div>
      </main>

      <MobileTabBar />
    </div>
  )
}

/** Keeps the outgoing page's element while it animates out. */
function FrozenOutlet() {
  const outlet = useOutlet()
  const [frozen] = useState(outlet)
  return frozen
}

function RouteTransition({ pathname }: { pathname: string }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.28, ease: EASE_OUT }}
      >
        <FrozenOutlet />
      </motion.div>
    </AnimatePresence>
  )
}

function ScrollToTop({ pathname }: { pathname: string }) {
  const lenis = useLenis()
  useEffect(() => {
    if (lenis) lenis.scrollTo(0, { immediate: true })
    else window.scrollTo({ top: 0 })
  }, [pathname, lenis])
  return null
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="brand-gradient grid size-10 shrink-0 place-items-center rounded-[12px] text-white shadow-[0_8px_20px_-8px_rgb(8_145_178/0.7)]">
        <Ambulance size={22} weight="fill" aria-hidden />
      </span>
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[15px] font-semibold tracking-tight text-ink">AI Ambulance</span>
          <span className="block truncate text-xs text-ink-3">Pre-hospital care</span>
        </span>
      )}
    </div>
  )
}

function DesktopSidebar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { preference, setPreference } = useTheme()

  return (
    <aside
      data-print-hide
      aria-label="Primary"
      className="fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-w)] flex-col border-r border-line bg-surface/80 backdrop-blur-xl supports-[not(backdrop-filter:blur(1px))]:bg-surface lg:flex"
    >
      <div className={cn('flex h-[72px] items-center px-4', open ? 'justify-between' : 'justify-center')}>
        <Brand compact={!open} />
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 pt-4" aria-label="Main">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={open ? undefined : item.label}
            aria-label={open ? undefined : item.label}
            className={({ isActive }) =>
              cn(
                'group relative flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm font-medium transition-colors duration-200',
                open ? '' : 'justify-center',
                isActive ? 'text-ink' : 'text-ink-3 hover:bg-surface-2 hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-[var(--radius-control)] bg-[linear-gradient(100deg,color-mix(in_oklab,var(--accent)_16%,transparent),color-mix(in_oklab,var(--accent-2)_7%,transparent))] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--accent)_18%,transparent)]"
                    transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                  />
                )}
                <item.icon size={20} weight={isActive ? 'fill' : 'regular'} aria-hidden className={cn('relative shrink-0', isActive && 'text-accent')} />
                {open && <span className="relative truncate">{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="flex flex-col gap-3 border-t border-line p-3">
        <div className={cn('flex items-center gap-2 px-2 text-xs text-ink-3', !open && 'justify-center')}>
          <LiveDot />
          {open && <span>Live telemetry</span>}
        </div>
        {open ? (
          <SegmentedControl label="Theme" size="sm" value={preference} onChange={setPreference} options={THEME_OPTIONS} className="w-full [&>button]:flex-1" />
        ) : (
          <ThemeCycleButton />
        )}
        <IconButton
          icon={open ? CaretDoubleLeft : CaretDoubleRight}
          label={open ? 'Collapse sidebar' : 'Expand sidebar'}
          onClick={onToggle}
          className={cn(open ? 'self-end' : 'self-center')}
        />
      </div>
    </aside>
  )
}

function ThemeCycleButton() {
  const { preference, setPreference } = useTheme()
  const IconCmp = THEME_ICON[preference]
  const label = preference === 'system' ? 'Theme: system (switch to light)' : preference === 'light' ? 'Theme: light (switch to dark)' : 'Theme: dark (switch to system)'
  return <IconButton icon={IconCmp} label={label} onClick={() => setPreference(NEXT_THEME[preference])} className="self-center" />
}

function MobileTopBar() {
  return (
    <header
      data-print-hide
      className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-line bg-surface/85 px-4 backdrop-blur-md supports-[not(backdrop-filter:blur(1px))]:bg-surface sm:px-6 lg:hidden"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <Brand />
      <div className="flex items-center gap-1">
        <span className="mr-2 hidden items-center gap-2 text-xs text-ink-3 sm:flex">
          <LiveDot /> Live telemetry
        </span>
        <ThemeCycleButton />
      </div>
    </header>
  )
}

function MobileTabBar() {
  return (
    <nav
      data-print-hide
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 backdrop-blur-md supports-[not(backdrop-filter:blur(1px))]:bg-surface lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto grid max-w-xl grid-cols-4 px-2">
        {NAV_ITEMS.map(item => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              aria-label={item.label}
              className={({ isActive }) =>
                cn('relative flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors', isActive ? 'text-accent' : 'text-ink-3')
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="tabbar-active"
                      className="brand-gradient absolute top-0 h-[3px] w-10 rounded-full"
                      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                    />
                  )}
                  <item.icon size={22} weight={isActive ? 'fill' : 'regular'} aria-hidden />
                  <span>{item.shortLabel}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
