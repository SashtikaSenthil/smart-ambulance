import type { ReactNode } from 'react'
import { CheckCircle, Info, WarningCircle, WarningOctagon, type Icon } from '@phosphor-icons/react'
import { TONE_SOFT, TONE_SOLID, type Tone } from '../../utils/tones'
import { cn } from './cn'

/** Shimmer-free skeleton block (static wash; no infinite motion). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('rounded-[var(--radius-control)] bg-surface-2', className)} />
}

const CALLOUT_ICON: Partial<Record<Tone, Icon>> = { ok: CheckCircle, warn: WarningCircle, serious: WarningCircle, crit: WarningOctagon, info: Info, accent: Info }

/** Inline callout for alerts and notices. */
export function Callout({ tone = 'info', icon, title, children, action, className }: { tone?: Tone; icon?: Icon; title?: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  const IconCmp = icon ?? CALLOUT_ICON[tone] ?? Info
  return (
    <div role={tone === 'crit' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-[var(--radius-control)] px-4 py-3', TONE_SOFT[tone], className)}>
      <IconCmp size={18} weight="fill" aria-hidden className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 text-sm leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  )
}

/** Horizontal meter. The track is a lighter step of the fill's own ramp (dataviz meter rule). */
export function Meter({ value, tone = 'accent', label, className }: { value: number; tone?: Tone; label: string; className?: string }) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn('h-2 w-full overflow-hidden rounded-full', TONE_SOFT[tone], className)}
    >
      <div className={cn('h-full origin-left rounded-full transition-transform duration-700', TONE_SOLID[tone])} style={{ transform: `scaleX(${clamped / 100})` }} />
    </div>
  )
}

/** Live indicator dot (semantic: data is streaming). */
export function LiveDot({ tone = 'ok', className }: { tone?: Tone; className?: string }) {
  return (
    <span className={cn('relative inline-flex size-2', className)} aria-hidden>
      <span className={cn('absolute inset-0 rounded-full opacity-60 motion-safe:animate-ping', TONE_SOLID[tone])} />
      <span className={cn('relative inline-flex size-2 rounded-full', TONE_SOLID[tone])} />
    </span>
  )
}

export function EmptyState({ icon: IconCmp, title, children }: { icon: Icon; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <span className="grid size-11 place-items-center rounded-[var(--radius-control)] bg-surface-2 text-ink-3">
        <IconCmp size={22} weight="duotone" aria-hidden />
      </span>
      <p className="font-medium text-ink">{title}</p>
      {children && <p className="max-w-[48ch] text-sm text-ink-3">{children}</p>}
    </div>
  )
}
