import { useId, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from './cn'

interface SegmentedControlProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: ReactNode; ariaLabel?: string }[]
  label: string
  size?: 'sm' | 'md'
  className?: string
}

/** Radio-group style control with a sliding selection indicator. */
export function SegmentedControl<T extends string>({ value, onChange, options, label, size = 'md', className }: SegmentedControlProps<T>) {
  const groupId = useId()
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-[var(--radius-control)] bg-surface-2 p-1', className)}>
      {options.map(option => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.ariaLabel}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative inline-flex items-center justify-center gap-1.5 rounded-[7px] font-medium whitespace-nowrap transition-colors duration-200',
              size === 'sm' ? 'min-h-8 px-2.5 text-xs' : 'min-h-9 px-3 text-sm',
              selected ? 'text-ink' : 'text-ink-3 hover:text-ink-2',
            )}
          >
            {selected && (
              <motion.span
                layoutId={`seg-${groupId}`}
                className="absolute inset-0 rounded-[7px] bg-surface shadow-card"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-[1] inline-flex items-center gap-1.5">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
