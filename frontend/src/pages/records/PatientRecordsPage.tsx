import { useEffect, useRef, useState } from 'react'
import type { TooltipItem } from 'chart.js'
import { ArrowUpRight, ChartLineUp, CheckCircle, ClockCounterClockwise, Table, Target, UsersThree, type Icon } from '@phosphor-icons/react'
import type { RecordsPayload } from '../../api/types'
import { ChartCanvas, type AnyChart } from '../../components/charts/ChartCanvas'
import { axes, withAlpha } from '../../components/charts/chartTheme'
import { PageHeader } from '../../components/layout/PageHeader'
import { PageState } from '../../components/PageState'
import { Badge } from '../../components/ui/Badge'
import { ButtonLink } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { cn } from '../../components/ui/cn'
import { Meter } from '../../components/ui/Feedback'
import { Reveal } from '../../components/ui/Reveal'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { useApi } from '../../hooks/useApi'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { outcomeTone, type Tint } from '../../utils/tones'

// Chart data below is the same static demo data the original page used.
type TrendFilter = 'week' | 'month' | 'yearly'

const trendDataSets: Record<TrendFilter, { labels: string[]; data: number[] }> = {
  week: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], data: [88, 91, 87, 93, 90, 94, 92] },
  month: { labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], data: [82, 86, 89, 91] },
  yearly: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    data: [72, 75, 78, 82, 80, 85, 88, 86, 90, 92, 91, 94],
  },
}

const FILTERS: { value: TrendFilter; label: string }[] = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'yearly', label: 'Yearly' },
]

const CONDITIONS = [
  { label: 'Cardiac arrest', value: 25 },
  { label: 'Stroke', value: 20 },
  { label: 'Trauma', value: 18 },
  { label: 'Respiratory', value: 22 },
  { label: 'Other', value: 15 },
]
const SERIES_SWATCH = ['bg-[var(--series-1)]', 'bg-[var(--series-2)]', 'bg-[var(--series-3)]', 'bg-[var(--series-4)]', 'bg-[var(--series-5)]']

export function PatientRecordsPage() {
  useDocumentTitle('Patient Records - AI Ambulance System')
  const page = useApi<RecordsPayload>('/records')

  return (
    <>
      <PageHeader title="Patient records & analytics" description="Historical cases, prediction accuracy and response times across the service." />
      {page.data ? <RecordsContent data={page.data} /> : <PageState loading={page.loading} error={page.error} onRetry={page.reload} />}
    </>
  )
}

function RecordsContent({ data }: { data: RecordsPayload }) {
  const [filter, setFilter] = useState<TrendFilter>('week')
  const trendChart = useRef<AnyChart | null>(null)

  // The filter updates the existing chart in place, so the line morphs between periods.
  useEffect(() => {
    const chart = trendChart.current
    if (!chart) return
    const dataset = trendDataSets[filter]
    chart.data.labels = dataset.labels
    chart.data.datasets[0].data = dataset.data
    chart.update('active')
  }, [filter])

  const metrics: { icon: Icon; value: string; label: string; sub: string; tint: Tint }[] = [
    { icon: UsersThree, value: `${data.total_patients}`, label: 'Total patients', sub: 'Historical records', tint: 'sky' },
    { icon: CheckCircle, value: `${data.prediction_success}%`, label: 'Prediction success rate', sub: 'AI accuracy', tint: 'emerald' },
    { icon: Target, value: `${data.avg_accuracy}%`, label: 'Average accuracy', sub: 'Diagnosis precision', tint: 'violet' },
    { icon: ClockCounterClockwise, value: `${data.avg_response_time}`, label: 'Avg response time', sub: 'Minutes', tint: 'amber' },
  ]

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* Metrics */}
      <section aria-label="Summary metrics" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {metrics.map((metric, index) => (
          <Reveal key={metric.label} delay={index * 0.05} className="min-w-0">
            <article
              data-tint={metric.tint}
              className="card-tinted relative flex h-full min-w-0 flex-col gap-3 overflow-hidden rounded-[var(--radius-card)] border p-4 shadow-card transition-shadow duration-300 sm:p-5"
            >
              <span aria-hidden className="tint-bar absolute inset-x-0 top-0 h-[3px]" />
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[13px] font-semibold text-ink-2">{metric.label}</span>
                <span className="tint-chip grid size-8 shrink-0 place-items-center rounded-[10px]">
                  <metric.icon size={17} weight="duotone" aria-hidden />
                </span>
              </div>
              <p className="text-[clamp(1.6rem,1.3rem+1vw,2.1rem)] leading-none font-semibold tracking-tight text-ink">{metric.value}</p>
              <p className="mt-auto truncate text-xs text-ink-3">{metric.sub}</p>
            </article>
          </Reveal>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <Card tint="teal">
          <CardHeader icon={ChartLineUp} title="Prediction success trend" aside={<SegmentedControl label="Trend period" size="sm" value={filter} onChange={setFilter} options={FILTERS} />} />
          <CardBody>
            <div className="relative h-64 sm:h-72">
              <ChartCanvas
                id="successTrendChart"
                label="Prediction success rate over time"
                chartRef={trendChart}
                createConfig={t => {
                  const dataset = trendDataSets[filter]
                  return {
                    type: 'line',
                    data: {
                      labels: dataset.labels,
                      datasets: [
                        {
                          label: 'Success rate',
                          data: dataset.data,
                          borderColor: t.tint,
                          backgroundColor: withAlpha(t.tint, 0.1),
                          fill: true,
                          tension: 0.4,
                          pointRadius: 4,
                          pointBackgroundColor: t.tint,
                          pointBorderColor: t.surface,
                          pointBorderWidth: 2,
                        },
                      ],
                    },
                    options: {
                      animation: { duration: 600, easing: 'easeInOutQuart' },
                      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: TooltipItem<'line'>) => ` Success rate: ${c.raw}%` } } },
                      scales: axes(t, { beginAtZero: true, yMax: 100, yTick: value => `${value}%` }),
                    },
                  }
                }}
              />
            </div>
          </CardBody>
        </Card>

        <Card delay={0.05} tint="violet">
          <CardHeader title="Accuracy distribution" description="Number of patients per prediction-accuracy band." />
          <CardBody>
            <div className="relative h-64 sm:h-72">
              <ChartCanvas
                id="accuracyDistributionChart"
                label="Accuracy distribution bar chart"
                createConfig={t => ({
                  type: 'bar',
                  data: {
                    labels: ['60-70%', '70-80%', '80-90%', '90-95%', '95-100%'],
                    datasets: [{ label: 'Patients', data: [5, 12, 28, 35, 20], backgroundColor: t.tint, maxBarThickness: 24, borderRadius: 4, borderSkipped: 'start' }],
                  },
                  options: { plugins: { legend: { display: false } }, scales: axes(t, { beginAtZero: true }) },
                })}
              />
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <Card tint="rose">
          <CardHeader title="Condition detection rate" description="Share of detected conditions." />
          <CardBody>
            <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,12rem)_1fr]">
              <div className="relative mx-auto aspect-square w-full max-w-[12rem]">
                <ChartCanvas
                  id="conditionDetectionChart"
                  label="Condition detection doughnut chart"
                  createConfig={t => ({
                    type: 'doughnut',
                    data: { labels: CONDITIONS.map(item => item.label), datasets: [{ data: CONDITIONS.map(item => item.value), backgroundColor: t.series, spacing: 2 }] },
                    options: { cutout: '68%', interaction: { mode: 'nearest', intersect: true }, plugins: { legend: { display: false } } },
                  })}
                />
              </div>
              <ul className="flex flex-col gap-2.5">
                {CONDITIONS.map((item, index) => (
                  <li key={item.label} className="flex items-center gap-3 text-sm">
                    <span aria-hidden className={cn('size-2.5 shrink-0 rounded-full', SERIES_SWATCH[index])} />
                    <span className="min-w-0 flex-1 text-ink-2">{item.label}</span>
                    <span className="tabular font-semibold text-ink">{item.value}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardBody>
        </Card>

        <Card delay={0.05} tint="amber">
          <CardHeader title="Response time distribution" description="Number of cases per response-time band." />
          <CardBody>
            <div className="relative h-64">
              <ChartCanvas
                id="responseTimeChart"
                label="Response time distribution bar chart"
                createConfig={t => ({
                  type: 'bar',
                  data: {
                    labels: ['0-5 min', '5-10 min', '10-15 min', '15-20 min', '20+ min'],
                    datasets: [{ label: 'Cases', data: [45, 32, 15, 6, 2], backgroundColor: t.tint, maxBarThickness: 24, borderRadius: 4, borderSkipped: 'start' }],
                  },
                  options: {
                    indexAxis: 'y',
                    interaction: { mode: 'index', axis: 'y', intersect: false },
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { beginAtZero: true, grid: { color: t.grid }, border: { display: false }, ticks: { color: t.ink3 } },
                      y: { grid: { display: false }, border: { color: t.axis }, ticks: { color: t.ink3 } },
                    },
                  },
                })}
              />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Records */}
      <Card tint="indigo">
        <CardHeader icon={Table} title="Historical patient records" description={`${data.patient_records.length} cases, newest first.`} />
        <CardBody className="px-0 pb-2 sm:px-0 sm:pb-2">
          {/* Table from sm up */}
          <div className="scrollbar-thin relative hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-y border-line bg-surface-2/50 text-xs text-ink-3">
                  {['Patient ID', 'Name', 'Date', 'Condition', 'Prediction accuracy', 'Response', 'Status', ''].map(heading => (
                    <th key={heading} scope="col" className="px-4 py-2.5 font-medium first:pl-6 last:pr-6">
                      {heading || <span className="sr-only">Action</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.patient_records.map(record => (
                  <tr key={record.patient_id} className="transition-colors hover:bg-surface-2/50">
                    <td className="px-4 py-3 pl-6 font-mono text-[13px] text-ink-2">{record.patient_id}</td>
                    <td className="px-4 py-3 font-medium text-ink">{record.name}</td>
                    <td className="tabular px-4 py-3 text-ink-2">{record.date}</td>
                    <td className="px-4 py-3">
                      <Badge tone="neutral">{record.condition}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Meter value={record.accuracy} label={`Prediction accuracy ${record.accuracy}%`} className="w-24" />
                        <span className="tabular text-[13px] font-medium text-ink">{record.accuracy}%</span>
                      </div>
                    </td>
                    <td className="tabular px-4 py-3 text-ink-2">{record.response_time} min</td>
                    <td className="px-4 py-3">
                      <Badge tone={outcomeTone(record.status)} status>
                        {record.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 pr-6 text-right">
                      <ButtonLink to={`/records/${encodeURIComponent(record.patient_id)}/history`} variant="ghost" iconRight={ArrowUpRight} className="min-h-9 px-3">
                        Full history
                      </ButtonLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stacked cards on phones */}
          <ul className="divide-y divide-line border-t border-line sm:hidden">
            {data.patient_records.map(record => (
              <li key={record.patient_id} className="flex flex-col gap-3 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{record.name}</p>
                    <p className="font-mono text-xs text-ink-3">
                      {record.patient_id} · {record.date}
                    </p>
                  </div>
                  <Badge tone={outcomeTone(record.status)} status>
                    {record.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-2">
                  <Badge tone="neutral">{record.condition}</Badge>
                  <span className="tabular">{record.response_time} min response</span>
                </div>
                <div className="flex items-center gap-3">
                  <Meter value={record.accuracy} label={`Prediction accuracy ${record.accuracy}%`} className="flex-1" />
                  <span className="tabular text-[13px] font-medium text-ink">{record.accuracy}%</span>
                </div>
                <ButtonLink to={`/records/${encodeURIComponent(record.patient_id)}/history`} variant="secondary" iconRight={ArrowUpRight} className="w-full">
                  Open full history
                </ButtonLink>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  )
}
