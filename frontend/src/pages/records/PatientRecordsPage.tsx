import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import type { RecordsPayload } from '../../api/types'
import { ChartCanvas, type AnyChart } from '../../components/charts/ChartCanvas'
import { PageState } from '../../components/PageState'
import { useApi } from '../../hooks/useApi'
import { useBodyClass } from '../../hooks/useBodyClass'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { statusBadgeClass } from '../../utils/riskStyles'

// Chart data below is the same static demo data the original page used.
const chartColors = {
  primary: '#1f7a8c',
  success: '#35b57b',
  warning: '#f2ad59',
  danger: '#e5727f',
  info: '#2fa5c1',
  light: '#f5f7fb',
}

type TrendFilter = 'week' | 'month' | 'yearly'

const trendDataSets: Record<TrendFilter, { labels: string[]; data: number[] }> = {
  week: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], data: [88, 91, 87, 93, 90, 94, 92] },
  month: { labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], data: [82, 86, 89, 91] },
  yearly: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    data: [72, 75, 78, 82, 80, 85, 88, 86, 90, 92, 91, 94],
  },
}

const FILTERS: { key: TrendFilter; label: string }[] = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This month' },
  { key: 'yearly', label: 'Yearly' },
]

export function PatientRecordsPage() {
  useDocumentTitle('Patient Records - AI Ambulance System')
  useBodyClass('patient-records')
  const page = useApi<RecordsPayload>('/records')

  return (
    <>
      <div className="page-header">
        <div>
          <h4 className="mb-0">Patient Records &amp; Analytics</h4>
        </div>
      </div>
      {page.data ? <RecordsContent data={page.data} /> : <PageState loading={page.loading} error={page.error} onRetry={page.reload} />}
    </>
  )
}

function RecordsContent({ data }: { data: RecordsPayload }) {
  const [filter, setFilter] = useState<TrendFilter>('week')
  const trendChart = useRef<AnyChart | null>(null)

  // Filter buttons update the existing trend chart in place (updateSuccessTrendChart()).
  useEffect(() => {
    const chart = trendChart.current
    if (!chart) return
    const dataset = trendDataSets[filter] ?? trendDataSets.yearly
    chart.data.labels = dataset.labels
    chart.data.datasets[0].data = dataset.data
    chart.update('active')
  }, [filter])

  const metrics = [
    { color: 'blue', icon: 'bi-people-fill', value: `${data.total_patients}`, label: 'Total Patients', sub: 'Historical records' },
    { color: 'green', icon: 'bi-check-circle-fill', value: `${data.prediction_success}%`, label: 'Prediction Success Rate', sub: 'AI accuracy' },
    { color: 'orange', icon: 'bi-graph-up', value: `${data.avg_accuracy}%`, label: 'Average Accuracy', sub: 'Diagnosis precision' },
    { color: 'red', icon: 'bi-clock-history', value: data.avg_response_time, label: 'Avg Response Time', sub: 'Minutes' },
  ]

  return (
    <>
      {/* Metrics */}
      <div className="row g-3 mb-4 top-metrics" role="list">
        {metrics.map(metric => (
          <div className="col-3 metric-col" role="listitem" key={metric.label}>
            <div className={`stat-card stat-card-${metric.color}`}>
              <div className="stat-icon">
                <i className={`bi ${metric.icon}`}></i>
              </div>
              <div className="stat-content">
                <h3>{metric.value}</h3>
                <p>{metric.label}</p>
                <small>{metric.sub}</small>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="row g-3 mb-4">
        <div className="col-lg-6">
          <div className="chart-card">
            <div className="chart-card-header-with-filters">
              <h6 className="mb-0">Prediction Success Trend</h6>
              <div className="chart-filters">
                {FILTERS.map(item => (
                  <button
                    type="button"
                    key={item.key}
                    className={`filter-btn${filter === item.key ? ' active' : ''}`}
                    data-filter={item.key}
                    onClick={() => setFilter(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="chart-container">
              <ChartCanvas
                id="successTrendChart"
                height={280}
                chartRef={trendChart}
                createConfig={ctx => {
                  const dataset = trendDataSets[filter] ?? trendDataSets.yearly
                  const gradient = ctx.createLinearGradient(0, 0, 0, 200)
                  gradient.addColorStop(0, 'rgba(31, 122, 140, 0.3)')
                  gradient.addColorStop(1, 'rgba(31, 122, 140, 0.02)')
                  return {
                    type: 'line',
                    data: {
                      labels: dataset.labels,
                      datasets: [
                        {
                          label: 'Success Rate (%)',
                          data: dataset.data,
                          borderColor: chartColors.primary,
                          backgroundColor: gradient,
                          tension: 0.5,
                          fill: true,
                          pointRadius: 5,
                          pointBackgroundColor: chartColors.primary,
                          pointBorderColor: '#fff',
                          pointBorderWidth: 2,
                          borderWidth: 3,
                        },
                      ],
                    },
                    options: {
                      responsive: true,
                      maintainAspectRatio: false,
                      animation: { duration: 600, easing: 'easeInOutQuart' },
                      plugins: { legend: { display: false } },
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 100,
                          ticks: { color: 'rgba(116, 131, 148, 0.7)' },
                          grid: { color: 'rgba(220, 231, 241, 0.5)' },
                          border: { display: false },
                        },
                        x: {
                          ticks: { color: 'rgba(116, 131, 148, 0.7)' },
                          grid: { display: false },
                          border: { display: false },
                        },
                      },
                    },
                  }
                }}
              />
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="chart-card">
            <div className="chart-card-header">
              <h6 className="mb-0">Accuracy Distribution</h6>
            </div>
            <div className="chart-container">
              <ChartCanvas
                id="accuracyDistributionChart"
                height={280}
                createConfig={() => ({
                  type: 'bar',
                  data: {
                    labels: ['60-70%', '70-80%', '80-90%', '90-95%', '95-100%'],
                    datasets: [
                      {
                        label: 'Number of Patients',
                        data: [5, 12, 28, 35, 20],
                        backgroundColor: [
                          'rgba(229, 114, 127, 0.8)',
                          'rgba(242, 173, 89, 0.8)',
                          'rgba(47, 165, 193, 0.8)',
                          'rgba(53, 181, 123, 0.8)',
                          'rgba(31, 122, 140, 0.8)',
                        ],
                        borderRadius: 6,
                      },
                    ],
                  },
                  options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
                })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="row g-3 mb-4">
        <div className="col-lg-6">
          <div className="chart-card">
            <div className="chart-card-header">
              <h6 className="mb-0">Condition Detection Rate</h6>
            </div>
            <div className="chart-container">
              <ChartCanvas
                id="conditionDetectionChart"
                height={250}
                createConfig={() => ({
                  type: 'doughnut',
                  data: {
                    labels: ['Cardiac Arrest', 'Stroke', 'Trauma', 'Respiratory', 'Other'],
                    datasets: [
                      {
                        data: [25, 20, 18, 22, 15],
                        backgroundColor: [chartColors.danger, chartColors.warning, chartColors.info, chartColors.success, chartColors.primary],
                        borderColor: '#fff',
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
        <div className="col-lg-6">
          <div className="chart-card">
            <div className="chart-card-header">
              <h6 className="mb-0">Response Time Distribution</h6>
            </div>
            <div className="chart-container">
              <ChartCanvas
                id="responseTimeChart"
                height={250}
                createConfig={() => ({
                  type: 'bar',
                  data: {
                    labels: ['0-5 min', '5-10 min', '10-15 min', '15-20 min', '20+ min'],
                    datasets: [{ label: 'Frequency', data: [45, 32, 15, 6, 2], backgroundColor: chartColors.info, borderRadius: 6 }],
                  },
                  options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
                })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Records table */}
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">
          <i className="bi bi-table"></i> Historical Patient Records
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead className="table-light">
                <tr>
                  <th>Patient ID</th>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Condition Detected</th>
                  <th>Prediction Accuracy</th>
                  <th>Response Time (min)</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.patient_records.map(record => (
                  <tr key={record.patient_id}>
                    <td>
                      <code>{record.patient_id}</code>
                    </td>
                    <td>{record.name}</td>
                    <td>{record.date}</td>
                    <td>
                      <span className="badge bg-info">{record.condition}</span>
                    </td>
                    <td>
                      <div className="accuracy-progress">
                        <div
                          className="accuracy-bar"
                          role="progressbar"
                          aria-valuenow={record.accuracy}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          style={{ width: `${record.accuracy}%` }}
                        >
                          <span className="accuracy-text">{record.accuracy}%</span>
                        </div>
                      </div>
                    </td>
                    <td>{record.response_time}</td>
                    <td>
                      <span className={`badge ${statusBadgeClass(record.status)}`}>{record.status}</span>
                    </td>
                    <td>
                      <Link className="btn btn-sm btn-outline-primary" to={`/records/${encodeURIComponent(record.patient_id)}/history`}>
                        <i className="bi bi-box-arrow-up-right"></i> Open Full History
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
