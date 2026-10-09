import { useEffect, useRef, useState } from 'react'
import type { TooltipItem } from 'chart.js'
import {
  ArrowRight,
  ArrowsInSimple,
  ArrowsOutSimple,
  Camera,
  CameraSlash,
  Drop,
  Heartbeat,
  IdentificationCard,
  MagnifyingGlass,
  Pulse,
  Thermometer,
  Wind,
  Waveform,
  type Icon,
} from '@phosphor-icons/react'
import type { CameraReport, CameraRuntimeStatus, DashboardPayload, EcgData, LiveSensorKey } from '../../api/types'
import { ChartCanvas, type AnyChart } from '../../components/charts/ChartCanvas'
import { PageHeader } from '../../components/layout/PageHeader'
import { LiveClinicalSummaryCard } from '../../components/live/LiveClinicalSummary'
import { LiveValue } from '../../components/live/LiveValue'
import { PageState } from '../../components/PageState'
import { Badge } from '../../components/ui/Badge'
import { ButtonLink } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { cn } from '../../components/ui/cn'
import { Reveal } from '../../components/ui/Reveal'
import { Switch } from '../../components/ui/Switch'
import { useAnonymousMode } from '../../hooks/useAnonymousMode'
import { useApi } from '../../hooks/useApi'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useInterval } from '../../hooks/useInterval'
import { useLiveVitals } from '../../hooks/useLiveVitals'
import { usePolling } from '../../hooks/usePolling'
import { splitReading } from '../../utils/format'
import { cameraRiskTone, diagnosisTone, plainDashes, TONE_BORDER_L, type Tint } from '../../utils/tones'
import { createSparklineConfig, refreshSparklineData, type SparklineKey } from './sparklineConfigs'

// Each vital keeps one colour family everywhere it appears (tile, telemetry card, chart line).
const VITAL_TINT: Record<LiveSensorKey, Tint> = {
  heart_rate: 'rose',
  spo2: 'sky',
  blood_pressure: 'violet',
  temp: 'amber',
  resp_rate: 'emerald',
  ecg_status: 'teal',
}

const STAT_CARDS: { key: LiveSensorKey; icon: Icon; label: string; sub: string }[] = [
  { key: 'heart_rate', icon: Heartbeat, label: 'Heart rate', sub: 'Real-time monitoring' },
  { key: 'spo2', icon: Drop, label: 'Oxygen saturation', sub: 'SpO₂ level tracking' },
  { key: 'blood_pressure', icon: Pulse, label: 'Blood pressure', sub: 'Systolic / diastolic' },
  { key: 'temp', icon: Thermometer, label: 'Temperature', sub: 'Body temperature' },
  { key: 'resp_rate', icon: Wind, label: 'Respiration', sub: 'Breathing rate' },
  { key: 'ecg_status', icon: Waveform, label: 'ECG status', sub: 'Cardiac rhythm' },
]

const VITAL_CARDS: { chart: SparklineKey; title: string; key: LiveSensorKey }[] = [
  { chart: 'hr', title: 'Heart rate', key: 'heart_rate' },
  { chart: 'spo2', title: 'Oxygen saturation', key: 'spo2' },
  { chart: 'bp', title: 'Blood pressure', key: 'blood_pressure' },
  { chart: 'rr', title: 'Respiration rate', key: 'resp_rate' },
  { chart: 'temp', title: 'Temperature', key: 'temp' },
  { chart: 'ecg', title: 'ECG', key: 'ecg_status' },
]

const RISK_SCORE: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1, PENDING: 0 }
const riskScore = (value: unknown) => RISK_SCORE[String(value ?? 'Pending').trim().toUpperCase()] ?? 0

export function DashboardPage() {
  useDocumentTitle('AI Ambulance Dashboard - Medical Admin')
  const [anonymous, setAnonymous] = useAnonymousMode()
  const page = useApi<DashboardPayload>('/dashboard', anonymous)
  const live = useLiveVitals(anonymous)

  return (
    <>
      <PageHeader
        title="Dashboard control panel"
        description="Live vitals, camera analysis and the rule-based clinical summary for the patient in transit."
        actions={
          <Switch id="anonymousIntakeToggle" checked={anonymous} onChange={setAnonymous} label="Anonymous intake" description="Hide identity and history" />
        }
      />
      {page.data ? <DashboardContent data={page.data} live={live} anonymous={anonymous} /> : <PageState loading={page.loading} error={page.error} onRetry={page.reload} />}
    </>
  )
}

function DashboardContent({ data, live, anonymous }: { data: DashboardPayload; live: ReturnType<typeof useLiveVitals>; anonymous: boolean }) {
  const { patient, anonymous_mode: anonymousMode } = data
  const sensors = live.data?.sensors ?? data.sensors
  const dx = live.data?.diagnosis ?? data.camera.diagnosis
  const analysisLink = `/analysis${anonymous ? '?anonymous=1' : ''}`

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* Emergency intake */}
      <Card tint="indigo">
        <CardHeader
          icon={IdentificationCard}
          title="Emergency intake"
          aside={
            anonymousMode && (
              <Badge tone="warn" status>
                History unavailable
              </Badge>
            )
          }
        />
        <CardBody>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
            <Field label="Name" value={patient.name} />
            <Field label="Patient ID" value={patient.id} mono />
            <Field label="Age" value={String(patient.age)} />
            {!anonymousMode && (
              <>
                <Field label="Past conditions" value={patient.past_conditions} />
                <Field label="Allergies" value={patient.allergies} tone="crit" />
              </>
            )}
          </dl>
        </CardBody>
      </Card>

      {/* Stat cards */}
      <section aria-label="Current vitals" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
        {STAT_CARDS.map((card, index) => {
          const reading = splitReading(sensors[card.key])
          return (
            <Reveal key={card.key} delay={index * 0.04} className="min-w-0">
              <article
                data-tint={VITAL_TINT[card.key]}
                className="card-tinted relative flex h-full min-w-0 flex-col gap-3 overflow-hidden rounded-[var(--radius-card)] border p-4 shadow-card transition-shadow duration-300 sm:p-5"
              >
                <span aria-hidden className="tint-bar absolute inset-x-0 top-0 h-[3px]" />
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] font-semibold text-ink-2">{card.label}</span>
                  <span className="tint-chip grid size-8 shrink-0 place-items-center rounded-[10px]">
                    <card.icon size={17} weight="duotone" aria-hidden />
                  </span>
                </div>
                <div className="min-w-0">
                  {reading.numeric ? (
                    <p className="flex flex-wrap items-baseline gap-x-1.5 leading-none">
                      <LiveValue value={reading.value} className="rounded-md text-[clamp(1.5rem,1.2rem+1vw,2rem)] font-semibold tracking-tight text-ink" />
                      <span className="text-xs font-medium text-ink-3">{reading.unit}</span>
                    </p>
                  ) : (
                    <LiveValue as="p" value={reading.value} tween={false} className="rounded-md text-base leading-snug font-semibold text-ink" />
                  )}
                </div>
                <p className="mt-auto truncate text-xs text-ink-3">{card.sub}</p>
              </article>
            </Reveal>
          )
        })}
      </section>

      <TelemetrySection sensors={sensors} />

      <LiveClinicalSummaryCard title="Live clinical summary" tint="teal" live={live.data} error={live.error} lastUpdated={live.lastUpdated} />

      <CameraSection initialCamera={data.camera} />

      {/* Diagnostic banner */}
      {dx && (
        <Card className={cn('border-l-4', TONE_BORDER_L[diagnosisTone(dx.severity_color)])}>
          <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <MagnifyingGlass size={18} weight="bold" aria-hidden className="text-ink-3" />
                <span className="text-sm text-ink-3">Probable condition</span>
                <Badge tone={diagnosisTone(dx.severity_color)} status>
                  {dx.severity}
                </Badge>
              </div>
              <LiveValue as="h2" tween={false} value={plainDashes(dx.condition)} className="mt-2 rounded-md text-lg leading-snug font-semibold text-ink" />
              {anonymousMode && <p className="mt-1 text-sm font-medium text-warn-ink">History unavailable: diagnosis based on real-time physiological stress.</p>}
              <LiveValue as="p" tween={false} value={`${plainDashes(dx.description).slice(0, 180)}...`} className="mt-2 max-w-[80ch] rounded-md text-sm leading-relaxed text-ink-2" />
              <p className="mt-2 text-xs text-ink-3">
                {dx.verification_tests?.length ?? 0} verification tests · {dx.hospital_preparation?.length ?? 0} preparation categories recommended
              </p>
            </div>
            <ButtonLink id="openAiAnalysisLink" to={analysisLink} variant="primary" iconRight={ArrowRight} className="self-start lg:self-center">
              Full diagnosis &amp; prep
            </ButtonLink>
          </div>
        </Card>
      )}

      {/* Analysis CTA */}
      <Card tint="indigo">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight text-ink">Detailed patient &amp; AI analysis</h2>
            <p className="mt-1 text-sm text-ink-3">PHR, prediction engine, camera summary, charts and hospital preparation.</p>
          </div>
          <ButtonLink id="analysisPageLink" to={analysisLink} variant="secondary" icon={Pulse} className="self-start sm:self-center">
            Open AI analysis
          </ButtonLink>
        </div>
      </Card>
    </div>
  )
}

function Field({ label, value, mono = false, tone }: { label: string; value: string; mono?: boolean; tone?: 'crit' }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className={cn('mt-1 text-sm font-medium break-words', mono && 'font-mono text-[13px]', tone === 'crit' ? 'text-crit-ink' : 'text-ink')}>{value}</dd>
    </div>
  )
}

// ----------------------------
// Telemetry: live vital signs
// ----------------------------
function TelemetrySection({ sensors }: { sensors: DashboardPayload['sensors'] }) {
  const [expanded, setExpanded] = useState<SparklineKey | null>(null)
  const charts = useRef<Partial<Record<SparklineKey, { current: AnyChart | null }>>>({})
  const chartRefFor = (key: SparklineKey) => (charts.current[key] ??= { current: null })

  // Collapse an expanded card when clicking anywhere outside the telemetry cards.
  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!(event.target as Element | null)?.closest?.('[data-vital-card]')) setExpanded(null)
    }
    document.addEventListener('click', onDocumentClick)
    return () => document.removeEventListener('click', onDocumentClick)
  }, [])

  // Refresh the simulated traces every 2 seconds.
  useInterval(() => {
    ;(['hr', 'spo2', 'bp', 'rr', 'temp'] as const).forEach(key => {
      const chart = charts.current[key]?.current
      if (!chart) return
      refreshSparklineData(key).forEach((data, index) => {
        if (chart.data.datasets[index]) chart.data.datasets[index].data = data
      })
      chart.update('none')
    })
  }, 2000)

  // ECG trace from the external feed.
  const ecg = usePolling<EcgData>('/ecg-data', 2000)
  const ecgSeries = Array.isArray(ecg.data?.series) ? ecg.data.series : []
  const latestEcg = ecgSeries.length > 0 ? Number(ecgSeries[ecgSeries.length - 1]) : NaN
  const ecgReading = Number.isFinite(latestEcg) ? latestEcg.toFixed(2) : '--'
  useEffect(() => {
    const chart = charts.current.ecg?.current
    const ecgData = ecg.data
    if (!chart || !ecgData || !Array.isArray(ecgData.series) || ecgData.series.length === 0) return
    const labels = Array.isArray(ecgData.labels) && ecgData.labels.length === ecgData.series.length ? [...ecgData.labels] : ecgData.series.map((_, idx) => idx)
    updateChartData(chart, labels, [...ecgData.series])
  }, [ecg.data])

  return (
    <section aria-labelledby="telemetry-title" className="flex flex-col gap-4">
      <Reveal>
        <h2 id="telemetry-title" className="text-lg font-semibold tracking-tight text-ink">
          Telemetry
        </h2>
        <p className="text-sm text-ink-3">Last 10 minutes. Expand a card for axes and detail.</p>
      </Reveal>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {VITAL_CARDS.map((card, index) => {
          const isExpanded = expanded === card.chart
          const reading = splitReading(sensors[card.key])
          return (
            <Reveal key={card.chart} delay={index * 0.05} className="min-w-0">
              <article
                data-vital-card
                data-tint={VITAL_TINT[card.key]}
                className={cn(
                  'card-tinted flex h-full min-w-0 flex-col rounded-[var(--radius-card)] border p-4 shadow-card transition-shadow duration-300 sm:p-5',
                  isExpanded && 'shadow-raised',
                )}
              >
                <header className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 truncate text-sm font-semibold text-ink-2">
                      <span aria-hidden className="tint-fill size-2 shrink-0 rounded-full" />
                      {card.title}
                    </h3>
                    <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
                      <LiveValue
                        value={reading.value}
                        tween={reading.numeric}
                        className={cn('rounded-md font-semibold tracking-tight text-ink', reading.numeric ? 'text-xl' : 'text-[15px] leading-snug')}
                      />
                      {reading.unit && <span className="text-xs text-ink-3">{reading.unit}</span>}
                    </p>
                    {card.chart === 'ecg' && (
                      <p id="ecgNumericValue" className="tabular mt-1 text-xs text-ink-3">
                        Feed value {ecgReading}
                      </p>
                    )}
                    {card.chart === 'bp' && (
                      <ul className="mt-2 flex gap-3 text-xs text-ink-3" aria-label="Legend">
                        <li className="flex items-center gap-1.5">
                          <span aria-hidden className="h-0.5 w-3 rounded-full bg-[var(--series-1)]" /> Systolic
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span aria-hidden className="h-0.5 w-3 rounded-full bg-[var(--series-2)]" /> Diastolic
                        </li>
                      </ul>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${card.title} chart`}
                    onClick={event => {
                      event.stopPropagation()
                      setExpanded(current => (current === card.chart ? null : card.chart))
                    }}
                    className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] text-ink-3 transition-[background-color,color,transform] hover:bg-surface-2 hover:text-ink active:scale-95"
                  >
                    {isExpanded ? <ArrowsInSimple size={17} weight="bold" aria-hidden /> : <ArrowsOutSimple size={17} weight="bold" aria-hidden />}
                  </button>
                </header>
                <div className={cn('relative mt-4 transition-[height] duration-300 ease-out', isExpanded ? 'h-64 sm:h-72' : 'h-24')}>
                  <ChartCanvas
                    id={`${card.chart}Sparkline`}
                    label={`${card.title} trace`}
                    chartRef={chartRefFor(card.chart)}
                    deps={[isExpanded]}
                    createConfig={tokens => createSparklineConfig(card.chart, tokens, isExpanded)}
                  />
                </div>
              </article>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}

/** In-place Chart.js update (the chart instance is owned by Chart.js, not React state). */
function updateChartData(chart: AnyChart, labels: unknown[], series: number[]) {
  chart.data.labels = labels
  chart.data.datasets[0].data = series
  chart.update('none')
}

// ----------------------------
// Live camera feed + camera AI summary
// ----------------------------
const RISK_LEGEND_SWATCH = ['bg-[var(--series-1)]', 'bg-[var(--series-2)]', 'bg-[var(--series-3)]']

function CameraSection({ initialCamera }: { initialCamera: CameraReport }) {
  const status = usePolling<CameraRuntimeStatus>('/camera-analysis-status', 2000)
  const summary = usePolling<CameraReport>('/camera-analysis', 2000)
  const camera = summary.data ?? initialCamera
  const riskChart = useRef<AnyChart | null>(null)
  const [feedFailed, setFeedFailed] = useState(false)

  const scores = [riskScore(camera.bleeding_risk), riskScore(camera.movement_risk), riskScore(camera.posture_risk)]
  const scoreKey = scores.join(',')
  const total = scores[0] + scores[1] + scores[2]

  useEffect(() => {
    const chart = riskChart.current
    if (!chart) return
    chart.data.datasets[0].data = scoreKey.split(',').map(Number)
    chart.update('none')
  }, [scoreKey])

  const statusData = status.data
  const completed = statusData?.phase === 'completed'
  const unavailable = statusData?.phase === 'unavailable'
  const countdown =
    statusData == null
      ? 'Analysing patient · 60s'
      : completed
        ? 'Analysis completed'
        : unavailable
          ? 'Camera analysis unavailable'
          : `Analysing patient · ${Number(statusData.remaining_seconds ?? 0)}s`

  const liveRisks: [string, string | undefined][] = [
    ['Bleeding', statusData?.bleeding_risk],
    ['Movement', statusData?.movement_risk],
    ['Posture', statusData?.posture_risk],
  ]

  const indicators = [
    { title: 'Bleeding', value: camera.bleeding_risk || 'Pending' },
    { title: 'Movement', value: camera.movement_risk || 'Pending' },
    { title: 'Posture', value: camera.posture_risk || 'Pending' },
    { title: 'Overall risk', value: camera.overall_risk || 'Pending' },
  ]
  const legend = ['Bleeding', 'Movement', 'Posture']

  return (
    <div className="grid gap-6 lg:gap-8 xl:grid-cols-5">
      {/* Live camera feed */}
      <Card span="xl:col-span-3" tint="sky">
        <CardHeader
          icon={Camera}
          title="Live camera feed"
          aside={
            <Badge tone={completed ? 'ok' : unavailable ? 'neutral' : 'warn'} status>
              <span className="tabular">{countdown}</span>
            </Badge>
          }
        />
        <CardBody className="flex flex-col gap-4">
          <div className="relative aspect-video w-full overflow-hidden rounded-[var(--radius-control)] bg-surface-2">
            {feedFailed ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
                <CameraSlash size={28} weight="duotone" aria-hidden className="text-ink-3" />
                <p className="text-sm font-medium text-ink">Camera stream unavailable</p>
                <p className="max-w-[40ch] text-xs text-ink-3">The camera may be in use by another application or not connected.</p>
              </div>
            ) : (
              <img
                id="dashboardCameraFeed"
                className="absolute inset-0 size-full object-contain"
                src="/api/camera-feed"
                alt="Live ambulance camera stream with AI analysis overlay"
                onError={() => setFeedFailed(true)}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {liveRisks.map(([label, value]) => (
              <Badge key={label} tone={statusData ? cameraRiskTone(value) : 'neutral'} status>
                {label}: {value || 'Pending'}
              </Badge>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Camera AI summary */}
      <Card span="xl:col-span-2" delay={0.05} tint="violet">
        <CardHeader icon={MagnifyingGlass} title="Camera AI summary" description="Visual analysis of bleeding, movement and posture." />
        <CardBody className="flex flex-col gap-5">
          <dl className="grid grid-cols-2 gap-2">
            {indicators.map(indicator => (
              <div key={indicator.title} className="min-w-0 rounded-[var(--radius-control)] bg-surface-2/60 px-3 py-2.5">
                <dt className="truncate text-xs text-ink-3">{indicator.title}</dt>
                <dd className="mt-1">
                  <Badge tone={cameraRiskTone(indicator.value)} status>
                    {indicator.value}
                  </Badge>
                </dd>
              </div>
            ))}
          </dl>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-ink">Risk distribution</h3>
            <div className="grid grid-cols-[minmax(0,8rem)_1fr] items-center gap-5 sm:grid-cols-[minmax(0,10rem)_1fr]">
              <div className="relative aspect-square w-full">
                <ChartCanvas
                  id="overallRiskChart"
                  label="Risk distribution across bleeding, movement and posture"
                  chartRef={riskChart}
                  createConfig={tokens => ({
                    type: 'doughnut',
                    data: { labels: legend, datasets: [{ data: scores, backgroundColor: tokens.series.slice(0, 3), spacing: 2 }] },
                    options: {
                      cutout: '68%',
                      interaction: { mode: 'nearest', intersect: true },
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (context: TooltipItem<'doughnut'>) => {
                              const sum = (context.dataset.data as number[]).reduce((a, b) => a + b, 0)
                              if (sum === 0) return ` ${context.label}: awaiting analysis`
                              return ` ${context.label}: ${(((context.parsed as number) / sum) * 100).toFixed(1)}%`
                            },
                          },
                        },
                      },
                    },
                  })}
                />
                {total === 0 && (
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="grid size-[78%] place-items-center rounded-full border-[10px] border-surface-2 text-center text-[11px] leading-tight text-ink-3">
                      Awaiting
                      <br />
                      analysis
                    </div>
                  </div>
                )}
              </div>
              {/* Value-bearing legend: identity never relies on colour alone */}
              <ul className="flex min-w-0 flex-col gap-2.5">
                {legend.map((label, index) => (
                  <li key={label} className="flex items-center gap-2.5 text-sm">
                    <span aria-hidden className={cn('size-2.5 shrink-0 rounded-full', RISK_LEGEND_SWATCH[index])} />
                    <span className="min-w-0 flex-1 truncate text-ink-2">{label}</span>
                    <span className="tabular font-medium text-ink">{scores[index]}/3</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
