import type { HTMLAttributes, ReactNode } from 'react'
import type { Icon } from '@phosphor-icons/react'
import { TONE_SOFT, type Tone } from '../../utils/tones'
import { cn } from './cn'
import { Reveal } from './Reveal'

interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Animate in on scroll (default true). */
  reveal?: boolean
  delay?: number
  as?: 'section' | 'article' | 'div'
}

export function Card({ reveal = true, delay = 0, as: Tag = 'section', className, children, ...rest }: CardProps) {
  const card = (
    <Tag
      data-print-card
      className={cn('min-w-0 rounded-[var(--radius-card)] border border-line bg-surface shadow-card', className)}
      {...rest}
    >
      {children}
    </Tag>
  )
  if (!reveal) return card
  return (
    <Reveal delay={delay} className="min-w-0">
      {card}
    </Reveal>
  )
}

interface CardHeaderProps {
  icon?: Icon
  title: ReactNode
  description?: ReactNode
  aside?: ReactNode
  tone?: Tone
  className?: string
}

export function CardHeader({ icon: IconCmp, title, description, aside, tone = 'accent', className }: CardHeaderProps) {
  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5 sm:px-6', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {IconCmp && (
          <span className={cn('grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)]', TONE_SOFT[tone])}>
            <IconCmp size={18} weight="duotone" aria-hidden />
          </span>
        )}
        <div className="min-w-0 pt-1">
          <h2 className="text-[15px] leading-tight font-semibold text-ink">{title}</h2>
          {description && <p className="mt-1 text-sm leading-relaxed text-ink-3">{description}</p>}
        </div>
      </div>
      {aside && <div className="flex shrink-0 flex-wrap items-center gap-2">{aside}</div>}
    </header>
  )
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('px-5 pt-4 pb-5 sm:px-6 sm:pb-6', className)}>{children}</div>
}
