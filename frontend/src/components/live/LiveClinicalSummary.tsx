import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowRight,
  Broadcast,
  CaretDown,
  CaretUp,
  ClockCountdown,
  HourglassMedium,
  ListChecks,
  Phone,
  TrendDown,
  TrendUp,
  Waveform,
  type Icon,
} from '@phosphor-icons/react'
import type { LiveVitalsResponse, Sbar, SummaryPattern, TrendBlock, VitalsSummary } from '../../api/types'
import { patternTone, summaryRiskTone, type Tint, TONE_BORDER_L, TONE_SOLID, TONE_TEXT, trendTone, triageTone, vitalSeverityTone } from '../../utils/tones'
import { BulletList } from '../BulletList'
import { Badge } from '../ui/Badge'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { cn } from '../ui/cn'
import { Callout, LiveDot, Skeleton } from '../ui/Feedback'
import { EASE_OUT } from '../ui/motion'

interface LiveClinicalSummaryCardProps {
  title: string
  live: LiveVitalsResponse | null
  error: Error | null
  lastUpdated: Date | null
  showVitals?: boolean
  showSbar?: boolean
  className?: string
  tint?: Tint
}

const TREND_ICON: Record<string, Icon> = {
  Deteriorating: TrendDown,
  'Slowly worsening': TrendDown,
  Improving: TrendUp,
  'Slowly improving': TrendUp,
  Stable: ArrowRight,
  'Establishing baseline': HourglassMedium,
}

/** The live, rule-based clinical summary shared by Dashboard, Analysis and Doctor Summary. */
export function LiveClinicalSummaryCard({ title, live, error, lastUpdated, showVitals = false, showSbar = false, className, tint = 'teal' }: LiveClinicalSummaryCardProps) {
  const status = error ? 'Connection lost, retrying' : lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Connecting'

  return (
    <Card className={className} tint={tint}>
      <CardHeader
        icon={Broadcast}
        title={title}
        description="Regenerated from the vitals every 2 seconds."
        aside={
          <span role="status" aria-live="polite" className={cn('inline-flex items-center gap-2 text-xs', error ? 'text-crit-ink' : 'text-ink-3')}>
            <LiveDot tone={error ? 'crit' : 'ok'} />
            <span className="tabular">{status}</span>
          </span>
        }
      />
      <CardBody>
        {live?.summary ? (
          <SummaryBody summary={live.summary} showVitals={showVitals} showSbar={showSbar} />
        ) : (
          <div className="flex flex-col gap-3" aria-busy="true">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}
      </CardBody>
    </Card>
  )
}

function SummaryBody({ summary, showVitals, showSbar }: { summary: VitalsSummary; showVitals: boolean; showSbar: boolean }) {
  const risk = summary.risk_level || 'Low'
  const news = summary.scores?.news2
  const qsofa = summary.scores?.qsofa
  const sirs = summary.scores?.sirs
  const direction = summary.trend?.direction ?? 'Stable'
  const TrendIcon = TREND_ICON[direction] ?? ArrowRight

  return (
    <div className="flex flex-col gap-6">
      {/* Status row */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={summaryRiskTone(risk)} status size="md" className={cn(risk === 'Critical' && 'ring-1 ring-crit/40')}>
            {risk} risk
          </Badge>
          <Badge tone={triageTone(summary.triage)} status size="md">
            Triage {summary.triage}
          </Badge>
          <Badge tone={trendTone(direction)} icon={TrendIcon} size="md">
            {direction}
          </Badge>
          <span className="mx-1 hidden h-5 w-px bg-line-strong sm:block" aria-hidden />
          <Badge size="md">
            <span title={news?.note}>
              NEWS2 <span className="tabular font-semibold text-ink">{news?.score}</span> <span className="text-ink-3">({news?.band})</span>
            </span>
          </Badge>
          <Badge size="md">
            <span title={qsofa?.note}>
              qSOFA <span className="tabular font-semibold text-ink">{qsofa?.score}/2</span>
            </span>
          </Badge>
          <Badge size="md">
            <span title={sirs?.note}>
              SIRS <span className="tabular font-semibold text-ink">{sirs?.score}/3</span>
            </span>
          </Badge>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.h3
            key={summary.headline}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="text-[clamp(1.05rem,0.95rem+0.5vw,1.3rem)] leading-snug font-semibold text-ink"
          >
            {summary.headline}
          </motion.h3>
        </AnimatePresence>
      </div>

      {showVitals && <VitalStrip summary={summary} />}

      {summary.alerts?.length > 0 && (
        <Callout tone="crit" title={summary.alerts.length > 1 ? `${summary.alerts.length} critical alerts` : 'Critical alert'}>
          <ul className="mt-1 flex flex-col gap-1">
            {summary.alerts.map(alert => (
              <li key={alert}>{alert}</li>
            ))}
          </ul>
        </Callout>
      )}

      <p className="max-w-[80ch] text-[15px] leading-relaxed text-ink-2">{summary.narrative}</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="min-w-0">
          <SectionTitle icon={ListChecks}>Key findings</SectionTitle>
          <BulletList items={summary.key_findings} />
        </section>
        <section className="min-w-0">
          <SectionTitle icon={Waveform}>Detected patterns</SectionTitle>
          <Patterns patterns={summary.patterns} />
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="min-w-0">
          <SectionTitle>Haemodynamic indices</SectionTitle>
          <dl className="divide-y divide-line rounded-[var(--radius-control)] border border-line">
            {Object.entries(summary.derived_indices ?? {}).map(([key, idx]) => (
              <div key={key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 px-4 py-2.5 sm:grid-cols-[minmax(0,11rem)_auto_minmax(0,1fr)] sm:items-center">
                <dt className="text-[13px] text-ink-2">{idx.label}</dt>
                <dd className="tabular text-right text-sm font-semibold text-ink sm:text-left">
                  {idx.value}
                  {idx.unit && <span className="ml-1 text-xs font-normal text-ink-3">{idx.unit}</span>}
                </dd>
                <dd className="col-span-2 text-xs leading-snug text-ink-3 sm:col-span-1">{idx.note}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="min-w-0">
          <SectionTitle>
            Trend <span className="font-normal text-ink-3">(last {summary.trend?.window_seconds ?? 0} s)</span>
          </SectionTitle>
          <Trend trend={summary.trend} />
        </section>
      </div>

      <section>
        <SectionTitle>Recommended actions</SectionTitle>
        <ol className="grid gap-2 md:grid-cols-2">
          {(summary.recommended_actions ?? []).map((action, index) => (
            <li key={action} className="flex gap-3 rounded-[var(--radius-control)] bg-surface-2/60 px-3 py-2.5 text-sm leading-snug text-ink-2">
              <span className="tabular grid size-6 shrink-0 place-items-center rounded-[6px] bg-accent-soft text-xs font-semibold text-accent">{index + 1}</span>
              <span className="min-w-0 pt-0.5">{action}</span>
            </li>
          ))}
        </ol>
      </section>

      {showSbar && <SbarBlock sbar={summary.sbar} />}

      <footer className="flex flex-col gap-1 border-t border-line pt-4 text-xs leading-relaxed text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <ClockCountdown size={14} weight="bold" aria-hidden /> {summary.monitoring_interval}
        </span>
        <span>
          {news?.note} {qsofa?.note}
        </span>
        <span>{summary.disclaimer}</span>
      </footer>
    </div>
  )
}

function SectionTitle({ icon: IconCmp, children }: { icon?: Icon; children: ReactNode }) {
  return (
    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
      {IconCmp && <IconCmp size={16} weight="bold" aria-hidden className="text-ink-3" />}
      {children}
    </h4>
  )
}

function VitalStrip({ summary }: { summary: VitalsSummary }) {
  const perVital = summary.trend?.per_vital ?? {}
  const trendKey: Record<string, string> = { blood_pressure: 'systolic_bp' }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7">
      {(summary.vital_interpretations ?? []).map(vital => {
        const direction = perVital[trendKey[vital.key] ?? vital.key]?.direction
        const tone = vitalSeverityTone(vital.severity)
        return (
          <div key={vital.key} className={cn('min-w-0 rounded-[var(--radius-control)] border border-l-[3px] border-line bg-surface px-3 py-2.5', TONE_BORDER_L[tone])}>
            <div className="truncate text-xs text-ink-3">{vital.label}</div>
            <div className="mt-0.5 flex items-center gap-1 text-[15px] font-semibold text-ink">
              <span className="truncate">{vital.display}</span>
              {direction === 'up' && <CaretUp size={13} weight="fill" aria-label="rising" className="shrink-0 text-ink-3" />}
              {direction === 'down' && <CaretDown size={13} weight="fill" aria-label="falling" className="shrink-0 text-ink-3" />}
            </div>
            <div className={cn('mt-0.5 flex items-center gap-1.5 truncate text-xs font-medium', TONE_TEXT[tone])}>
              <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', TONE_SOLID[tone])} />
              <span className="truncate">{vital.band}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Patterns({ patterns }: { patterns: SummaryPattern[] }) {
  if (!patterns || patterns.length === 0) {
    return <p className="text-sm text-ink-3">No combined syndrome pattern detected.</p>
  }
  return (
    <div className="flex flex-col gap-2.5">
      {patterns.map(pattern => {
        const tone = patternTone(pattern.severity)
        return (
          <article key={pattern.id} className={cn('rounded-[var(--radius-control)] border border-l-[3px] border-line bg-surface-2/40 px-4 py-3', TONE_BORDER_L[tone])}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h5 className="min-w-0 text-sm font-semibold text-ink">{pattern.title}</h5>
              <Badge tone={tone} status>
                {pattern.severity}
              </Badge>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{pattern.interpretation}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-3">
              <span className="font-medium">Evidence:</span> {(pattern.evidence ?? []).join(' · ')}
            </p>
          </article>
        )
      })}
    </div>
  )
}

function Trend({ trend }: { trend: TrendBlock }) {
  const changes = trend?.changes ?? []
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-ink-2">{trend?.summary ?? ''}</p>
      {changes.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {changes.map(change => {
            const tone = change.status === 'worsening' ? 'crit' : change.status === 'improving' ? 'ok' : 'neutral'
            return (
              <li key={change.text} className="flex gap-2.5 text-[13px] leading-snug text-ink-2">
                <span aria-hidden className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', TONE_SOLID[tone])} />
                <span className="min-w-0">{change.text}</span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-[13px] text-ink-3">No clinically significant change in this window.</p>
      )}
    </div>
  )
}

function SbarBlock({ sbar }: { sbar: Sbar | undefined }) {
  if (!sbar) return null
  const rows: [string, string, string][] = [
    ['S', 'Situation', sbar.situation],
    ['B', 'Background', sbar.background],
    ['A', 'Assessment', sbar.assessment],
    ['R', 'Recommendation', sbar.recommendation],
  ]
  return (
    <section>
      <SectionTitle icon={Phone}>SBAR handoff</SectionTitle>
      <dl className="divide-y divide-line rounded-[var(--radius-control)] border border-line bg-surface-2/40">
        {rows.map(([letter, title, text]) => (
          <div key={letter} className="flex gap-3 px-4 py-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-[8px] bg-accent text-sm font-semibold text-accent-ink">{letter}</span>
            <div className="min-w-0 text-sm leading-relaxed">
              <dt className="font-semibold text-ink">{title}</dt>
              <dd className="text-ink-2">{text}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  )
}
