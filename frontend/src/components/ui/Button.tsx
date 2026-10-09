import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import type { Icon } from '@phosphor-icons/react'
import { cn } from './cn'

type Variant = 'primary' | 'secondary' | 'ghost'

const VARIANT: Record<Variant, string> = {
  primary:
    'brand-gradient text-white shadow-[0_1px_0_rgb(255_255_255/0.2)_inset,0_10px_24px_-12px_rgb(8_145_178/0.75)] hover:brightness-110 hover:shadow-[0_1px_0_rgb(255_255_255/0.2)_inset,0_14px_28px_-12px_rgb(8_145_178/0.85)]',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-surface-2',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
}

const BASE =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] px-4 text-sm font-semibold whitespace-nowrap transition-[background-color,color,transform,box-shadow,filter] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50'

interface CommonProps {
  variant?: Variant
  icon?: Icon
  iconRight?: Icon
  children: ReactNode
}

export function Button({ variant = 'secondary', icon: IconL, iconRight: IconR, className, children, ...rest }: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={cn(BASE, VARIANT[variant], className)} {...rest}>
      {IconL && <IconL size={17} weight="bold" aria-hidden />}
      {children}
      {IconR && <IconR size={17} weight="bold" aria-hidden />}
    </button>
  )
}

export function ButtonLink({ variant = 'secondary', icon: IconL, iconRight: IconR, className, children, ...rest }: CommonProps & LinkProps) {
  return (
    <Link className={cn(BASE, VARIANT[variant], className)} {...rest}>
      {IconL && <IconL size={17} weight="bold" aria-hidden />}
      {children}
      {IconR && <IconR size={17} weight="bold" aria-hidden />}
    </Link>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: Icon
  label: string
}

export function IconButton({ icon: IconCmp, label, className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] text-ink-2 transition-[background-color,color,transform] duration-200 hover:bg-surface-2 hover:text-ink active:scale-[0.96]',
        className,
      )}
      {...rest}
    >
      <IconCmp size={19} weight="bold" aria-hidden />
    </button>
  )
}
