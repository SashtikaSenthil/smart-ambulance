import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { Link } from 'react-router'
import type { TooltipItem } from 'chart.js'
import type { CameraReport, CameraRuntimeStatus, DashboardPayload, EcgData, LiveSensorKey } from '../../api/types'
import { ChartCanvas, type AnyChart } from '../../components/charts/ChartCanvas'
import { LiveClinicalSummaryCard } from '../../components/live/LiveClinicalSummary'
import { LiveText } from '../../components/live/LiveText'
import { PageState } from '../../components/PageState'
import { useAnonymousMode } from '../../hooks/useAnonymousMode'
import { useApi } from '../../hooks/useApi'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { useInterval } from '../../hooks/useInterval'
import { useLiveVitals } from '../../hooks/useLiveVitals'
import { usePolling } from '../../hooks/usePolling'
import { riskBadgeClass, safeDxColor } from '../../utils/riskStyles'
import { createSparklineConfig, refreshSparklineData, type SparklineKey } from './sparklineConfigs'

const STAT_CARDS: { key: LiveSensorKey; color: string; icon: string; label: string; sub: string }[] = [
  { key: 'heart_rate', color: 'green', icon: 'bi-heart-pulse', label: 'Heart Rate (BPM)', sub: 'Real-time monitoring' },
  { key: 'spo2', color: 'blue', icon: 'bi-droplet-fill', label: 'Oxygen Saturation', sub: 'SpO₂ level tracking' },
  { key: 'blood_pressure', color: 'orange', icon: 'bi-activity', label: 'Blood Pressure', sub: 'Systolic/Diastolic' },
  { key: 'temp', color: 'red', icon: 'bi-thermometer-half', label: 'Temperature (°F)', sub: 'Body temperature' },
  { key: 'resp_rate', color: 'purple', icon: 'bi-lungs', label: 'Respiration', sub: 'Breathing rate' },
  { key: 'ecg_status', color: 'teal', icon: 'bi-heart-pulse-fill', label: 'ECG Status', sub: 'Cardiac rhythm' },
]

const VITAL_CARDS: { chart: SparklineKey; title: string; ariaLabel: string; valueClass: string; key: LiveSensorKey }[] = [
  { chart: 'hr', title: 'Heart Rate (HR)', ariaLabel: 'Expand Heart Rate chart', valueClass: 'hr-value', key: 'heart_rate' },
  { chart: 'spo2', title: 'Oxygen Saturation (SpO₂)', ariaLabel: 'Expand Oxygen Saturation chart', valueClass: 'spo2-value', key: 'spo2' },
  { chart: 'bp', title: 'Blood Pressure (BP)', ariaLabel: 'Expand Blood Pressure chart', valueClass: 'bp-value', key: 'blood_pressure' },
  { chart: 'rr', title: 'Respiration Rate (RR)', ariaLabel: 'Expand Respiration Rate chart', valueClass: 'rr-value', key: 'resp_rate' },
  { chart: 'temp', title: 'Temperature', ariaLabel: 'Expand Temperature chart', valueClass: 'temp-value', key: 'temp' },
  { chart: 'ecg', title: 'ECG Status', ariaLabel: 'Expand ECG chart', valueClass: 'ecg-value', key: 'ecg_status' },
]

const RISK_SCORE: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1, PENDING: 0 }

/** In-place Chart.js data update (the chart instance is owned by Chart.js, not React state). */
function updateChartData(chart: AnyChart, labels: unknown[], series: number[]) {
  chart.data.labels = labels
  chart.data.datasets[0].data = series
  chart.update('none')
}

function riskScore(value: unknown): number {
  return RISK_SCORE[String(value ?? 'Pending').trim().toUpperCase()] ?? 0
}

export function DashboardPage() {
  useDocumentTitle('AI Ambulance Dashboard - Medical Admin')
  const [anonymous, setAnonymous] = useAnonymousMode()
  const page = useApi<DashboardPayload>('/dashboard', anonymous)
  const live = useLiveVitals(anonymous)

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h4 className="mb-0">Dashboard Control panel</h4>
        </div>
        <div className="form-check form-switch m-0">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            id="anonymousIntakeToggle"
            checked={anonymous}
            onChange={event => setAnonymous(event.target.checked)}
          />
          <label className="form-check-label" htmlFor="anonymousIntakeToggle">
            Anonymous Intake
          </label>
        </div>
      </div>

      {page.data ? (
        <DashboardContent data={page.data} live={live} anonymous={anonymous} />
      ) : (
        <PageState loading={page.loading} error={page.error} onRetry={page.reload} />
      )}
    </>
  )
}

function DashboardContent({ data, live, anonymous }: { data: DashboardPayload; live: ReturnType<typeof useLiveVitals>; anonymous: boolean }) {
  const { patient, anonymous_mode: anonymousMode } = data
  const sensors = live.data?.sensors ?? data.sensors
  const dx = live.data?.diagnosis ?? data.camera.diagnosis
  const analysisLink = `/analysis${anonymous ? '?anonymous=1' : ''}`

  return (
    <>
      <div className="row g-3 mb-4">
        <div className="col-12">
          <div className="card border-secondary">
            <div className="card-header bg-light d-flex align-items-center justify-content-between">
              <span>
                <i className="bi bi-person-vcard"></i> Emergency Intake
              </span>
              {anonymousMode && <span className="badge bg-danger">History Unavailable</span>}
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-4">
                  <strong>Name:</strong> {patient.name}
                </div>
                <div className="col-md-4">
                  <strong>ID:</strong> {patient.id}
                </div>
                <div className="col-md-4">
                  <strong>Age:</strong> {patient.age}
                </div>
              </div>
              <div id="historySections" className={`row mt-2 ${anonymousMode ? 'd-none' : ''}`}>
                <div className="col-md-6">
                  <strong>Past Conditions:</strong> {patient.past_conditions}
                </div>
                <div className="col-md-6">
                  <strong>Allergies:</strong> {patient.allergies}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row g-3 mb-4 top-metrics" role="list">
        {STAT_CARDS.map(card => (
          <div className="col metric-col" role="listitem" key={card.key}>
            <div className={`stat-card stat-card-${card.color}`}>
              <div className="stat-icon">
                <i className={`bi ${card.icon}`}></i>
              </div>
              <div className="stat-content">
                <LiveText as="h3" value={sensors[card.key]} />
                <p>{card.label}</p>
                <small>{card.sub}</small>
              </div>
            </div>
          </div>
        ))}
      </div>

      <TelemetrySection sensors={sensors} />

      <LiveClinicalSummaryCard title="Live Clinical Summary" live={live.data} error={live.error} lastUpdated={live.lastUpdated} />

      <CameraSection initialCamera={data.camera} />

      {/* Diagnostic Intelligence – Compact Banner */}
      {dx && (
        <div className="row g-3 mb-4">
          <div className="col-12">
            <div className={`card border-${safeDxColor(dx.severity_color)}`}>
              <div className={`card-header bg-${safeDxColor(dx.severity_color)} bg-opacity-10 d-flex justify-content-between align-items-center`}>
                <span className={`fw-bold text-${safeDxColor(dx.severity_color)}`}>
                  <i className="bi bi-search-heart"></i> Probable Condition: <LiveText value={dx.condition} />
                </span>
                <LiveText className={`badge bg-${safeDxColor(dx.severity_color)} px-3 py-2`} value={dx.severity} />
              </div>
              <div className="card-body py-2">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                  <div>
                    {anonymousMode && <p className="mb-1 small text-danger fw-semibold">History Unavailable: Diagnosis based on real-time physiological stress</p>}
                    <LiveText as="p" className="mb-1 small" value={`${String(dx.description ?? '').slice(0, 180)}...`} />
                    <span className="text-muted small">
                      <i className="bi bi-clipboard2-check"></i> {dx.verification_tests?.length ?? 0} verification tests &bull; {dx.hospital_preparation?.length ?? 0} prep
                      categories recommended
                    </span>
                  </div>
                  <Link id="openAiAnalysisLink" to={analysisLink} className={`btn btn-sm btn-${safeDxColor(dx.severity_color)}`}>
                    <i className="bi bi-arrow-right-circle"></i> Full Diagnosis &amp; Prep
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-12">
          <div className="card border-info">
            <div className="card-body d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <h6 className="mb-1">Detailed Patient &amp; AI analysis moved</h6>
                <p className="mb-0 text-muted">Open the AI Analysis page for PHR, prediction engine, camera summary, charts, and animations.</p>
              </div>
              <Link id="analysisPageLink" to={analysisLink} className="btn btn-info text-white">
                <i className="bi bi-activity"></i> Open AI Analysis
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ----------------------------
// Telemetry: Live Vital Signs
// ----------------------------
function TelemetrySection({ sensors }: { sensors: DashboardPayload['sensors'] }) {
  const [expanded, setExpanded] = useState<SparklineKey | null>(null)
  const charts = useRef<Partial<Record<SparklineKey, { current: AnyChart | null }>>>({})
  const chartRefFor = (key: SparklineKey) => (charts.current[key] ??= { current: null })

  // Collapse expanded cards when clicking outside any vital card (same as the original document click handler).
  useEffect(() => {
    const onDocumentClick = (event: globalThis.MouseEvent) => {
      if (!(event.target as Element | null)?.closest?.('.vital-card')) setExpanded(null)
    }
    document.addEventListener('click', onDocumentClick)
    return () => document.removeEventListener('click', onDocumentClick)
  }, [])

  // Resize after expand/collapse (the original resized after its CSS height change).
  useEffect(() => {
    const id = window.setTimeout(() => Object.values(charts.current).forEach(ref => ref?.current?.resize()), 250)
    return () => window.clearTimeout(id)
  }, [expanded])

  // Auto-refresh the simulated traces every 2 seconds (updateCharts()).
  useInterval(() => {
    ;(['hr', 'spo2', 'bp', 'rr', 'temp'] as const).forEach(key => {
      const chart = charts.current[key]?.current
      if (!chart) return
      try {
        refreshSparklineData(key).forEach((series, index) => {
          if (chart.data.datasets[index]) chart.data.datasets[index].data = series
        })
        chart.update('none')
      } catch (error) {
        console.warn(`Failed to update ${key} chart:`, error)
      }
    })
  }, 2000)

  // ECG trace from the external feed via /api/ecg-data (refreshECGChart()).
  const ecg = usePolling<EcgData>('/ecg-data', 2000)
  const ecgSeries = Array.isArray(ecg.data?.series) ? ecg.data.series : []
  const latestEcg = ecgSeries.length > 0 ? Number(ecgSeries[ecgSeries.length - 1]) : NaN
  const ecgNumeric = Number.isFinite(latestEcg) ? `ECG: ${latestEcg.toFixed(2)}` : '--'
  useEffect(() => {
    const chart = charts.current.ecg?.current
    const ecgData = ecg.data
    if (!chart || !ecgData || !Array.isArray(ecgData.series) || ecgData.series.length === 0) return
    const labels =
      Array.isArray(ecgData.labels) && ecgData.labels.length === ecgData.series.length ? [...ecgData.labels] : ecgData.series.map((_, idx) => idx)
    updateChartData(chart, labels, [...ecgData.series])
  }, [ecg.data])

  const toggleCard = (key: SparklineKey, event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setExpanded(current => (current === key ? null : key))
  }

  return (
    <section className="telemetry-section mb-4">
      <div className="telemetry-header">
        <h5 className="mb-0">Telemetry: Live Vital Signs</h5>
      </div>
      <div className="row g-3">
        {VITAL_CARDS.map(card => {
          const isExpanded = expanded === card.chart
          return (
            <div className="col-lg-4" key={card.chart}>
              <div className={`chart-card vital-card${isExpanded ? ' expanded' : ''}`} data-chart={card.chart}>
                <div className="chart-card-header">
                  <h6 className="mb-0">{card.title}</h6>
                  <button type="button" className="expand-btn" aria-label={card.ariaLabel} aria-expanded={isExpanded} onClick={event => toggleCard(card.chart, event)}>
                    <i className={isExpanded ? 'bi bi-x-lg' : 'bi bi-arrows-angle-expand'}></i>
                  </button>
                </div>
                <LiveText as="div" className={`current-value ${card.valueClass}`} value={sensors[card.key]} />
                {card.chart === 'ecg' && (
                  <div className="current-value ecg-value" id="ecgNumericValue">
                    {ecgNumeric}
                  </div>
                )}
                <div className="mini-chart-container" style={{ height: isExpanded ? '280px' : '100px' }}>
                  <ChartCanvas
                    id={`${card.chart}Sparkline`}
                    width={400}
                    height={100}
                    chartRef={chartRefFor(card.chart)}
                    createConfig={() => createSparklineConfig(card.chart)}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ----------------------------
// Live camera feed + Camera AI summary
// ----------------------------
function CameraSection({ initialCamera }: { initialCamera: CameraReport }) {
  const status = usePolling<CameraRuntimeStatus>('/camera-analysis-status', 2000)
  const summary = usePolling<CameraReport>('/camera-analysis', 2000)
  const camera = summary.data ?? initialCamera
  const riskChart = useRef<AnyChart | null>(null)

  const chartData = useCallback(
    (report: CameraReport) => [riskScore(report.bleeding_risk), riskScore(report.movement_risk), riskScore(report.posture_risk)],
    [],
  )

  useEffect(() => {
    const chart = riskChart.current
    if (!chart) return
    chart.data.datasets[0].data = chartData(camera)
    chart.update('none')
  }, [camera, chartData])

  const statusData = status.data
  const countdown =
    statusData == null
      ? { className: 'badge bg-warning text-dark', text: 'Analyzing patient... 60s' }
      : statusData.phase === 'completed'
        ? { className: 'badge bg-success', text: 'Analysis completed' }
        : { className: 'badge bg-warning text-dark', text: `Analyzing patient... ${Number(statusData.remaining_seconds ?? 0)}s` }

  const liveLabel = (title: string, value: string | undefined) => {
    if (statusData == null) return { className: 'badge bg-secondary', text: `${title}: Pending` }
    const v = value || 'Pending'
    return { className: `badge ${riskBadgeClass(v)}`, text: `${title}: ${v}` }
  }
  const bleeding = liveLabel('Bleeding', statusData?.bleeding_risk)
  const movement = liveLabel('Movement', statusData?.movement_risk)
  const posture = liveLabel('Posture', statusData?.posture_risk)

  const indicators: { risk: string; title: string; value: string }[] = [
    { risk: 'bleeding', title: 'Bleeding Assessment:', value: camera.bleeding_risk || 'Pending' },
    { risk: 'movement', title: 'Movement Analysis:', value: camera.movement_risk || 'Pending' },
    { risk: 'posture', title: 'Posture Assessment:', value: camera.posture_risk || 'Pending' },
  ]

  return (
    <>
      {/* Live Camera Feed */}
      <div className="row g-3 mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-info text-white">
              <i className="bi bi-camera-video"></i> Live Camera Feed
            </div>
            <div className="card-body">
              <div className="camera-live-frame">
                <img id="dashboardCameraFeed" className="camera-live-video" src="/api/camera-feed" alt="Live camera stream" />
              </div>
              <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
                <span id="cameraCountdownLabel" className={countdown.className}>
                  {countdown.text}
                </span>
                <span id="cameraBleedingLabel" className={bleeding.className}>
                  {bleeding.text}
                </span>
                <span id="cameraMovementLabel" className={movement.className}>
                  {movement.text}
                </span>
                <span id="cameraPostureLabel" className={posture.className}>
                  {posture.text}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Camera AI Summary (Visual Analysis) */}
      <div className="row g-3 mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-info text-white">
              <i className="bi bi-camera-video-fill"></i> Camera AI Summary (Visual Analysis)
            </div>
            <div className="card-body">
              {/* Risk Indicators Row */}
              <div className="row">
                {indicators.map(indicator => (
                  <div className="col-md-3" key={indicator.risk}>
                    <div className="camera-indicator" data-risk={indicator.risk} data-value={indicator.value}>
                      <strong>{indicator.title}</strong> <span className={`badge ${riskBadgeClass(indicator.value)}`}>{indicator.value}</span>
                    </div>
                  </div>
                ))}
                <div className="col-md-3">
                  <div className="camera-indicator" data-risk="overall" data-value={camera.overall_risk || 'Pending'}>
                    <strong>Overall Risk:</strong>{' '}
                    <span className={`badge ${riskBadgeClass(camera.overall_risk || 'Pending')} mb-3`}>{camera.overall_risk || 'Pending'}</span>
                  </div>
                </div>
              </div>

              {/* Overall Risk Donut Chart (Full Width) */}
              <div className="row mt-4">
                <div className="col-12">
                  <div className="chart-container-centered">
                    <h6 className="text-center mb-3">Risk Distribution</h6>
                    <div className="chart-container">
                      <ChartCanvas
                        id="overallRiskChart"
                        chartRef={riskChart}
                        createConfig={() => ({
                          type: 'doughnut',
                          data: {
                            labels: ['Bleeding Risk', 'Movement Risk', 'Posture Risk'],
                            datasets: [
                              {
                                data: chartData(camera),
                                backgroundColor: ['#dc3545', '#ffc107', '#fd7e14'],
                                borderColor: 'rgba(255, 255, 255, 0.2)',
                                borderWidth: 2,
                              },
                            ],
                          },
                          options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15, font: { size: 12 } } },
                              tooltip: {
                                callbacks: {
                                  label: (context: TooltipItem<'doughnut'>) => {
                                    const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0)
                                    if (total === 0) return `${context.label}: awaiting analysis`
                                    const percentage = (((context.parsed as number) / total) * 100).toFixed(1)
                                    return `${context.label}: ${percentage}%`
                                  },
                                },
                              },
                            },
                          },
                        })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
