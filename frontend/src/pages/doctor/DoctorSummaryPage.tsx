import { useState, type ReactNode } from 'react'
import {
  Brain,
  Camera,
  CheckSquare,
  ClipboardText,
  Cpu,
  Drop,
  FileText,
  FirstAidKit,
  Heartbeat,
  Hospital,
  IdentificationCard,
  Info,
  Lightbulb,
  Printer,
  Pulse,
  Thermometer,
  Waveform,
  Wind,
  type Icon,
} from '@phosphor-icons/react'
import type { DoctorSummaryPayload, LiveSensorKey, LiveVitalsResponse } from '../../api/types'
import { BulletList } from '../../components/BulletList'
import { HospitalPreparationCards } from '../../components/diagnosis/HospitalPreparationCards'
import { VerificationTestList } from '../../components/diagnosis/VerificationTestList'
import { PageHeader } from '../../components/layout/PageHeader'
import { LiveClinicalSummaryCard } from '../../components/live/LiveClinicalSummary'
import { LiveValue } from '../../components/live/LiveValue'
import { PageState } from '../../components/PageState'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { cn } from '../../components/ui/cn'
import { Callout } from '../../components/ui/Feedback'
import { useAnonymousMode } from '../../hooks/useAnonymousMode'
import { useApi } from '../../hooks/useApi'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useLiveVitals } from '../../hooks/useLiveVitals'
import { splitReading } from '../../utils/format'
import { cameraRiskTone, diagnosisTone, plainDashes, TONE_BORDER_L, TONE_SOFT, type Tint } from '../../utils/tones'

// Same colour per vital as the dashboard.
const VITALS: { key: LiveSensorKey; icon: Icon; label: string; tint: Tint }[] = [
  { key: 'heart_rate', icon: Heartbeat, label: 'Heart rate', tint: 'rose' },
  { key: 'spo2', icon: Drop, label: 'SpO₂', tint: 'sky' },
  { key: 'blood_pressure', icon: Pulse, label: 'Blood pressure', tint: 'violet' },
  { key: 'temp', icon: Thermometer, label: 'Temperature', tint: 'amber' },
  { key: 'resp_rate', icon: Wind, label: 'Respiration rate', tint: 'emerald' },
  { key: 'ecg_status', icon: Waveform, label: 'ECG status', tint: 'teal' },
]

function formatReportTime(date: Date): string {
  return date.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
}

export function DoctorSummaryPage() {
  useDocumentTitle("Doctor's Pre-Arrival Summary - AI Ambulance System")
  const [anonymous] = useAnonymousMode()
  const page = useApi<DoctorSummaryPayload>('/doctor-summary', anonymous)
  const live = useLiveVitals(anonymous)

  return (
    <>
      <PageHeader
        title="Doctor's pre-arrival summary"
        description="Final report for the receiving clinician. Vitals and the clinical summary stay live until you print."
        actions={
          <Button variant="primary" icon={Printer} onClick={() => window.print()}>
            Print report
          </Button>
        }
      />
      {page.data ? <DoctorSummaryContent data={page.data} live={live} /> : <PageState loading={page.loading} error={page.error} onRetry={page.reload} />}
    </>
  )
}

function DoctorSummaryContent({ data, live }: { data: DoctorSummaryPayload; live: ReturnType<typeof useLiveVitals> }) {
  const [reportTime] = useState(() => formatReportTime(new Date()))
  const { patient, camera } = data
  const sensors = live.data?.sensors ?? data.sensors
  const ai = live.data?.ai ?? data.ai
  const initialDx = camera.diagnosis
  const liveDx = live.data?.diagnosis ?? initialDx
  const dxTone = diagnosisTone(liveDx?.severity_color)

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* Patient information */}
      <Card tint="indigo">
        <CardHeader icon={IdentificationCard} title="Patient information" />
        <CardBody>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
            <Field label="Patient ID" value={patient ? patient.id : 'N/A'} mono />
            <Field label="Name" value={patient ? patient.name : 'N/A'} />
            <Field label="Age" value={`${patient ? patient.age : 'N/A'} years`} />
            <div className="min-w-0">
              <dt className="text-xs text-ink-3">Report time</dt>
              <dd id="reportTime" className="tabular mt-1 text-sm font-medium text-ink">
                {reportTime}
              </dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      {/* Current vital metrics */}
      <Card tint="rose">
        <CardHeader icon={Heartbeat} title="Current vital metrics" />
        <CardBody>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {VITALS.map(vital => {
              const reading = splitReading(sensors[vital.key])
              return (
                <div key={vital.key} data-tint={vital.tint} className="card-tinted flex min-w-0 flex-col gap-2 rounded-[12px] border p-4">
                  <span className="flex items-center gap-2 text-xs font-semibold text-ink-2">
                    <span className="tint-chip grid size-6 place-items-center rounded-[7px]">
                      <vital.icon size={14} weight="bold" aria-hidden />
                    </span>
                    {vital.label}
                  </span>
                  <p className="flex flex-wrap items-baseline gap-x-1.5">
                    <LiveValue
                      value={reading.value}
                      tween={reading.numeric}
                      className={cn('rounded-md font-semibold tracking-tight text-ink', reading.numeric ? 'text-2xl' : 'text-[15px] leading-snug')}
                    />
                    {reading.unit && <span className="text-xs text-ink-3">{reading.unit}</span>}
                  </p>
                </div>
              )
            })}
          </div>
        </CardBody>
      </Card>

      {/* Visual analysis & risk assessment */}
      <Card tint="violet">
        <CardHeader icon={Camera} title="Visual analysis & risk assessment" />
        <CardBody className="flex flex-col gap-5">
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { title: 'Bleeding', value: camera.bleeding_risk },
              { title: 'Movement', value: camera.movement_risk },
              { title: 'Posture', value: camera.posture_risk },
              { title: 'Overall risk', value: camera.overall_risk },
            ].map(item => (
              <div key={item.title} className="min-w-0 rounded-[var(--radius-control)] border border-line p-4">
                <dt className="text-xs text-ink-3">{item.title}</dt>
                <dd className="mt-2">
                  <Badge tone={cameraRiskTone(item.value)} status size="md">
                    {item.value}
                  </Badge>
                </dd>
              </div>
            ))}
          </dl>
          <div>
            <h3 className="mb-2.5 text-sm font-semibold text-ink">Camera AI analysis</h3>
            <BulletList items={camera.summary} />
          </div>
        </CardBody>
      </Card>

      {/* AI clinical analysis & recommendations */}
      <Card tint="emerald">
        <CardHeader icon={Brain} title="AI clinical analysis & recommendations" />
        <CardBody className="flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="min-w-0">
              <SectionTitle icon={Lightbulb}>External summary</SectionTitle>
              <div id="liveExternalSummary">
                {ai.external_summary?.length ? <BulletList items={ai.external_summary} /> : <p className="text-sm text-ink-3">External summary is being generated...</p>}
              </div>
            </section>
            <section className="min-w-0">
              <SectionTitle icon={Cpu}>Internal summary</SectionTitle>
              <div id="liveInternalSummary">
                {ai.internal_summary?.length ? <BulletList items={ai.internal_summary} /> : <p className="text-sm text-ink-3">Internal summary is being generated...</p>}
              </div>
            </section>
          </div>
          <section className="rounded-[var(--radius-control)] bg-accent-soft/60 p-4 sm:p-5">
            <SectionTitle icon={CheckSquare}>Recommended actions</SectionTitle>
            <div id="liveRecommendations">
              {ai.recommendations?.length ? <BulletList items={ai.recommendations} /> : <p className="text-sm text-ink-3">No specific recommendations at this time.</p>}
            </div>
          </section>
        </CardBody>
      </Card>

      <LiveClinicalSummaryCard title="Live clinical summary & SBAR handoff" live={live.data} error={live.error} lastUpdated={live.lastUpdated} showSbar />

      {/* Final summary & conclusion */}
      <Card tint="sky">
        <CardHeader icon={FileText} title="Final summary & conclusion" />
        <CardBody className="flex flex-col gap-6">
          <section className="rounded-[var(--radius-control)] border border-line p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-ink">Current patient state</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
              Based on comprehensive vital metric analysis and AI-powered computer vision assessment, the patient presents with{' '}
              <strong className="font-semibold text-ink">{camera ? camera.overall_risk : 'Pending'} risk</strong> classification.
            </p>
            <h4 className="mt-4 mb-2.5 text-sm font-semibold text-ink">Key findings</h4>
            <KeyFindings data={data} live={live.data} />
          </section>

          {initialDx && liveDx ? (
            <>
              <section className={cn('rounded-[var(--radius-control)] border-l-4 p-4 sm:p-5', TONE_SOFT[dxTone], TONE_BORDER_L[dxTone])}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">Probable condition</span>
                  <Badge tone={dxTone} status>
                    {liveDx.severity}
                  </Badge>
                </div>
                <LiveValue as="h3" tween={false} value={plainDashes(liveDx.condition)} className="mt-2 rounded-md text-lg leading-snug font-semibold text-ink" />
                <LiveValue as="p" tween={false} value={plainDashes(liveDx.description)} className="mt-2 rounded-md text-sm leading-relaxed text-ink-2" />
                <h4 className="mt-4 mb-2 text-sm font-semibold text-ink">Probable causes</h4>
                <BulletList items={initialDx.probable_causes} dense />
              </section>

              <section>
                <SectionTitle icon={FirstAidKit}>Recommended verification tests at hospital</SectionTitle>
                <VerificationTestList tests={initialDx.verification_tests ?? []} tone={diagnosisTone(initialDx.severity_color)} />
              </section>

              <section>
                <SectionTitle icon={Hospital}>Hospital preparation checklist</SectionTitle>
                <HospitalPreparationCards items={initialDx.hospital_preparation} compact />
              </section>
            </>
          ) : (
            <section>
              <SectionTitle icon={ClipboardText}>Required hospital actions</SectionTitle>
              <BulletList
                items={[
                  'Prepare emergency department with appropriate medical team',
                  'Alert relevant specialist departments based on risk assessment',
                  'Ensure ICU availability if high-risk classification',
                  'Prepare diagnostic equipment (ECG, imaging, laboratory)',
                  'Have emergency medications and resuscitation equipment ready',
                ]}
              />
            </section>
          )}

          <Callout tone="info" icon={Info} title="Report generated">
            This is an AI-assisted pre-arrival summary. Final clinical decisions must be made by qualified medical professionals upon patient arrival at the hospital.
          </Callout>
        </CardBody>
      </Card>
    </div>
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

function SectionTitle({ icon: IconCmp, children }: { icon: Icon; children: ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
      <IconCmp size={16} weight="bold" aria-hidden className="text-ink-3" />
      {children}
    </h3>
  )
}

/** Key findings, recomputed from the live readings. */
function KeyFindings({ data, live }: { data: DoctorSummaryPayload; live: LiveVitalsResponse | null }) {
  const initialRaw = data.demo_assessment.sensors as Record<string, unknown>
  const raw = live?.raw ?? {
    heart_rate: Number(initialRaw.heart_rate),
    spo2: Number(initialRaw.spo2),
    blood_pressure: `${initialRaw.systolic_bp}/${initialRaw.diastolic_bp}`,
    temp: Number(initialRaw.temp),
  }
  const visual = live?.camera_overall_risk ?? (data.camera ? data.camera.overall_risk : 'Not available')
  const hr = Number(raw.heart_rate)
  const spo2 = Number(raw.spo2)
  const hrNormal = hr >= 60 && hr <= 100
  const spo2Ok = spo2 >= 95

  const rows: { label: string; value: string; note?: string; ok?: boolean }[] = [
    { label: 'Cardiac status', value: `${raw.heart_rate} BPM`, note: hrNormal ? 'Normal range' : 'Abnormal', ok: hrNormal },
    { label: 'Oxygenation', value: `${raw.spo2}% SpO₂`, note: spo2Ok ? 'Adequate' : 'Requiring intervention', ok: spo2Ok },
    { label: 'Blood pressure', value: `${raw.blood_pressure} mmHg` },
    { label: 'Temperature', value: `${raw.temp}°F` },
    { label: 'Visual assessment', value: visual || 'Not available' },
  ]

  return (
    <dl id="liveKeyFindings" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
      {rows.map(row => (
        <div key={row.label} className="min-w-0 rounded-[var(--radius-control)] bg-surface-2/60 px-3 py-2.5">
          <dt className="text-xs text-ink-3">{row.label}</dt>
          <dd className="tabular mt-1 text-sm font-semibold text-ink">{row.value}</dd>
          {row.note && (
            <dd className="mt-1.5">
              <Badge tone={row.ok ? 'ok' : 'warn'} status>
                {row.note}
              </Badge>
            </dd>
          )}
        </div>
      ))}
    </dl>
  )
}
