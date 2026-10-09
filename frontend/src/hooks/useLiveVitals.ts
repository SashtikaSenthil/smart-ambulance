import type { LiveVitalsResponse } from '../api/types'
import { usePolling } from './usePolling'

/** Port of static/live_summary.js: poll /api/live-vitals every 2 s. */
export function useLiveVitals(anonymous: boolean) {
  return usePolling<LiveVitalsResponse>('/live-vitals', 2000, { anonymous })
}
