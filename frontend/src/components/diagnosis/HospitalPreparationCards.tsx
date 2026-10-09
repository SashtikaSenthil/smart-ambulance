import { Bed, CheckCircle, Package, UsersThree, Wrench, type Icon } from '@phosphor-icons/react'
import type { HospitalPreparation } from '../../api/types'
import { cn } from '../ui/cn'

const CATEGORY_ICON: Record<string, Icon> = {
  Teams: UsersThree,
  Equipment: Wrench,
  Supplies: Package,
}

/** Teams / Equipment / Supplies / Room setup checklist (same content as before, one accent). */
export function HospitalPreparationCards({ items, compact = false }: { items: HospitalPreparation[]; compact?: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {(items ?? []).map(prep => {
        const IconCmp = CATEGORY_ICON[prep.category] ?? Bed
        return (
          <div key={prep.category} data-print-card className="min-w-0 rounded-[var(--radius-control)] border border-line bg-surface-2/50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-[8px] bg-accent-soft text-accent">
                <IconCmp size={17} weight="duotone" aria-hidden />
              </span>
              <h3 className="text-sm font-semibold text-ink">{prep.category || 'Preparation'}</h3>
            </div>
            <ul className={cn('flex flex-col', compact ? 'gap-1.5' : 'gap-2')}>
              {(prep.details ?? []).map(item => (
                <li key={item} className="flex gap-2 text-[13px] leading-snug text-ink-2">
                  <CheckCircle size={15} weight="fill" aria-hidden className="mt-px shrink-0 text-ok" />
                  <span className="min-w-0">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
