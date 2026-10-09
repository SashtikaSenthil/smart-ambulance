import { useEffect, useRef } from 'react'

/** Run `callback` immediately (optional) and then every `delayMs` while enabled. */
export function useInterval(callback: () => void, delayMs: number, options: { enabled?: boolean; immediate?: boolean } = {}) {
  const { enabled = true, immediate = false } = options
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) return
    if (immediate) savedCallback.current()
    const id = window.setInterval(() => savedCallback.current(), delayMs)
    return () => window.clearInterval(id)
  }, [delayMs, enabled, immediate])
}
