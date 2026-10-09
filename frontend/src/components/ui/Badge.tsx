import type { ReactNode } from 'react'
import { CheckCircle, Circle, Info, WarningCircle, WarningDiamond, WarningOctagon, type Icon } from '@phosphor-icons/react'
import { TONE_SOFT, type Tone } from '../../utils/tones'
import { cn } from './cn'

const STATUS_ICON: Record<Tone, Icon> = {
  ok: CheckCircle,
  warn: WarningCircle,
  serious: WarningDiamond,
  crit: WarningOctagon,
  info: Info,
  accent: Info,
  neutral: Circle,
}

interface BadgeProps {
  tone?: Tone
  /** Show the tone's status icon (status colours never carry meaning alone). */
  status?: boolean
  icon?: Icon
  size?: 'sm' | 'md'
  className?: string
  children: ReactNode
}

export function Badge({ tone = 'neutral', status = false, icon, size = 'sm', className, children }: BadgeProps) {
  const IconCmp = icon ?? (status ? STATUS_ICON[tone] : undefined)
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-[var(--radius-badge)] font-medium whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-[13px]',
        TONE_SOFT[tone],
        className,
      )}
    >
      {IconCmp && <IconCmp size={size === 'sm' ? 13 : 15} weight="bold" aria-hidden className="shrink-0" />}
      <span className="truncate">{children}</span>
    </span>
  )
}
