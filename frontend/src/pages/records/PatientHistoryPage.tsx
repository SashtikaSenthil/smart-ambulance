import { useParams } from 'react-router'
import { ArrowLeft, ChartBar, Heartbeat, ListChecks, Pill, UserCircle } from '@phosphor-icons/react'
import { ApiError } from '../../api/client'
import type { PatientHistory } from '../../api/types'
import { ChartCanvas } from '../../components/charts/ChartCanvas'
import { axes, withAlpha } from '../../components/charts/chartTheme'
import { PageHeader } from '../../components/layout/PageHeader'
import { PageState } from '../../components/PageState'
import { Badge } from '../../components/ui/Badge'
import { ButtonLink } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { cn } from '../../components/ui/cn'
import { EmptyState, Meter } from '../../components/ui/Feedback'
import { useApi } from '../../hooks/useApi'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { outcomeTone, TONE_SOLID } from '../../utils/tones'

function BackToRecords() {
  return (
    <ButtonLink to="/records" variant="secondary" icon={ArrowLeft}>
      Back to records
    </ButtonLink>
  )
}

export function PatientHistoryPage() {
  useDocumentTitle('Complete Patient History - AI Ambulance System')
  const { patientId = '' } = useParams()
  const page = useApi<PatientHistory>(`/records/${encodeURIComponent(patientId)}/history`)
  const notFound = page.error instanceof ApiError && page.error.status === 404

  if (notFound) {
    return (
      <>
        <PageHeader title="Complete patient history" actions={<BackToRecords />} />
        <Card>
          <EmptyState icon={UserCircle} title="No patient history found">
            There is no record for <span className="font-mono">{patientId}</span>. Check the ID or return to the records list.
          </EmptyState>
        </Card>
      </>
    )
  }

  if (!page.data) {
    return (
      <>
        <PageHeader title="Complete patient history" actions={<BackToRecords />} />
        <PageState loading={page.loading} error={page.error} onRetry={page.reload} />
      </>
    )
  }

  return <HistoryContent history={page.data} />
}

const SWATCHES = ['bg-[var(--series-1)]', 'bg-[var(--series-2)]', 'bg-[var(--series-3)]']

function HistoryContent({ history }: { history: PatientHistory }) {
  const { labels, response_timeline: responseData, accuracy_timeline: accuracyData, condition_breakdown: breakdown } = history.chart_data

  return (
    <>
      <PageHeader
        title="Complete patient history"
        meta={
          <>
            <span className="font-mono">{history.patient_id}</span>
            <span aria-hidden>·</span>
            <span>{history.name}</span>
          </>
        }
        actions={<BackToRecords />}
      />

      <div className="flex flex-col gap-6 lg:gap-8">
        <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
          <Card span="lg:col-span-2" tint="indigo">
            <CardHeader
              icon={UserCircle}
              title="Patient summary"
              aside={
                <Badge tone={outcomeTone(history.status)} status size="md">
                  {history.status}
                </Badge>
              }
            />
            <CardBody className="flex flex-col gap-5">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
                <Field label="Name" value={history.name} />
                <Field label="Patient ID" value={history.patient_id} mono />
                <Field label="Age" value={`${history.patient_summary.age} years`} />
                <Field label="Blood group" value={history.patient_summary.blood_group} />
                <Field label="Condition" value={history.condition} />
                <Field label="Doctor" value={history.patient_summary.attending_doctor} />
                <Field label="Ambulance unit" value={history.patient_summary.ambulance_unit} />
              </dl>
              <div className="rounded-[var(--radius-control)] bg-surface-2/60 p-4">
                <p className="text-xs text-ink-3">Clinical detail</p>
                <p className="mt-1 text-sm leading-relaxed text-ink">{history.patient_summary.diagnosis_detail}</p>
              </div>
            </CardBody>
          </Card>

          <Card delay={0.05} tint="emerald">
            <CardHeader icon={ChartBar} title="Case metrics" />
            <CardBody>
              <dl className="flex flex-col gap-4">
                <div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-sm text-ink-2">Prediction accuracy</dt>
                    <dd className="tabular text-lg font-semibold text-ink">{history.prediction_accuracy}%</dd>
                  </div>
                  <Meter value={history.prediction_accuracy} tone="ok" label="Prediction accuracy" className="mt-2" />
                </div>
                <Row label="Response time" value={`${history.response_time} min`} />
                <Row label="Emergency contact" value={history.patient_summary.emergency_contact} />
                <Row label="Encounter date" value={history.date} />
              </dl>
            </CardBody>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
          <Card span="lg:col-span-7" tint="violet">
            <CardHeader icon={Pill} title="Medications" />
            <CardBody className="px-0 pb-2 sm:px-0 sm:pb-2">
              {history.medications.length === 0 ? (
                <EmptyState icon={Pill} title="No medications recorded" />
              ) : (
                <ul className="divide-y divide-line border-t border-line">
                  {history.medications.map(med => (
                    <li key={med.name} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.6fr)] sm:items-center sm:gap-4 sm:px-6">
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{med.name}</p>
                        <p className="text-[13px] text-ink-3">{med.dosage}</p>
                      </div>
                      <p className="text-[13px] text-ink-2">{med.frequency}</p>
                      <p className="text-[13px] leading-snug text-ink-2">{med.purpose}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card span="lg:col-span-5" delay={0.05} tint="amber">
            <CardHeader icon={ListChecks} title="Treatment flow" />
            <CardBody>
              <ol className="relative flex flex-col gap-4 border-l border-line pl-5">
                {history.event_log.map(item => {
                  const tone = outcomeTone(item.status)
                  return (
                    <li key={item.event} className="relative flex flex-wrap items-center justify-between gap-2">
                      <span aria-hidden className={cn('absolute top-1.5 -left-[25px] size-2.5 rounded-full ring-4 ring-surface', TONE_SOLID[tone])} />
                      <span className="min-w-0 text-sm text-ink">{item.event}</span>
                      <Badge tone={tone} status>
                        {item.status}
                      </Badge>
                    </li>
                  )
                })}
              </ol>
            </CardBody>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          <Card tint="sky">
            <CardHeader title="Response timeline" description="Response time in minutes, by day." />
            <CardBody>
              <div className="relative h-60 sm:h-64">
                <ChartCanvas
                  id="responseTimelineChart"
                  label="Response time line chart"
                  deps={[history.patient_id]}
                  createConfig={t => ({
                    type: 'line',
                    data: {
                      labels,
                      datasets: [
                        {
                          label: 'Response time (min)',
                          data: responseData,
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
                    options: { plugins: { legend: { display: false } }, scales: axes(t, { beginAtZero: true }) },
                  })}
                />
              </div>
            </CardBody>
          </Card>
          <Card delay={0.05} tint="emerald">
            <CardHeader title="Accuracy timeline" description="Prediction accuracy, by day." />
            <CardBody>
              <div className="relative h-60 sm:h-64">
                <ChartCanvas
                  id="accuracyTimelineChart"
                  label="Prediction accuracy bar chart"
                  deps={[history.patient_id]}
                  createConfig={t => ({
                    type: 'bar',
                    data: { labels, datasets: [{ label: 'Accuracy (%)', data: accuracyData, backgroundColor: t.tint, maxBarThickness: 24, borderRadius: 4, borderSkipped: 'start' }] },
                    options: { plugins: { legend: { display: false } }, scales: axes(t, { beginAtZero: true, yMax: 100, yTick: value => `${value}%` }) },
                  })}
                />
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
          <Card span="lg:col-span-2" tint="rose">
            <CardHeader icon={Heartbeat} title="Vitals history" />
            <CardBody className="px-0 pb-2 sm:px-0 sm:pb-2">
              <div className="scrollbar-thin relative overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-y border-line bg-surface-2/50 text-xs text-ink-3">
                      {['Time', 'Heart rate', 'SpO₂', 'Blood pressure', 'Temperature'].map(heading => (
                        <th key={heading} scope="col" className="px-4 py-2.5 font-medium first:sticky first:left-0 first:bg-surface first:pl-6 last:pr-6">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="tabular divide-y divide-line">
                    {history.vitals.map(vital => (
                      <tr key={vital.time}>
                        <th scope="row" className="sticky left-0 bg-surface px-4 py-3 pl-6 text-left font-medium text-ink">
                          {vital.time}
                        </th>
                        <td className="px-4 py-3 text-ink-2">{vital.heart_rate} BPM</td>
                        <td className="px-4 py-3 text-ink-2">{vital.spo2}%</td>
                        <td className="px-4 py-3 text-ink-2">{vital.blood_pressure} mmHg</td>
                        <td className="px-4 py-3 pr-6 text-ink-2">{vital.temperature}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          <Card delay={0.05} tint="fuchsia">
            <CardHeader title="Case composition" />
            <CardBody>
              <div className="relative mx-auto aspect-square w-full max-w-[12rem]">
                <ChartCanvas
                  id="conditionBreakdownChart"
                  label="Case composition doughnut chart"
                  deps={[history.patient_id]}
                  createConfig={t => ({
                    type: 'doughnut',
                    data: { labels: breakdown.labels, datasets: [{ data: breakdown.values, backgroundColor: t.series.slice(0, 3), spacing: 2 }] },
                    options: { cutout: '68%', interaction: { mode: 'nearest', intersect: true }, plugins: { legend: { display: false } } },
                  })}
                />
              </div>
              <ul className="mt-5 flex flex-col gap-2.5">
                {breakdown.labels.map((label, index) => (
                  <li key={label} className="flex items-center gap-3 text-sm">
                    <span aria-hidden className={cn('size-2.5 shrink-0 rounded-full', SWATCHES[index])} />
                    <span className="min-w-0 flex-1 text-ink-2">{label}</span>
                    <span className="tabular font-semibold text-ink">{breakdown.values[index]}%</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  )
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className={cn('mt-1 text-sm font-medium break-words text-ink', mono && 'font-mono text-[13px]')}>{value}</dd>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-line pt-4">
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className="tabular text-right text-sm font-semibold break-all text-ink">{value}</dd>
    </div>
  )
}
