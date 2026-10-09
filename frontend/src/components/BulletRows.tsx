interface BulletRowsProps {
  items: readonly string[] | null | undefined
  className?: string
}

/** `<div class="bullet-row">` list used throughout the original templates. */
export function BulletRows({ items, className = 'bullet-row' }: BulletRowsProps) {
  return (
    <>
      {(items ?? []).map((item, index) => (
        <div className={className} key={`${index}-${item}`}>
          {item}
        </div>
      ))}
    </>
  )
}
