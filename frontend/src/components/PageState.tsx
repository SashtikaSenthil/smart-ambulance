import { ArrowClockwise } from '@phosphor-icons/react'
import { Button } from './ui/Button'
import { Callout, Skeleton } from './ui/Feedback'

interface PageStateProps {
  loading: boolean
  error: Error | null
  onRetry?: () => void
}

/** Skeleton (shaped like a dashboard page) while loading; inline error with retry on failure. */
export function PageState({ loading, error, onRetry }: PageStateProps) {
  if (error) {
    return (
      <Callout
        tone="crit"
        title="Could not reach the monitoring service"
        action={
          onRetry && (
            <Button variant="secondary" icon={ArrowClockwise} onClick={onRetry}>
              Retry
            </Button>
          )
        }
      >
        <p className="text-crit-ink/90">Check that the backend API is running on port 5001, then retry. ({error.message})</p>
      </Callout>
    )
  }
  if (!loading) return null
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-4">
      <Skeleton className="h-28 w-full rounded-[var(--radius-card)]" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-[var(--radius-card)]" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64 rounded-[var(--radius-card)]" />
        <Skeleton className="h-64 rounded-[var(--radius-card)]" />
      </div>
    </div>
  )
}
