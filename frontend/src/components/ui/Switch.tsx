import { motion } from 'motion/react'
import { cn } from './cn'

interface SwitchProps {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
}

/** Accessible switch (role="switch") with a spring-driven thumb. */
export function Switch({ id, checked, onChange, label, description }: SwitchProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-desc` : undefined}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200',
          checked ? 'bg-accent' : 'bg-surface-3',
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 34 }}
          className={cn('block size-5 rounded-full bg-surface shadow-card', checked ? 'ml-auto' : 'ml-0')}
        />
      </button>
      <label htmlFor={id} className="cursor-pointer text-sm leading-tight select-none">
        <span className="font-medium text-ink">{label}</span>
        {description && (
          <span id={`${id}-desc`} className="block text-xs text-ink-3">
            {description}
          </span>
        )}
      </label>
    </div>
  )
}
