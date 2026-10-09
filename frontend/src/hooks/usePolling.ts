import { useCallback, useRef, useState } from 'react'
import { getJSON } from '../api/client'
import { useInterval } from './useInterval'

export interface PollingState<T> {
  data: T | null
  error: Error | null
  lastUpdated: Date | null
}

/**
 * Poll a JSON endpoint every `intervalMs` (2 s in the original pages).
 * Skips a tick while the previous request is still running or the tab is hidden.
 */
export function usePolling<T>(path: string, intervalMs = 2000, options: { anonymous?: boolean; enabled?: boolean } = {}): PollingState<T> {
  const { anonymous = false, enabled = true } = options
  const [state, setState] = useState<PollingState<T>>({ data: null, error: null, lastUpdated: null })
  const inFlight = useRef(false)

  const poll = useCallback(async () => {
    if (inFlight.current || document.hidden) return
    inFlight.current = true
    try {
      const data = await getJSON<T>(path, { anonymous })
      setState({ data, error: null, lastUpdated: new Date() })
    } catch (err) {
      console.warn(`Polling ${path} failed:`, err)
      setState(prev => ({ ...prev, error: err instanceof Error ? err : new Error(String(err)) }))
    } finally {
      inFlight.current = false
    }
  }, [path, anonymous])

  useInterval(poll, intervalMs, { enabled, immediate: true })
  return state
}
