import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { EASE_OUT } from '../ui/motion'

interface PageHeaderProps {
  title: string
  description?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ title, description, meta, actions }: PageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
      className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-end md:justify-between"
    >
      <div className="min-w-0">
        {meta && <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-ink-3">{meta}</div>}
        <h1 className="text-[clamp(1.6rem,1.2rem+1.4vw,2.25rem)] leading-[1.1] font-extrabold tracking-[-0.025em] text-ink">{title}</h1>
        {description && <p className="mt-2 max-w-[65ch] text-[15px] leading-relaxed text-ink-2">{description}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3" data-print-hide>
          {actions}
        </div>
      )}
    </motion.header>
  )
}
