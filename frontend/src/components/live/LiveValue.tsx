import { useEffect, useRef, useState, type ElementType, type HTMLAttributes } from 'react'
import { animate, useReducedMotion } from 'motion/react'

const NUMBER = /-?\d+(?:\.\d+)?/g

function decimalsOf(token: string): number {
  const dot = token.indexOf('.')
  return dot === -1 ? 0 : token.length - dot - 1
}

/** A single number that tweens to its new value (writes to the DOM, no React re-render per frame). */
function TweenNumber({ value, decimals }: { value: number; decimals: number }) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const current = useRef(value)
  const reduce = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const from = current.current
    current.current = value
    if (reduce || from === value) {
      el.textContent = value.toFixed(decimals)
      return
    }
    const controls = animate(from, value, {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: latest => {
        el.textContent = latest.toFixed(decimals)
      },
    })
    return () => controls.stop()
  }, [value, decimals, reduce])

  // React renders the first value only; later updates are written by the effect above,
  // so React never snaps the text to the final value before the tween starts.
  const [initial] = useState(() => value.toFixed(decimals))
  return <span ref={ref}>{initial}</span>
}

interface LiveValueProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  value: string | number | null | undefined
  /** Tween the numbers inside the value (default true). */
  tween?: boolean
}

/**
 * Live reading: numbers inside the string tween to new values ("86 BPM" -> "91 BPM",
 * "118/76 mmHg"), and the element gets a brief highlight when the value changes.
 */
export function LiveValue({ as: Tag = 'span', value, tween = true, className, ...rest }: LiveValueProps) {
  const ref = useRef<HTMLElement | null>(null)
  const text = value == null ? '' : String(value)
  const previous = useRef(text)

  useEffect(() => {
    const el = ref.current
    if (!el || previous.current === text) return
    previous.current = text
    el.classList.remove('live-flash')
    void el.offsetWidth
    el.classList.add('live-flash')
  }, [text])

  const parts: { text: string; number: boolean }[] = []
  if (tween) {
    let last = 0
    for (const match of text.matchAll(NUMBER)) {
      const index = match.index ?? 0
      if (index > last) parts.push({ text: text.slice(last, index), number: false })
      parts.push({ text: match[0], number: true })
      last = index + match[0].length
    }
    if (last < text.length) parts.push({ text: text.slice(last), number: false })
  } else {
    parts.push({ text, number: false })
  }

  return (
    <Tag ref={ref} className={className} {...rest}>
      {parts.map((part, index) =>
        part.number ? <TweenNumber key={index} value={Number(part.text)} decimals={decimalsOf(part.text)} /> : <span key={index}>{part.text}</span>,
      )}
    </Tag>
  )
}
