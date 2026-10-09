import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ArrowClockwise, WarningOctagon } from '@phosphor-icons/react'

interface ErrorBoundaryProps {
  /** Changing this key (e.g. the route) clears a previous error. */
  resetKey: string
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
  key: string
}

/** Keeps a rendering error in one page from blanking the whole app. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, key: this.props.resetKey }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error }
  }

  static getDerivedStateFromProps(props: ErrorBoundaryProps, state: ErrorBoundaryState): Partial<ErrorBoundaryState> | null {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page crashed:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
        <span className="grid size-12 place-items-center rounded-[var(--radius-control)] bg-crit-soft text-crit-ink">
          <WarningOctagon size={24} weight="duotone" aria-hidden />
        </span>
        <h1 className="text-lg font-semibold text-ink">This view could not be displayed</h1>
        <p className="text-sm text-ink-3">The rest of the app still works. Reload the view to try again.</p>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-control)] bg-accent px-4 text-sm font-medium text-accent-ink hover:bg-accent-hover"
        >
          <ArrowClockwise size={17} weight="bold" aria-hidden />
          Reload view
        </button>
      </div>
    )
  }
}
