import { useMemo } from 'react'
import type { TooltipItem } from 'chart.js'
import { Camera, ClipboardText, Cpu, FirstAidKit, Hospital, Robot, Stethoscope, UserCircle, type Icon } from '@phosphor-icons/react'
import type { AnalysisPayload, Diagnosis } from '../../api/types'
import { BulletList } from '../../components/BulletList'
import { ChartCanvas } from '../../components/charts/ChartCanvas'
import { axes, withAlpha } from '../../components/charts/chartTheme'
import { HospitalPreparationCards } from '../../components/diagnosis/HospitalPreparationCards'
import { VerificationTestList } from '../../components/diagnosis/VerificationTestList'
import { PageHeader } from '../../components/layout/PageHeader'
import { LiveClinicalSummaryCard } from '../../components/live/LiveClinicalSummary'
import { LiveValue } from '../../components/live/LiveValue'
import { PageState } from '../../components/PageState'
import { Badge } from '../../components/ui/Badge'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { cn } from '../../components/ui/cn'
import { useAnonymousMode } from '../../hooks/useAnonymousMode'
import { useApi } from '../../hooks/useApi'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useLiveVitals } from '../../hooks/useLiveVitals'
import { clampScore, computeAnalysisScores } from '../../utils/analysisScores'
import { aiRiskTone, cameraRiskTone, diagnosisTone, plainDashes, TONE_BORDER_L, TONE_SOFT, type Tint } from '../../utils/tones'

export function AnalysisPage() {
  useDocumentTitle('Patient Analysis - AI Ambulance System')
  const [anonymous] = useAnonymousMode()
  const page = useApi<AnalysisPayload>('/analysis', anonymous)
  const live = useLiveVitals(anonymous)

  return (
    <>
      <PageHeader title="Patient & AI analysis" description="Health record, AI prediction, the live clinical summary and hospital preparation in one view." />
      {page.data ? <AnalysisContent data={page.data} live={live} /> : <PageState loading={page.loading} error={page.error} onRetry={page.reload} />}
    </>
  )
}

function AnalysisContent({ data, live }: { data: AnalysisPayload; live: ReturnType<typeof useLiveVitals> }) {
  const { patient, anonymous_mode: anonymousMode, camera } = data
  const ai = live.data?.ai ?? data.ai
  const dx = live.data?.diagnosis ?? camera.diagnosis

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        {/* Patient health record */}
        <Card tint="indigo">
          <CardHeader icon={UserCircle} title="Patient health record" />
          <CardBody>
            <div className="grid gap-6 sm:grid-cols-2">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-1">
                <Field label="Name" value={patient.name} />
                <Field label="ID" value={patient.id} mono />
                <Field label="Date of birth" value={patient.dob} />
                <Field label="Age" value={`${patient.age} years`} />
              </dl>
              {anonymousMode ? (
                <div className={cn('self-start rounded-[var(--radius-control)] p-4 text-sm', TONE_SOFT.warn)}>
                  <p className="font-semibold">History unavailable</p>
                  <p className="mt-1 leading-relaxed">Diagnosis based on real-time physiological stress. Past conditions and allergies are hidden in anonymous intake mode.</p>
                </div>
              ) : (
                <dl className="flex flex-col gap-3">
                  <Field label="Chronic conditions" value={patient.past_conditions} />
                  <div>
                    <dt className="text-xs text-ink-3">Critical allergies</dt>
                    <dd className="mt-1.5">
                      <Badge tone="crit" status size="md">
                        {patient.allergies}
                      </Badge>
                    </dd>
                  </div>
                </dl>
              )}
            </div>
          </CardBody>
        </Card>

        {/* AI prediction engine */}
        <Card delay={0.05} tint="violet">
          <CardHeader icon={Robot} title="AI prediction engine" />
          <CardBody className="flex flex-col gap-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <LiveValue as="h3" id="livePrimaryRisk" tween={false} value={ai.primary_risk} className="rounded-md text-xl leading-snug font-semibold text-ink" />
                <Badge tone={aiRiskTone(ai.risk_level)} status size="md">
                  <span id="liveRiskLevel">{ai.risk_level} risk</span>
                </Badge>
              </div>
              <p className="mt-2 text-sm text-ink-3">
                AI confidence score <LiveValue id="aiConfidenceText" value={ai.confidence} className="tabular ml-1 rounded-md font-semibold text-ink" />
              </p>
            </div>
            <div>
              <h4 className="mb-2.5 text-sm font-semibold text-ink">Flagged indicators</h4>
              <div id="liveIndicators" className="flex flex-wrap gap-2">
                {ai.indicators.length > 0 ? (
                  ai.indicators.map(indicator => (
                    <Badge key={indicator} tone="neutral" size="md">
                      {indicator}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-ink-3">No indicators flagged.</p>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <LiveClinicalSummaryCard title="Live vitals & clinical summary" live={live.data} error={live.error} lastUpdated={live.lastUpdated} showVitals />

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <SummaryCard icon={Cpu} tint="sky" title="Internal summary" id="liveInternalSummary" items={ai.internal_summary} empty="Internal summary is being generated..." />
        <SummaryCard icon={ClipboardText} tint="emerald" title="External summary" id="liveExternalSummary" items={ai.external_summary} empty="External summary is being generated..." delay={0.05} />
      </div>

      {/* Camera AI analysis */}
      <Card tint="fuchsia">
        <CardHeader
          icon={Camera}
          title="Camera AI analysis"
          aside={
            <div className="flex flex-wrap gap-2">
              <Badge tone={cameraRiskTone(camera.bleeding_risk)} status size="md">
                Bleeding: {camera.bleeding_risk}
              </Badge>
              <Badge tone={cameraRiskTone(camera.movement_risk)} status size="md">
                Movement: {camera.movement_risk}
              </Badge>
              <Badge tone={cameraRiskTone(camera.posture_risk)} status size="md">
                Posture: {camera.posture_risk}
              </Badge>
            </div>
          }
        />
        <CardBody>
          <h4 className="mb-2.5 text-sm font-semibold text-ink">Observation summary</h4>
          <BulletList items={camera.summary} />
        </CardBody>
      </Card>

      {dx && <DiagnosisSections dx={dx} />}

      <AnalysisCharts data={data} />
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

function SummaryCard({ icon, tint, title, id, items, empty, delay = 0 }: { icon: Icon; tint: Tint; title: string; id: string; items: string[]; empty: string; delay?: number }) {
  return (
    <Card delay={delay} tint={tint}>
      <CardHeader icon={icon} title={title} />
      <CardBody>
        <div id={id}>{items?.length ? <BulletList items={items} /> : <p className="text-sm text-ink-3">{empty}</p>}</div>
      </CardBody>
    </Card>
  )
}

function DiagnosisSections({ dx }: { dx: Diagnosis }) {
  const tone = diagnosisTone(dx.severity_color)
  return (
    <>
      {/* Probable condition */}
      <Card id="combinedDiagnosisCard" className={cn('border-l-4', TONE_BORDER_L[tone])}>
        <CardHeader
          icon={Stethoscope}
          tone={tone}
          title="Probable condition identified"
          aside={
            <Badge tone={tone} status size="md">
              <span id="combinedDiagnosisSeverity">Severity: {dx.severity || 'Unknown'}</span>
            </Badge>
          }
        />
        <CardBody className="flex flex-col gap-4">
          <h3 id="combinedDiagnosisCondition" className="text-xl leading-snug font-semibold text-ink">
            {plainDashes(dx.condition || 'Unclassified visual pattern: requires clinical correlation')}
          </h3>
          <p id="combinedDiagnosisDescription" className="max-w-[80ch] text-[15px] leading-relaxed text-ink-2">
            {plainDashes(dx.description || 'No diagnosis description available.')}
          </p>
          <div>
            <h4 className="mb-2.5 text-sm font-semibold text-ink">Probable causes</h4>
            <div id="combinedDiagnosisCauses">
              <BulletList items={dx.probable_causes} />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Verification tests */}
      <Card tint="sky">
        <CardHeader icon={FirstAidKit} title="Recommended verification tests" description="Tests to run once the patient arrives at the hospital, to confirm or rule out the suspected condition." />
        <CardBody>
          <div id="combinedDiagnosisTests">
            <VerificationTestList tests={dx.verification_tests ?? []} tone={tone} />
          </div>
        </CardBody>
      </Card>

      {/* Hospital preparation */}
      <Card tint="emerald">
        <CardHeader icon={Hospital} title="Hospital preparation" description="What the receiving hospital should have ready when the ambulance arrives." />
        <CardBody>
          <div id="combinedDiagnosisPreparation">
            <HospitalPreparationCards items={dx.hospital_preparation} />
          </div>
        </CardBody>
      </Card>
    </>
  )
}

/** The three analysis charts, computed once from the initial page data (as in the original page). */
function AnalysisCharts({ data }: { data: AnalysisPayload }) {
  const scores = useMemo(
    () =>
      computeAnalysisScores({
        indicatorCount: data.ai.indicators.length,
        riskLevel: data.ai.risk_level,
        confidence: data.ai.confidence,
        bleedingRisk: data.camera.bleeding_risk || 'Pending',
        movementRisk: data.camera.movement_risk || 'Pending',
        postureRisk: data.camera.posture_risk || 'Pending',
        heartRate: data.sensors.heart_rate,
        spo2: data.sensors.spo2,
        temp: data.sensors.temp,
        respRate: data.sensors.resp_rate,
        bloodPressure: data.sensors.blood_pressure,
      }),
    [data],
  )

  const contribution = [
    { label: 'Physiology instability', value: Math.max(5, scores.physiologySeverity), swatch: 'bg-[var(--series-1)]' },
    { label: 'AI critical indicators', value: Math.max(5, scores.aiSignalScore), swatch: 'bg-[var(--series-2)]' },
    { label: 'Camera severity', value: Math.max(5, scores.cameraSeverityAvg), swatch: 'bg-[var(--series-3)]' },
  ]

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <Card tint="rose">
          <CardHeader title="Emergency signal contribution" description="Severity of each signal source, out of 100." />
          <CardBody>
            <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,12rem)_1fr]">
              <div className="relative mx-auto aspect-square w-full max-w-[12rem]">
                <ChartCanvas
                  id="riskIndicatorChart"
                  label="Emergency signal contribution doughnut chart"
                  deps={[scores]}
                  createConfig={t => ({
                    type: 'doughnut',
                    data: {
                      labels: contribution.map(item => item.label),
                      datasets: [{ data: contribution.map(item => item.value), backgroundColor: t.series.slice(0, 3), spacing: 2 }],
                    },
                    options: {
                      cutout: '68%',
                      animation: { duration: 1000 },
                      interaction: { mode: 'nearest', intersect: true },
                      plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: (context: TooltipItem<'doughnut'>) => ` ${context.label}: ${context.raw}/100 severity` } },
                      },
                    },
                  })}
                />
              </div>
              <ul className="flex flex-col gap-3">
                {contribution.map(item => (
                  <li key={item.label} className="flex items-center gap-3 text-sm">
                    <span aria-hidden className={cn('size-2.5 shrink-0 rounded-full', item.swatch)} />
                    <span className="min-w-0 flex-1 text-ink-2">{item.label}</span>
                    <span className="tabular font-semibold text-ink">{item.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardBody>
        </Card>

        <Card delay={0.05} tint="amber">
          <CardHeader title="Immediate intervention priorities" description="Priority score per intervention area, out of 100." />
          <CardBody>
            <div className="relative h-64 sm:h-72">
              <ChartCanvas
                id="confidenceComparisonChart"
                label="Immediate intervention priorities bar chart"
                deps={[scores]}
                createConfig={t => ({
                  type: 'bar',
                  data: {
                    labels: ['Airway support', 'Circulation control', 'Neuro / trauma eval', 'Medication readiness'],
                    datasets: [
                      {
                        label: 'Priority score',
                        data: [scores.airwayPriority, scores.circulationPriority, scores.neuroTraumaPriority, scores.medicationPriority],
                        backgroundColor: t.tint,
                        maxBarThickness: 24,
                        borderRadius: 4,
                        borderSkipped: 'start',
                      },
                    ],
                  },
                  options: {
                    animation: { duration: 1100 },
                    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context: TooltipItem<'bar'>) => ` Priority: ${context.raw}/100` } } },
                    scales: axes(t, { yMin: 0, yMax: 100, beginAtZero: true }),
                  },
                })}
              />
            </div>
          </CardBody>
        </Card>
      </div>

      <Card tint="indigo">
        <CardHeader title="Emergency trajectory" description="Composite emergency and airway distress scores over the last 20 minutes." />
        <CardBody>
          <div className="relative h-64 sm:h-80">
            <ChartCanvas
              id="riskTrendWaveChart"
              label="Emergency trajectory line chart over the last 20 minutes"
              deps={[scores]}
              createConfig={t => {
                const baseSeries = [12, 8, 5, 3, 0].map(offset => clampScore(scores.overallEmergencyScore + offset))
                const airwaySeries = [9, 6, 4, 2, 0].map(offset => clampScore(scores.airwayPriority + offset))
                const line = (label: string, data: number[], color: string) => ({
                  label,
                  data,
                  borderColor: color,
                  backgroundColor: withAlpha(color, 0.1),
                  fill: true,
                  tension: 0.4,
                  pointRadius: 4,
                  pointBackgroundColor: color,
                  pointBorderColor: t.surface,
                  pointBorderWidth: 2,
                })
                return {
                  type: 'line',
                  data: {
                    labels: ['T-20 min', 'T-15 min', 'T-10 min', 'T-5 min', 'Now'],
                    datasets: [line('Composite emergency score', baseSeries, t.series[0]), line('Airway distress score', airwaySeries, t.series[1])],
                  },
                  options: {
                    plugins: { legend: { position: 'top', align: 'start' } },
                    scales: axes(t, { yMin: 0, yMax: 100, beginAtZero: true }),
                  },
                }
              }}
            />
          </div>
        </CardBody>
      </Card>
    </>
  )
}
