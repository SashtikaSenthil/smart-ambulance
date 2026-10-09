import type { HTMLAttributes, ReactNode } from 'react'
import type { Icon } from '@phosphor-icons/react'
import { TONE_SOFT, type Tint, type Tone } from '../../utils/tones'
import { cn } from './cn'
import { Reveal } from './Reveal'

interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Animate in on scroll (default true). */
  reveal?: boolean
  delay?: number
  as?: 'section' | 'article' | 'div'
  /** Grid placement classes (e.g. "lg:col-span-2"); applied to the outermost element, which is the grid item. */
  span?: string
  /** Subtle colour family for the card surface, border, icon chip and single-series charts inside it. */
  tint?: Tint
}

export function Card({ reveal = true, delay = 0, as: Tag = 'section', span, tint, className, children, ...rest }: CardProps) {
  const card = (
    <Tag
      data-print-card
      data-tint={tint}
      className={cn(
        'h-full min-w-0 rounded-[var(--radius-card)] border border-line bg-surface shadow-card transition-shadow duration-300',
        tint && 'card-tinted',
        !reveal && span,
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
  if (!reveal) return card
  return (
    <Reveal delay={delay} className={cn('min-w-0', span)}>
      {card}
    </Reveal>
  )
}

interface CardHeaderProps {
  icon?: Icon
  title: ReactNode
  description?: ReactNode
  aside?: ReactNode
  /** Status tone for the icon chip; defaults to the card's tint. */
  tone?: Tone
  className?: string
}

export function CardHeader({ icon: IconCmp, title, description, aside, tone, className }: CardHeaderProps) {
  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5 sm:px-6', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {IconCmp && (
          <span className={cn('grid size-10 shrink-0 place-items-center rounded-[12px]', tone ? TONE_SOFT[tone] : 'tint-chip')}>
            <IconCmp size={20} weight="duotone" aria-hidden />
          </span>
        )}
        <div className="min-w-0 pt-0.5">
          <h2 className="text-base leading-tight font-bold tracking-tight text-ink">{title}</h2>
          {description && <p className="mt-1 text-sm leading-relaxed text-ink-3">{description}</p>}
        </div>
      </div>
      {aside && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{aside}</div>}
    </header>
  )
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('px-5 pt-4 pb-5 sm:px-6 sm:pb-6', className)}>{children}</div>
}
