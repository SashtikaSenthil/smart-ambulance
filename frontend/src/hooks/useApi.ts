import { useCallback, useEffect, useState } from 'react'
import { getJSON } from '../api/client'

// React StrictMode mounts effects twice in development. Requests with side
// effects (e.g. /api/dashboard creates a new assessment) must only be sent once
// per mount, so concurrent identical requests share one promise.
const inflight = new Map<string, Promise<unknown>>()

function sharedRequest<T>(key: string, request: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key)
  if (existing) return existing as Promise<T>
  const promise = request().finally(() => inflight.delete(key))
  inflight.set(key, promise)
  return promise
}

export interface ApiState<T> {
  data: T | null
  error: Error | null
  loading: boolean
  reload: () => void
}

interface ResultState<T> {
  key: string
  data: T | null
  error: Error | null
}

/** Fetch a page payload once per mount (and again when path/anonymous change or reload() is called). */
export function useApi<T>(path: string, anonymous = false): ApiState<T> {
  const [reloadToken, setReloadToken] = useState(0)
  const requestKey = `${path}|${anonymous}|${reloadToken}`
  const [result, setResult] = useState<ResultState<T>>({ key: '', data: null, error: null })

  useEffect(() => {
    let active = true
    sharedRequest(requestKey, () => getJSON<T>(path, { anonymous }))
      .then(data => {
        if (active) setResult({ key: requestKey, data, error: null })
      })
      .catch((err: unknown) => {
        if (active) setResult({ key: requestKey, data: null, error: err instanceof Error ? err : new Error(String(err)) })
      })
    return () => {
      active = false
    }
  }, [requestKey, path, anonymous])

  const reload = useCallback(() => setReloadToken(token => token + 1), [])
  const current = result.key === requestKey
  return {
    data: current ? result.data : null,
    error: current ? result.error : null,
    loading: !current,
    reload,
  }
}
