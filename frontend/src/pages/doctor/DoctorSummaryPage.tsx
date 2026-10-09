import { useState } from 'react'
import type { DoctorSummaryPayload, LiveSensorKey, LiveVitalsResponse } from '../../api/types'
import { BulletRows } from '../../components/BulletRows'
import { HospitalPreparationCards } from '../../components/diagnosis/HospitalPreparationCards'
import { LiveClinicalSummaryCard } from '../../components/live/LiveClinicalSummary'
import { LiveText } from '../../components/live/LiveText'
import { PageState } from '../../components/PageState'
import { useAnonymousMode } from '../../hooks/useAnonymousMode'
import { useApi } from '../../hooks/useApi'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useLiveVitals } from '../../hooks/useLiveVitals'
import { doctorCameraColor, doctorOverallColor, safeDxColor } from '../../utils/riskStyles'

const VITALS: { key: LiveSensorKey; className: string; label: string }[] = [
  { key: 'heart_rate', className: 'text-danger', label: 'Heart Rate (BPM)' },
  { key: 'spo2', className: 'text-primary', label: 'SpO₂ (%)' },
  { key: 'blood_pressure', className: 'text-danger', label: 'Blood Pressure' },
  { key: 'temp', className: 'text-success', label: 'Temperature (°F)' },
  { key: 'resp_rate', className: 'text-info', label: 'Respiration Rate' },
  { key: 'ecg_status', className: 'text-purple ecg-metric-text', label: 'ECG Status' },
]

function formatReportTime(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

export function DoctorSummaryPage() {
  useDocumentTitle("Doctor's Pre-Arrival Summary - AI Ambulance System")
  const [anonymous] = useAnonymousMode()
  const page = useApi<DoctorSummaryPayload>('/doctor-summary', anonymous)
  const live = useLiveVitals(anonymous)

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h4 className="mb-0">
            <i className="bi bi-stethoscope"></i> Doctor's Pre-Arrival Summary - Final Report
          </h4>
        </div>
      </div>

      {/* Print Button */}
      <div className="row g-3 mb-4">
        <div className="col-12">
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            <i className="bi bi-printer-fill"></i> Print Report
          </button>
        </div>
      </div>

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
  const liveDx = live.data?.diagnosis

  return (
    <>
      {/* Patient Information Panel */}
      <div className="row g-3 mb-4">
        <div className="col-12">
          <div className="card border-info">
            <div className="card-header bg-info text-white">
              <i className="bi bi-person-vcard-fill"></i> Patient Information
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-3">
                  <strong>Patient ID:</strong>
                  <p>{patient ? patient.id : 'N/A'}</p>
                </div>
                <div className="col-md-3">
                  <strong>Name:</strong>
                  <p>{patient ? patient.name : 'N/A'}</p>
                </div>
                <div className="col-md-3">
                  <strong>Age:</strong>
                  <p>{patient ? patient.age : 'N/A'} years</p>
                </div>
                <div className="col-md-3">
                  <strong>Report Time:</strong>
                  <p id="reportTime">{reportTime}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vital Metrics Panel */}
      <div className="row g-3 mb-4">
        <div className="col-12">
          <div className="card border-warning">
            <div className="card-header bg-warning text-dark">
              <i className="bi bi-heart-pulse-fill"></i> Current Vital Metrics
            </div>
            <div className="card-body">
              <div className="row text-center doctor-vitals-row">
                {VITALS.map(vital => (
                  <div className="col-xl-2 col-lg-4 col-md-4 col-sm-6" key={vital.key}>
                    <div className="metric-box h-100">
                      <LiveText as="h5" className={vital.className} value={sensors[vital.key]} />
                      <small>{vital.label}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Assessment Panel */}
      <div className="row g-3 mb-4">
        <div className="col-12">
          <div className="card border-danger">
            <div className="card-header bg-danger text-white">
              <i className="bi bi-exclamation-triangle-fill"></i> Visual Analysis &amp; Risk Assessment
            </div>
            <div className="card-body">
              <div className="row mb-3">
                {[
                  { title: 'Bleeding Assessment', value: camera.bleeding_risk, color: doctorCameraColor(camera.bleeding_risk) },
                  { title: 'Movement Analysis', value: camera.movement_risk, color: doctorCameraColor(camera.movement_risk) },
                  { title: 'Posture Assessment', value: camera.posture_risk, color: doctorCameraColor(camera.posture_risk) },
                  { title: 'Overall Risk', value: camera.overall_risk, color: doctorOverallColor(camera.overall_risk) },
                ].map(item => (
                  <div className="col-md-3" key={item.title}>
                    <div className="risk-card">
                      <h6>{item.title}</h6>
                      <span className={`badge bg-${item.color} p-2 badge-lg`}>{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>

              <hr />
              <h6 className="mb-3">Camera AI Analysis:</h6>
              <div className="analysis-text">
                <BulletRows items={camera.summary} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Clinical Analysis & Recommendations */}
      <div className="row g-3 mb-4">
        <div className="col-12">
          <div className="card border-success">
            <div className="card-header bg-success text-white">
              <i className="bi bi-brain-fill"></i> AI Clinical Analysis &amp; Recommendations
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <h6 className="text-info mb-3">
                    <i className="bi bi-lightbulb-fill"></i> External Summary
                  </h6>
                  <div className="analysis-box" id="liveExternalSummary">
                    {ai.external_summary?.length ? <BulletRows items={ai.external_summary} /> : <p className="text-muted mb-0">External summary is being generated...</p>}
                  </div>
                </div>
                <div className="col-md-6 mb-3">
                  <h6 className="text-primary mb-3">
                    <i className="bi bi-cpu-fill"></i> Internal Summary
                  </h6>
                  <div className="analysis-box" id="liveInternalSummary">
                    {ai.internal_summary?.length ? <BulletRows items={ai.internal_summary} /> : <p className="text-muted mb-0">Internal summary is being generated...</p>}
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-12 mb-3">
                  <h6 className="text-success mb-3">
                    <i className="bi bi-check-circle-fill"></i> Recommended Actions
                  </h6>
                  <div className="analysis-box" id="liveRecommendations">
                    {ai.recommendations?.length ? <BulletRows items={ai.recommendations} /> : <p className="text-muted mb-0">No specific recommendations at this time.</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <LiveClinicalSummaryCard
        title="Live Clinical Summary & SBAR Handoff"
        live={live.data}
        error={live.error}
        lastUpdated={live.lastUpdated}
        showSbar
      />

      {/* Final Diagnosis & Conclusion */}
      <div className="row g-3 mb-4">
        <div className="col-12">
          <div className="card border-dark">
            <div className="card-header bg-dark text-white">
              <i className="bi bi-file-text-fill"></i> Final Summary &amp; Conclusion
            </div>
            <div className="card-body">
              <h6 className="mb-3">Current Patient State:</h6>
              <div className="conclusion-box">
                <p>
                  Based on comprehensive vital metric analysis and AI-powered computer vision assessment, the patient presents with{' '}
                  <strong>{camera ? camera.overall_risk : 'Pending'} Risk</strong> classification.
                </p>
                <p>
                  <strong>Key Findings:</strong>
                </p>
                <KeyFindings data={data} live={live.data} />
              </div>

              {initialDx ? (
                <>
                  {/* Probable Condition (condition / severity / description / colour refresh live, as before) */}
                  <div className={`alert alert-${safeDxColor((liveDx ?? initialDx).severity_color)} mt-4`} role="alert">
                    <h6 className="alert-heading fw-bold mb-1">
                      <i className="bi bi-search-heart"></i> Probable Condition: <LiveText value={(liveDx ?? initialDx).condition} />{' '}
                      <LiveText className={`badge bg-${safeDxColor((liveDx ?? initialDx).severity_color)} ms-2`} value={(liveDx ?? initialDx).severity} />
                    </h6>
                    <LiveText as="p" className="mb-2" value={(liveDx ?? initialDx).description} />
                    <hr />
                    <strong>Probable Causes:</strong>
                    <div className="mb-0 mt-1">
                      {(initialDx.probable_causes ?? []).map(cause => (
                        <div key={cause}>{cause}</div>
                      ))}
                    </div>
                  </div>

                  {/* Verification Tests */}
                  <h6 className="mt-4 mb-3">
                    <i className="bi bi-clipboard2-check-fill text-primary"></i> Recommended Verification Tests at Hospital:
                  </h6>
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>#</th>
                          <th>Test / Examination</th>
                          <th>Purpose</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(initialDx.verification_tests ?? []).map((test, index) => (
                          <tr key={`${index}-${test.test}`}>
                            <td>
                              <span className={`badge bg-${safeDxColor(initialDx.severity_color)}`}>{index + 1}</span>
                            </td>
                            <td className="fw-semibold">{test.test}</td>
                            <td>{test.purpose}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Hospital Preparation */}
                  <h6 className="mt-4 mb-3">
                    <i className="bi bi-hospital-fill text-dark"></i> Hospital Preparation Checklist:
                  </h6>
                  <HospitalPreparationCards items={initialDx.hospital_preparation} compact />
                </>
              ) : (
                <>
                  <h6 className="mt-4 mb-3">Required Hospital Actions:</h6>
                  <div className="action-box bg-light p-3 border-left-danger">
                    <ul>
                      <li>Prepare emergency department with appropriate medical team</li>
                      <li>Alert relevant specialist departments based on risk assessment</li>
                      <li>Ensure ICU availability if high-risk classification</li>
                      <li>Prepare diagnostic equipment (ECG, imaging, laboratory)</li>
                      <li>Have emergency medications and resuscitation equipment ready</li>
                    </ul>
                  </div>
                </>
              )}

              <div className="alert alert-info mt-4" role="alert">
                <i className="bi bi-info-circle-fill"></i> <strong>Report Generated:</strong> This is an AI-assisted pre-arrival summary. Final clinical decisions
                must be made by qualified medical professionals upon patient arrival at the hospital.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/** Key Findings list (live version from static/live_summary.js updateKeyFindings()). */
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

  return (
    <ul id="liveKeyFindings">
      <li>
        Cardiac status: {raw.heart_rate} BPM ({hr >= 60 && hr <= 100 ? 'Normal range' : 'Abnormal'})
      </li>
      <li>
        Oxygenation: {raw.spo2}% SpO₂ ({spo2 >= 95 ? 'Adequate' : 'Requiring intervention'})
      </li>
      <li>Blood Pressure: {raw.blood_pressure} mmHg</li>
      <li>Temperature: {raw.temp}°F</li>
      <li>Visual Assessment: {visual || 'Not available'}</li>
    </ul>
  )
}
