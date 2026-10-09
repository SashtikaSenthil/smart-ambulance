import { cn } from './ui/cn'

interface BulletListProps {
  items: readonly string[] | null | undefined
  className?: string
  /** Use a smaller text size. */
  dense?: boolean
}

/** Readable bullet list (replaces the legacy `.bullet-row` divs). */
export function BulletList({ items, className, dense = false }: BulletListProps) {
  const list = items ?? []
  if (list.length === 0) return null
  return (
    <ul className={cn('flex flex-col', dense ? 'gap-1.5 text-[13px]' : 'gap-2.5 text-sm', className)}>
      {list.map((item, index) => (
        <li key={`${index}-${item}`} className="flex gap-3 leading-relaxed text-ink-2">
          <span aria-hidden className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-accent/60" />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  )
}
