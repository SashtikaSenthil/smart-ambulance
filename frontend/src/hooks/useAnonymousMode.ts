import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

const TRUTHY = ['1', 'true', 'yes', 'on']

/** Anonymous intake mode lives in the URL (?anonymous=1), exactly like the original Flask pages. */
export function useAnonymousMode(): [boolean, (enabled: boolean) => void] {
  const [searchParams, setSearchParams] = useSearchParams()
  const anonymous = TRUTHY.includes(String(searchParams.get('anonymous') ?? '0').trim().toLowerCase())

  const setAnonymous = useCallback(
    (enabled: boolean) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        if (enabled) next.set('anonymous', '1')
        else next.delete('anonymous')
        return next
      })
    },
    [setSearchParams],
  )

  return [anonymous, setAnonymous]
}
