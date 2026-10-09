import { useEffect, useRef, type ElementType, type HTMLAttributes } from 'react'

interface LiveTextProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  value: string | number | null | undefined
}

/**
 * Text that replays the `.live-flash` animation whenever its value changes
 * (port of setText()/flash() in the original static/live_summary.js).
 */
export function LiveText({ as: Tag = 'span', value, ...rest }: LiveTextProps) {
  const ref = useRef<HTMLElement | null>(null)
  const previous = useRef(value)

  useEffect(() => {
    const el = ref.current
    if (!el || previous.current === value) return
    previous.current = value
    el.classList.remove('live-flash')
    void el.offsetWidth
    el.classList.add('live-flash')
  }, [value])

  return (
    <Tag {...rest} ref={ref}>
      {value ?? ''}
    </Tag>
  )
}
