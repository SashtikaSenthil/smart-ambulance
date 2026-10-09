import { Link, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import type { PatientHistory } from '../../api/types'
import { ChartCanvas } from '../../components/charts/ChartCanvas'
import { PageState } from '../../components/PageState'
import { useApi } from '../../hooks/useApi'
import { useBodyClass } from '../../hooks/useBodyClass'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { cssToken } from '../../utils/analysisScores'
import { eventBadgeClass, statusBadgeClass } from '../../utils/riskStyles'

export function PatientHistoryPage() {
  useDocumentTitle('Complete Patient History - AI Ambulance System')
  useBodyClass('patient-records')
  const { patientId = '' } = useParams()
  const page = useApi<PatientHistory>(`/records/${encodeURIComponent(patientId)}/history`)
  const notFound = page.error instanceof ApiError && page.error.status === 404

  if (notFound) {
    return (
      <>
        <div className="page-header">
          <div>
            <h4 className="mb-0">Complete Patient History</h4>
          </div>
          <Link className="btn btn-outline-primary" to="/records">
            <i className="bi bi-arrow-left"></i> Back to Records
          </Link>
        </div>
        <div className="alert alert-warning" role="alert">
          <i className="bi bi-exclamation-circle-fill"></i> No patient history found for <code>{patientId}</code>.
        </div>
      </>
    )
  }

  if (!page.data) {
    return <PageState loading={page.loading} error={page.error} onRetry={page.reload} />
  }

  return <HistoryContent history={page.data} />
}

function HistoryContent({ history }: { history: PatientHistory }) {
  const accuracy = Math.max(0, Math.min(100, Number(history.prediction_accuracy || 0)))
  const { labels, response_timeline: responseData, accuracy_timeline: accuracyData, condition_breakdown: breakdown } = history.chart_data

  return (
    <>
      <div className="page-header">
        <div>
          <h4 className="mb-0">Complete Patient History</h4>
          <small className="breadcrumb-text">
            <i className="bi bi-person-lines-fill"></i> {history.patient_id} · {history.name}
          </small>
        </div>
        <Link className="btn btn-outline-primary" to="/records">
          <i className="bi bi-arrow-left"></i> Back to Records
        </Link>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-lg-8">
          <div className="card h-100">
            <div className="card-header bg-primary text-white">
              <i className="bi bi-file-medical-fill"></i> Patient Summary
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <p className="mb-2">
                    <strong>Name:</strong> {history.name}
                  </p>
                  <p className="mb-2">
                    <strong>Patient ID:</strong> {history.patient_id}
                  </p>
                  <p className="mb-2">
                    <strong>Age:</strong> {history.patient_summary.age} years
                  </p>
                  <p className="mb-2">
                    <strong>Blood Group:</strong> {history.patient_summary.blood_group}
                  </p>
                </div>
                <div className="col-md-6">
                  <p className="mb-2">
                    <strong>Condition:</strong> {history.condition}
                  </p>
                  <p className="mb-2">
                    <strong>Status:</strong> <span className={`badge ${statusBadgeClass(history.status)}`}>{history.status}</span>
                  </p>
                  <p className="mb-2">
                    <strong>Doctor:</strong> {history.patient_summary.attending_doctor}
                  </p>
                  <p className="mb-2">
                    <strong>Ambulance Unit:</strong> {history.patient_summary.ambulance_unit}
                  </p>
                </div>
              </div>
              <p className="mb-0 mt-2">
                <strong>Clinical Detail:</strong> {history.patient_summary.diagnosis_detail}
              </p>
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card h-100">
            <div className="card-header bg-info text-white">
              <i className="bi bi-bar-chart-line-fill"></i> Case Metrics
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span>Prediction Accuracy</span>
                <strong>{history.prediction_accuracy}%</strong>
              </div>
              <div className="progress mb-3 history-progress">
                <div
                  className="progress-bar bg-success history-accuracy-bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={accuracy}
                  style={{ width: `${accuracy}%` }}
                ></div>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span>Response Time</span>
                <strong>{history.response_time} min</strong>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span>Emergency Contact</span>
                <strong>{history.patient_summary.emergency_contact}</strong>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span>Encounter Date</span>
                <strong>{history.date}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-lg-7">
          <div className="card h-100">
            <div className="card-header bg-primary text-white">
              <i className="bi bi-capsule-pill"></i> Medications
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Medication</th>
                      <th>Dosage</th>
                      <th>Frequency</th>
                      <th>Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.medications.map(med => (
                      <tr key={med.name}>
                        <td>{med.name}</td>
                        <td>{med.dosage}</td>
                        <td>{med.frequency}</td>
                        <td>{med.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-5">
          <div className="card h-100">
            <div className="card-header bg-secondary text-white">
              <i className="bi bi-list-check"></i> Treatment Flow
            </div>
            <div className="card-body">
              {history.event_log.map(item => (
                <div className="d-flex justify-content-between align-items-center border-bottom py-2" key={item.event}>
                  <span>{item.event}</span>
                  <span className={`badge ${eventBadgeClass(item.status)}`}>{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-lg-6">
          <div className="chart-card">
            <div className="chart-card-header">
              <h6 className="mb-0">Response Timeline</h6>
            </div>
            <div className="chart-container">
              <ChartCanvas
                id="responseTimelineChart"
                height={260}
                deps={[history.patient_id]}
                createConfig={() => ({
                  type: 'line',
                  data: {
                    labels,
                    datasets: [
                      {
                        label: 'Response Time (min)',
                        data: responseData,
                        borderColor: cssToken('--primary', '#0f9abd'),
                        backgroundColor: cssToken('--accent', '#2fa5c1'),
                        tension: 0.4,
                        fill: false,
                        borderWidth: 3,
                      },
                    ],
                  },
                  options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
                })}
              />
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="chart-card">
            <div className="chart-card-header">
              <h6 className="mb-0">Accuracy Timeline</h6>
            </div>
            <div className="chart-container">
              <ChartCanvas
                id="accuracyTimelineChart"
                height={260}
                deps={[history.patient_id]}
                createConfig={() => ({
                  type: 'bar',
                  data: {
                    labels,
                    datasets: [{ label: 'Accuracy (%)', data: accuracyData, backgroundColor: cssToken('--success', '#35b57b'), borderRadius: 6 }],
                  },
                  options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, max: 100 } },
                  },
                })}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header bg-info text-white">
              <i className="bi bi-heart-pulse-fill"></i> Vitals History
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-striped mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Time</th>
                      <th>Heart Rate</th>
                      <th>SpO2</th>
                      <th>Blood Pressure</th>
                      <th>Temperature</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.vitals.map(vital => (
                      <tr key={vital.time}>
                        <td>{vital.time}</td>
                        <td>{vital.heart_rate} BPM</td>
                        <td>{vital.spo2}%</td>
                        <td>{vital.blood_pressure}</td>
                        <td>{vital.temperature}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="chart-card h-100">
            <div className="chart-card-header">
              <h6 className="mb-0">Case Composition</h6>
            </div>
            <div className="chart-container">
              <ChartCanvas
                id="conditionBreakdownChart"
                height={260}
                deps={[history.patient_id]}
                createConfig={() => ({
                  type: 'doughnut',
                  data: {
                    labels: breakdown.labels,
                    datasets: [
                      {
                        data: breakdown.values,
                        backgroundColor: [cssToken('--danger', '#e5727f'), cssToken('--warning', '#f2ad59'), cssToken('--primary', '#0f9abd')],
                        borderWidth: 2,
                      },
                    ],
                  },
                  options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
                })}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
