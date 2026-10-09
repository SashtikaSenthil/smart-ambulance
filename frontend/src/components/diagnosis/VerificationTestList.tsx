import type { VerificationTest } from '../../api/types'
import { TONE_SOFT, type Tone } from '../../utils/tones'
import { cn } from '../ui/cn'

/** Numbered test list. Stacks on small screens, three aligned columns from md up. */
export function VerificationTestList({ tests, tone }: { tests: VerificationTest[]; tone: Tone }) {
  return (
    <ol className="divide-y divide-line overflow-hidden rounded-[var(--radius-control)] border border-line">
      {tests.map((test, index) => (
        <li key={`${index}-${test.test}`} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 px-4 py-3 md:grid-cols-[auto_minmax(0,2fr)_minmax(0,3fr)] md:items-center">
          <span className={cn('tabular grid size-6 place-items-center rounded-[6px] text-xs font-semibold', TONE_SOFT[tone])}>{index + 1}</span>
          <span className="text-sm font-semibold text-ink">{test.test}</span>
          <span className="col-start-2 text-[13px] leading-snug text-ink-2 md:col-start-3">{test.purpose}</span>
        </li>
      ))}
    </ol>
  )
}
