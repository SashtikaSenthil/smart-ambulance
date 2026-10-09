import { useMemo } from 'react'
import type { TooltipItem } from 'chart.js'
import type { AnalysisPayload, Diagnosis } from '../../api/types'
import { BulletRows } from '../../components/BulletRows'
import { ChartCanvas } from '../../components/charts/ChartCanvas'
import { HospitalPreparationCards } from '../../components/diagnosis/HospitalPreparationCards'
import { LiveClinicalSummaryCard } from '../../components/live/LiveClinicalSummary'
import { LiveText } from '../../components/live/LiveText'
import { PageState } from '../../components/PageState'
import { useAnonymousMode } from '../../hooks/useAnonymousMode'
import { useApi } from '../../hooks/useApi'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useLiveVitals } from '../../hooks/useLiveVitals'
import { clampScore, computeAnalysisScores, cssToken } from '../../utils/analysisScores'
import { analysisCameraColor, safeDxColor } from '../../utils/riskStyles'

export function AnalysisPage() {
  useDocumentTitle('Patient Analysis - AI Ambulance System')
  const [anonymous] = useAnonymousMode()
  const page = useApi<AnalysisPayload>('/analysis', anonymous)
  const live = useLiveVitals(anonymous)

  return (
    <>
      <div className="page-header">
        <div>
          <h4 className="mb-0">Patient &amp; AI Analysis</h4>
        </div>
      </div>
      {page.data ? <AnalysisContent data={page.data} live={live} /> : <PageState loading={page.loading} error={page.error} onRetry={page.reload} />}
    </>
  )
}

function AnalysisContent({ data, live }: { data: AnalysisPayload; live: ReturnType<typeof useLiveVitals> }) {
  const { patient, anonymous_mode: anonymousMode, camera } = data
  const ai = live.data?.ai ?? data.ai
  const dx = live.data?.diagnosis ?? camera.diagnosis

  return (
    <>
      <div className="row g-3 mb-4">
        <div className="col-lg-6">
          <div className="card h-100 animate-in analysis-glass">
            <div className="card-header bg-primary text-white">
              <i className="bi bi-person-fill"></i> Patient Health Record (PHR)
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <p className="mb-2">
                    <strong>Name:</strong> {patient.name}
                  </p>
                  <p className="mb-2">
                    <strong>ID:</strong> {patient.id}
                  </p>
                  <p className="mb-2">
                    <strong>DOB:</strong> {patient.dob}
                  </p>
                  <p className="mb-2">
                    <strong>Age:</strong> {patient.age} years
                  </p>
                </div>
                <div className="col-md-6">
                  {anonymousMode ? (
                    <>
                      <p className="mb-2 text-danger fw-semibold">History Unavailable: Diagnosis based on real-time physiological stress.</p>
                      <p className="text-muted mb-0">Past conditions and allergy fields are hidden for Anonymous Intake mode.</p>
                    </>
                  ) : (
                    <>
                      <p className="mb-2">
                        <strong>Chronic Conditions:</strong>
                      </p>
                      <p className="text-muted">{patient.past_conditions}</p>
                      <p className="mb-2">
                        <strong>Critical Allergies:</strong>
                      </p>
                      <p className="text-danger fw-bold pulse-risk">{patient.allergies}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card h-100 border-danger animate-in delay-1 analysis-glass">
            <div className="card-header bg-danger text-white">
              <i className="bi bi-robot"></i> AI Prediction Engine
            </div>
            <div className="card-body">
              <h5 className="text-danger">
                <LiveText id="livePrimaryRisk" value={ai.primary_risk} />{' '}
                <LiveText className="badge bg-danger" id="liveRiskLevel" value={`${ai.risk_level} RISK`} />
              </h5>
              <p className="mb-2">
                <strong>AI Confidence Score:</strong> <LiveText id="aiConfidenceText" value={ai.confidence} />
              </p>
              <div className="mt-3">
                <strong>Flagged Indicators:</strong>
                <div className="mt-2" id="liveIndicators">
                  <BulletRows items={ai.indicators} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <LiveClinicalSummaryCard
        title="Live Vitals & Clinical Summary"
        live={live.data}
        error={live.error}
        lastUpdated={live.lastUpdated}
        showVitals
        cardClassName="animate-in delay-1 analysis-glass"
      />

      <div className="row g-3 mb-4">
        <div className="col-lg-6">
          <div className="card h-100 animate-in delay-2 analysis-glass">
            <div className="card-header bg-primary text-white">
              <i className="bi bi-cpu-fill"></i> Internal Summary
            </div>
            <div className="card-body" id="liveInternalSummary">
              {ai.internal_summary?.length ? <BulletRows items={ai.internal_summary} /> : <p className="text-muted mb-0">Internal summary is being generated...</p>}
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card h-100 animate-in delay-2 analysis-glass">
            <div className="card-header bg-info text-white">
              <i className="bi bi-clipboard2-pulse-fill"></i> External Summary
            </div>
            <div className="card-body" id="liveExternalSummary">
              {ai.external_summary?.length ? <BulletRows items={ai.external_summary} /> : <p className="text-muted mb-0">External summary is being generated...</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12">
          <div className="card animate-in delay-2 analysis-glass">
            <div className="card-header bg-info text-white">
              <i className="bi bi-camera-video-fill"></i> Camera AI Analysis
            </div>
            <div className="card-body">
              {/* Risk Level Badges */}
              <div className="d-flex flex-wrap gap-3 mb-3">
                <span className={`badge bg-${analysisCameraColor(camera.bleeding_risk)} px-3 py-2`}>
                  <i className="bi bi-droplet-fill"></i> Bleeding: {camera.bleeding_risk}
                </span>
                <span className={`badge bg-${analysisCameraColor(camera.movement_risk)} px-3 py-2`}>
                  <i className="bi bi-person-walking"></i> Movement: {camera.movement_risk}
                </span>
                <span className={`badge bg-${analysisCameraColor(camera.posture_risk)} px-3 py-2`}>
                  <i className="bi bi-person-fill"></i> Posture: {camera.posture_risk}
                </span>
              </div>

              {/* Observation Summary */}
              <div className="mb-3">
                <strong>Observation Summary:</strong>
                <div className="mt-2">
                  <BulletRows items={camera.summary} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {dx && <DiagnosisSections dx={dx} />}

      <AnalysisCharts data={data} />
    </>
  )
}

function DiagnosisSections({ dx }: { dx: Diagnosis }) {
  const color = safeDxColor(dx.severity_color)
  return (
    <>
      {/* DIAGNOSTIC INTELLIGENCE – Probable Condition */}
      <div className="row g-3 mb-4">
        <div className="col-12">
          <div id="combinedDiagnosisCard" className={`card animate-in delay-2 analysis-glass border-${color}`}>
            <div id="combinedDiagnosisHeader" className={`card-header bg-${color} text-white d-flex justify-content-between align-items-center`}>
              <span>
                <i className="bi bi-search-heart"></i> Probable Condition Identified
              </span>
              <span id="combinedDiagnosisSeverity" className="badge bg-light text-dark px-3 py-2">
                Severity: {dx.severity || 'Unknown'}
              </span>
            </div>
            <div className="card-body">
              <h5 id="combinedDiagnosisCondition" className={`text-${color} fw-bold mb-2`}>
                <i className="bi bi-exclamation-triangle-fill"></i>{' '}
                <span>{dx.condition || 'Unclassified Visual Pattern – Requires Clinical Correlation'}</span>
              </h5>
              <p id="combinedDiagnosisDescription" className="mb-3 diagnosis-description">
                {dx.description || 'No diagnosis description available.'}
              </p>

              <strong>Probable Causes:</strong>
              <div id="combinedDiagnosisCauses" className="mt-2 mb-3">
                {(dx.probable_causes ?? []).map(cause => (
                  <div className="bullet-row" key={cause}>
                    <i className={`bi bi-chevron-right text-${color}`}></i> {cause}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VERIFICATION TESTS – What to check at hospital */}
      <div className="row g-3 mb-4">
        <div className="col-12">
          <div className="card animate-in delay-2 analysis-glass">
            <div className="card-header bg-primary text-white">
              <i className="bi bi-clipboard2-check-fill"></i> Recommended Verification Tests
            </div>
            <div className="card-body">
              <p className="text-muted mb-3">
                The following tests are recommended once the patient arrives at the hospital to confirm or rule out the suspected condition.
              </p>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="verify-col-num">#</th>
                      <th className="verify-col-test">Test / Examination</th>
                      <th className="verify-col-purpose">Purpose</th>
                    </tr>
                  </thead>
                  <tbody id="combinedDiagnosisTests">
                    {(dx.verification_tests ?? []).map((test, idx) => (
                      <tr key={`${idx}-${test.test}`}>
                        <td>
                          <span className={`badge bg-${color}`}>{idx + 1}</span>
                        </td>
                        <td className="fw-semibold">{test.test}</td>
                        <td>{test.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HOSPITAL PREPARATION – What to ready before arrival */}
      <div className="row g-3 mb-4">
        <div className="col-12">
          <div className="card animate-in delay-2 analysis-glass">
            <div className="card-header bg-dark text-white">
              <i className="bi bi-hospital-fill"></i> Hospital Preparation Recommendations
            </div>
            <div className="card-body">
              <p className="text-muted mb-3">
                Based on the AI camera analysis, the following preparations are recommended so the hospital is ready when the ambulance arrives.
              </p>
              <HospitalPreparationCards id="combinedDiagnosisPreparation" items={dx.hospital_preparation} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/** The three analysis charts - computed once from the initial page data, exactly like the original page. */
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

  const tokens = () => ({
    primary: cssToken('--primary', '#1f7a8c'),
    danger: cssToken('--danger', '#e5727f'),
    warning: cssToken('--warning', '#f2ad59'),
    success: cssToken('--success', '#35b57b'),
  })

  return (
    <>
      <div className="row g-3 mb-4">
        <div className="col-lg-6">
          <div className="chart-card animate-in delay-1 analysis-glass">
            <div className="chart-card-header">
              <h6 className="mb-0">Emergency Signal Contribution</h6>
            </div>
            <div className="chart-container">
              <ChartCanvas
                id="riskIndicatorChart"
                height={260}
                deps={[scores]}
                createConfig={() => {
                  const t = tokens()
                  return {
                    type: 'doughnut',
                    data: {
                      labels: ['Physiology Instability', 'AI Critical Indicators', 'Camera Severity'],
                      datasets: [
                        {
                          data: [Math.max(5, scores.physiologySeverity), Math.max(5, scores.aiSignalScore), Math.max(5, scores.cameraSeverityAvg)],
                          backgroundColor: [t.danger, t.primary, t.warning],
                          borderWidth: 0,
                        },
                      ],
                    },
                    options: {
                      responsive: true,
                      maintainAspectRatio: false,
                      animation: { duration: 1200 },
                      plugins: {
                        legend: { position: 'bottom' },
                        tooltip: { callbacks: { label: (context: TooltipItem<'doughnut'>) => `${context.label}: ${context.raw}/100 severity` } },
                      },
                    },
                  }
                }}
              />
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="chart-card animate-in delay-2 analysis-glass">
            <div className="chart-card-header">
              <h6 className="mb-0">Immediate Intervention Priorities</h6>
            </div>
            <div className="chart-container">
              <ChartCanvas
                id="confidenceComparisonChart"
                height={260}
                deps={[scores]}
                createConfig={() => {
                  const t = tokens()
                  return {
                    type: 'bar',
                    data: {
                      labels: ['Airway Support', 'Circulation Control', 'Neuro/Trauma Eval', 'Medication Readiness'],
                      datasets: [
                        {
                          label: 'Priority Score',
                          data: [scores.airwayPriority, scores.circulationPriority, scores.neuroTraumaPriority, scores.medicationPriority],
                          backgroundColor: [t.warning, t.danger, t.primary, t.success],
                          borderRadius: 8,
                        },
                      ],
                    },
                    options: {
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: { y: { beginAtZero: true, max: 100 } },
                      animation: { duration: 1400 },
                      plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: (context: TooltipItem<'bar'>) => `Priority: ${context.raw}/100` } },
                      },
                    },
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12">
          <div className="chart-card animate-in delay-2 analysis-glass">
            <div className="chart-card-header">
              <h6 className="mb-0">Emergency Trajectory (Last 20 Minutes)</h6>
            </div>
            <div className="chart-container">
              <ChartCanvas
                id="riskTrendWaveChart"
                height={250}
                deps={[scores]}
                createConfig={ctx => {
                  const t = tokens()
                  const overall = scores.overallEmergencyScore
                  const airway = scores.airwayPriority
                  const baseSeries = [12, 8, 5, 3, 0].map(offset => clampScore(overall + offset))
                  const airwaySeries = [9, 6, 4, 2, 0].map(offset => clampScore(airway + offset))

                  const gradientThisWeek = ctx.createLinearGradient(0, 0, 0, 260)
                  gradientThisWeek.addColorStop(0, 'rgba(15, 154, 189, 0.24)')
                  gradientThisWeek.addColorStop(1, 'rgba(15, 154, 189, 0.02)')

                  const gradientPreviousWeek = ctx.createLinearGradient(0, 0, 0, 260)
                  gradientPreviousWeek.addColorStop(0, 'rgba(229, 114, 127, 0.22)')
                  gradientPreviousWeek.addColorStop(1, 'rgba(229, 114, 127, 0.02)')

                  return {
                    type: 'line',
                    data: {
                      labels: ['T-20 min', 'T-15 min', 'T-10 min', 'T-5 min', 'Now'],
                      datasets: [
                        {
                          label: 'Composite Emergency Score',
                          data: baseSeries,
                          borderColor: t.primary,
                          backgroundColor: gradientThisWeek,
                          fill: true,
                          tension: 0.48,
                          borderWidth: 3,
                          pointRadius: 4,
                          pointHoverRadius: 6,
                        },
                        {
                          label: 'Airway Distress Score',
                          data: airwaySeries,
                          borderColor: t.danger,
                          backgroundColor: gradientPreviousWeek,
                          fill: true,
                          tension: 0.48,
                          borderWidth: 3,
                          pointRadius: 0,
                        },
                      ],
                    },
                    options: {
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'top' } },
                      scales: {
                        y: { beginAtZero: true, min: 0, max: 100, grid: { color: 'rgba(140, 160, 180, 0.12)' } },
                        x: { grid: { display: false } },
                      },
                    },
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
